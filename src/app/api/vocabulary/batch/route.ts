import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeScopeId, normalizeText } from '@/lib/duplicate-check';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, topicId, lessonId, skipDuplicateMode = 'korean' } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Danh sách từ vựng trống hoặc không hợp lệ' },
        { status: 400 }
      );
    }

    // Load existing vocabulary keys scoped by topicId for duplicate filtering
    const existingVocabs = await prisma.vocabulary.findMany({
      select: { korean: true, vietnamese: true, topicId: true },
    });

    const scopeKey = (tid: string | null) => tid || '__NONE__';
    const seenKoreanByTopic = new Set(
      existingVocabs.map((v) => `${scopeKey(v.topicId)}::${normalizeText(v.korean)}`)
    );
    const seenPairByTopic = new Set(
      existingVocabs.map(
        (v) =>
          `${scopeKey(v.topicId)}::${normalizeText(v.korean)}::${normalizeText(v.vietnamese)}`
      )
    );

    const createdItems = [];
    const skippedItems: { korean: string; vietnamese: string; reason: string }[] = [];

    for (const item of items) {
      if (!item.korean || !item.vietnamese) continue;

      const cleanKorean = String(item.korean).trim();
      const cleanVietnamese = String(item.vietnamese).trim();
      const targetTopicId = normalizeScopeId(item.topicId || topicId);
      const tKey = scopeKey(targetTopicId);
      const kKey = normalizeText(cleanKorean);
      const topicKoreanKey = `${tKey}::${kKey}`;
      const topicPairKey = `${tKey}::${kKey}::${normalizeText(cleanVietnamese)}`;

      if (seenPairByTopic.has(topicPairKey)) {
        skippedItems.push({
          korean: cleanKorean,
          vietnamese: cleanVietnamese,
          reason: 'Trùng từ và nghĩa trong chủ đề này',
        });
        continue;
      }

      if (skipDuplicateMode === 'korean' && seenKoreanByTopic.has(topicKoreanKey)) {
        skippedItems.push({
          korean: cleanKorean,
          vietnamese: cleanVietnamese,
          reason: 'Trùng từ tiếng Hàn trong chủ đề này',
        });
        continue;
      }

      const created = await prisma.vocabulary.create({
        data: {
          korean: cleanKorean,
          hanja: item.hanja ? String(item.hanja).trim() : null,
          vietnamese: cleanVietnamese,
          partOfSpeech: item.partOfSpeech || 'Danh từ',
          exampleKorean: item.exampleKorean ? String(item.exampleKorean).trim() : null,
          exampleVietnamese: item.exampleVietnamese ? String(item.exampleVietnamese).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
          topicId: targetTopicId,
          lessonId: item.lessonId || lessonId || null,
          status: item.status || 'NOT_LEARNED',
        },
      });
      createdItems.push(created);
      seenKoreanByTopic.add(topicKoreanKey);
      seenPairByTopic.add(topicPairKey);
    }

    // Update study log only when new entries were created
    if (createdItems.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      await prisma.studyLog.upsert({
        where: { date: todayStr },
        update: { wordsLearned: { increment: createdItems.length } },
        create: { date: todayStr, wordsLearned: createdItems.length },
      });
    }

    return NextResponse.json({
      success: true,
      count: createdItems.length,
      skippedCount: skippedItems.length,
      skippedItems,
      items: createdItems,
    });
  } catch (error) {
    console.error('Lỗi thêm từ vựng hàng loạt:', error);
    return NextResponse.json({ error: 'Không thể lưu danh sách từ vựng' }, { status: 500 });
  }
}
