import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const topicId = searchParams.get('topicId') || '';
    const lessonId = searchParams.get('lessonId') || '';
    const partOfSpeech = searchParams.get('partOfSpeech') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'date_desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { korean: { contains: search.trim() } },
        { vietnamese: { contains: search.trim() } },
        { hanja: { contains: search.trim() } },
        { exampleKorean: { contains: search.trim() } },
      ];
    }

    if (topicId && topicId !== 'all') {
      where.topicId = topicId;
    }

    if (lessonId && lessonId !== 'all') {
      where.lessonId = lessonId;
    }

    if (partOfSpeech && partOfSpeech !== 'all') {
      where.partOfSpeech = partOfSpeech;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'date_asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'korean_asc') orderBy = { korean: 'asc' };
    else if (sort === 'vietnamese_asc') orderBy = { vietnamese: 'asc' };

    const [items, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          topic: true,
          lesson: {
            include: { chapter: { include: { textbook: true } } },
          },
        },
      }),
      prisma.vocabulary.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách từ vựng:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy từ vựng' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      korean,
      hanja,
      vietnamese,
      partOfSpeech,
      exampleKorean,
      exampleVietnamese,
      notes,
      topicId,
      lessonId,
      status,
    } = body;

    if (!korean || !vietnamese) {
      return NextResponse.json(
        { error: 'Từ tiếng Hàn và Nghĩa tiếng Việt là bắt buộc' },
        { status: 400 }
      );
    }

    const newVocab = await prisma.vocabulary.create({
      data: {
        korean: korean.trim(),
        hanja: hanja?.trim() || null,
        vietnamese: vietnamese.trim(),
        partOfSpeech: partOfSpeech || 'Danh từ',
        exampleKorean: exampleKorean?.trim() || null,
        exampleVietnamese: exampleVietnamese?.trim() || null,
        notes: notes?.trim() || null,
        topicId: topicId || null,
        lessonId: lessonId || null,
        status: status || 'NOT_LEARNED',
      },
      include: {
        topic: true,
        lesson: true,
      },
    });

    // Update today's study log
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { wordsLearned: { increment: 1 } },
      create: { date: todayStr, wordsLearned: 1 },
    });

    return NextResponse.json(newVocab, { status: 201 });
  } catch (error) {
    console.error('Lỗi thêm từ vựng:', error);
    return NextResponse.json({ error: 'Không thể thêm từ vựng' }, { status: 500 });
  }
}
