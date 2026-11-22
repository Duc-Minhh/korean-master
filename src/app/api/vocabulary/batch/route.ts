import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, topicId, lessonId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Danh sách từ vựng trống hoặc không hợp lệ' },
        { status: 400 }
      );
    }

    const createdItems = [];
    for (const item of items) {
      if (!item.korean || !item.vietnamese) continue;

      const created = await prisma.vocabulary.create({
        data: {
          korean: String(item.korean).trim(),
          hanja: item.hanja ? String(item.hanja).trim() : null,
          vietnamese: String(item.vietnamese).trim(),
          partOfSpeech: item.partOfSpeech || 'Danh từ',
          exampleKorean: item.exampleKorean ? String(item.exampleKorean).trim() : null,
          exampleVietnamese: item.exampleVietnamese ? String(item.exampleVietnamese).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
          topicId: item.topicId || topicId || null,
          lessonId: item.lessonId || lessonId || null,
          status: item.status || 'NOT_LEARNED',
        },
      });
      createdItems.push(created);
    }

    // Update study log
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { wordsLearned: { increment: createdItems.length } },
      create: { date: todayStr, wordsLearned: createdItems.length },
    });

    return NextResponse.json({
      success: true,
      count: createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    console.error('Lỗi thêm từ vựng hàng loạt:', error);
    return NextResponse.json({ error: 'Không thể lưu danh sách từ vựng' }, { status: 500 });
  }
}
