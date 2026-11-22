import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateSRS, SRSRating } from '@/lib/srs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    // Due items: nextReviewDate <= now OR status is LEARNING and nextReviewDate is null
    const dueItems = await prisma.vocabulary.findMany({
      where: {
        OR: [
          { nextReviewDate: { lte: now } },
          { status: 'LEARNING', nextReviewDate: null },
        ],
      },
      include: {
        topic: true,
        lesson: true,
        reviewHistories: {
          orderBy: { reviewedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { isDifficult: 'desc' },
        { nextReviewDate: 'asc' },
      ],
    });

    return NextResponse.json({
      items: dueItems,
      count: dueItems.length,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách ôn tập:', error);
    return NextResponse.json({ error: 'Không thể lấy danh sách ôn tập' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vocabularyId, rating } = body;

    if (!vocabularyId || !rating) {
      return NextResponse.json({ error: 'Thiếu vocabularyId hoặc rating' }, { status: 400 });
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
        isDifficult: isAgain || isHard ? true : (rating === 'EASY' ? false : vocab.isDifficult),
        status: srsResult.status,
      },
    });

    await prisma.reviewHistory.create({
      data: {
        vocabularyId,
        rating,
        interval: srsResult.nextInterval,
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { reviewsCompleted: { increment: 1 } },
      create: { date: todayStr, reviewsCompleted: 1 },
    });

    return NextResponse.json({ success: true, updated, srsResult });
  } catch (error) {
    console.error('Lỗi lưu ôn tập SRS:', error);
    return NextResponse.json({ error: 'Không thể lưu kết quả ôn tập' }, { status: 500 });
  }
}
