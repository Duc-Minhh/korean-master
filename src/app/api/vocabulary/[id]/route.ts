import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildDuplicateConflictResponse, findVocabDuplicates } from '@/lib/duplicate-check';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vocab = await prisma.vocabulary.findUnique({
      where: { id: params.id },
      include: {
        topic: true,
        lesson: {
          include: { chapter: { include: { textbook: true } } },
        },
        reviewHistories: {
          orderBy: { reviewedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vocab) {
      return NextResponse.json({ error: 'Không tìm thấy từ vựng' }, { status: 404 });
    }

    return NextResponse.json(vocab);
  } catch (error) {
    console.error('Lỗi lấy chi tiết từ vựng:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (body.korean !== undefined) {
      const existing = await prisma.vocabulary.findUnique({
        where: { id: params.id },
        select: { korean: true, vietnamese: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Không tìm thấy từ vựng' }, { status: 404 });
      }
      const nextKorean = String(body.korean).trim();
      const nextVietnamese =
        body.vietnamese !== undefined ? String(body.vietnamese).trim() : existing.vietnamese;
      const allowDuplicate = Boolean(body.allowDuplicate);

      const duplicates = await findVocabDuplicates(nextKorean, nextVietnamese, params.id);
      const conflict = buildDuplicateConflictResponse({
        duplicates,
        allowDuplicate,
        entityLabel: 'Từ',
        primaryValue: nextKorean,
        secondaryValue: nextVietnamese,
        secondaryList: `nghĩa: ${duplicates.map((d) => `"${d.vietnamese}"`).join(', ')}`,
        overrideHint: 'Nếu đây là từ đồng âm khác nghĩa, hãy xác nhận vẫn lưu.',
      });
      if (conflict) return conflict;
    }

    const updated = await prisma.vocabulary.update({
      where: { id: params.id },
      data: {
        ...(body.korean !== undefined && { korean: body.korean.trim() }),
        ...(body.hanja !== undefined && { hanja: body.hanja?.trim() || null }),
        ...(body.vietnamese !== undefined && { vietnamese: body.vietnamese.trim() }),
        ...(body.partOfSpeech !== undefined && { partOfSpeech: body.partOfSpeech }),
        ...(body.exampleKorean !== undefined && { exampleKorean: body.exampleKorean?.trim() || null }),
        ...(body.exampleVietnamese !== undefined && { exampleVietnamese: body.exampleVietnamese?.trim() || null }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
        ...(body.isDifficult !== undefined && { isDifficult: body.isDifficult }),
        ...(body.topicId !== undefined && { topicId: body.topicId || null }),
        ...(body.lessonId !== undefined && { lessonId: body.lessonId || null }),
      },
      include: {
        topic: true,
        lesson: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Lỗi cập nhật từ vựng:', error);
    return NextResponse.json({ error: 'Không thể cập nhật từ vựng' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.vocabulary.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Đã xóa từ vựng thành công' });
  } catch (error) {
    console.error('Lỗi xóa từ vựng:', error);
    return NextResponse.json({ error: 'Không thể xóa từ vựng' }, { status: 500 });
  }
}
