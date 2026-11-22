import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateSRS, SRSRating } from '@/lib/srs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'all'; // all, new, topic, lesson, difficult, random
    const topicId = searchParams.get('topicId');
    const lessonId = searchParams.get('lessonId');
    const difficultOnly = searchParams.get('difficultOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '300');

    const where: any = {};

    if (mode === 'new') {
      where.status = 'NOT_LEARNED';
    } else if (mode === 'difficult' || difficultOnly) {
      where.OR = [
        { isDifficult: true },
        { incorrectCount: { gt: 0 } },
      ];
    }

    if (topicId && topicId !== 'all') {
      where.topicId = topicId;
    }

    if (lessonId && lessonId !== 'all') {
      where.lessonId = lessonId;
    }

    let items = await prisma.vocabulary.findMany({
      where,
      take: mode === 'random' ? undefined : limit,
      include: {
        topic: true,
        lesson: {
          include: { chapter: { include: { textbook: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (mode === 'random') {
      // Shuffle array
      items = items.sort(() => Math.random() - 0.5).slice(0, limit);
    }

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu Flashcard:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu thẻ ghi nhớ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vocabularyId, rating, action, isFavorite } = body;

    if (!vocabularyId) {
      return NextResponse.json({ error: 'Thiếu vocabularyId' }, { status: 400 });
    }

    // Handle toggle favorite
    if (action === 'toggleFavorite') {
      const updated = await prisma.vocabulary.update({
        where: { id: vocabularyId },
        data: { isFavorite: Boolean(isFavorite) },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (!rating) {
      return NextResponse.json({ error: 'Thiếu rating' }, { status: 400 });
    }

    const vocab = await prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
    });

    if (!vocab) {
      return NextResponse.json({ error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }

    const srsResult = calculateSRS({
      srsStep: vocab.srsStep,
      srsEaseFactor: vocab.srsEaseFactor,
      srsInterval: vocab.srsInterval,
      rating: rating as SRSRating,
    });

    const isAgain = rating === 'AGAIN';
    const isHard = rating === 'HARD';

    const updated = await prisma.vocabulary.update({
      where: { id: vocabularyId },
      data: {
        srsStep: srsResult.nextStep,
        srsInterval: srsResult.nextInterval,
        srsEaseFactor: srsResult.nextEaseFactor,
        nextReviewDate: srsResult.nextReviewDate,
        lastReviewedAt: new Date(),
        reviewCount: { increment: 1 },
        incorrectCount: isAgain ? { increment: 1 } : undefined,
        isDifficult: isAgain || isHard ? true : vocab.isDifficult,
        status: srsResult.status,
      },
    });

    // Save review history
    await prisma.reviewHistory.create({
      data: {
        vocabularyId,
        rating,
        interval: srsResult.nextInterval,
      },
    });

    // Update study log
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { reviewsCompleted: { increment: 1 } },
      create: { date: todayStr, reviewsCompleted: 1 },
    });

    return NextResponse.json({ success: true, updated, srsResult });
  } catch (error) {
    console.error('Lỗi lưu kết quả flashcard:', error);
    return NextResponse.json({ error: 'Không thể lưu tiến trình' }, { status: 500 });
  }
}
