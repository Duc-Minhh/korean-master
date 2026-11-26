import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildDuplicateConflictResponse, findGrammarDuplicates } from '@/lib/duplicate-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkDuplicate = searchParams.get('checkDuplicate');
    if (checkDuplicate !== null) {
      const meaning = searchParams.get('meaning') || undefined;
      const excludeId = searchParams.get('excludeId') || undefined;
      const duplicates = await findGrammarDuplicates(checkDuplicate, meaning, excludeId);
      return NextResponse.json({ duplicates });
    }

    const search = searchParams.get('search') || '';
    const topicId = searchParams.get('topicId') || '';
    const lessonId = searchParams.get('lessonId') || '';
    const status = searchParams.get('status') || '';
    const isFavorite = searchParams.get('isFavorite');

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { structure: { contains: search.trim() } },
        { meaning: { contains: search.trim() } },
        { usage: { contains: search.trim() } },
        { exampleKorean: { contains: search.trim() } },
      ];
    }

    if (topicId && topicId !== 'all') {
      where.topicId = topicId;
    }

    if (lessonId && lessonId !== 'all') {
      where.lessonId = lessonId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (isFavorite === 'true') {
      where.isFavorite = true;
    }

    const items = await prisma.grammar.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        topic: true,
        lesson: {
          include: { chapter: { include: { textbook: true } } },
        },
      },
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error('Lỗi lấy danh sách ngữ pháp:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu ngữ pháp' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      structure,
      meaning,
      usage,
      formation,
      exceptions,
      exampleKorean,
      exampleVietnamese,
      similarGrammar,
      notes,
      topicId,
      lessonId,
      status,
      allowDuplicate = false,
    } = body;

    if (!structure || !meaning || !usage || !formation || !exampleKorean || !exampleVietnamese) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ cấu trúc, ý nghĩa, cách dùng, công thức và ví dụ' },
        { status: 400 }
      );
    }

    const duplicates = await findGrammarDuplicates(structure, meaning);
    const conflict = buildDuplicateConflictResponse({
      duplicates,
      allowDuplicate: Boolean(allowDuplicate),
      entityLabel: 'Cấu trúc ngữ pháp',
      primaryValue: structure.trim(),
      secondaryValue: meaning.trim(),
      secondaryList: `ý nghĩa: ${duplicates.map((d) => `"${d.meaning}"`).join(', ')}`,
      overrideHint: 'Nếu đây là cách dùng khác hoàn toàn, bạn có thể xác nhận vẫn thêm.',
    });
    if (conflict) return conflict;

    const newGrammar = await prisma.grammar.create({
      data: {
        structure: structure.trim(),
        meaning: meaning.trim(),
        usage: usage.trim(),
        formation: formation.trim(),
        exceptions: exceptions?.trim() || null,
        exampleKorean: exampleKorean.trim(),
        exampleVietnamese: exampleVietnamese.trim(),
        similarGrammar: similarGrammar?.trim() || null,
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

    // Update study log
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { grammarLearned: { increment: 1 } },
      create: { date: todayStr, grammarLearned: 1 },
    });

    return NextResponse.json(newGrammar, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo ngữ pháp:', error);
    return NextResponse.json({ error: 'Không thể tạo ngữ pháp' }, { status: 500 });
  }
}
