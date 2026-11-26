import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildDuplicateConflictResponse, findGrammarDuplicates } from '@/lib/duplicate-check';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.grammar.findUnique({
      where: { id: params.id },
      include: {
        topic: true,
        lesson: {
          include: { chapter: { include: { textbook: true } } },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy ngữ pháp' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Lỗi lấy chi tiết ngữ pháp:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (body.structure !== undefined) {
      const existing = await prisma.grammar.findUnique({
        where: { id: params.id },
        select: { structure: true, meaning: true, lessonId: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Không tìm thấy ngữ pháp' }, { status: 404 });
      }
      const nextStructure = String(body.structure).trim();
      const nextMeaning =
        body.meaning !== undefined ? String(body.meaning).trim() : existing.meaning;
      const nextLessonId =
        body.lessonId !== undefined ? body.lessonId || null : existing.lessonId;
      const allowDuplicate = Boolean(body.allowDuplicate);

      const duplicates = await findGrammarDuplicates(
        nextStructure,
        nextMeaning,
        nextLessonId,
        params.id
      );
      const conflict = buildDuplicateConflictResponse({
        duplicates,
        allowDuplicate,
        entityLabel: 'Cấu trúc ngữ pháp',
        scopeLabel: nextLessonId ? 'trong bài học này' : 'trong nhóm chưa chọn bài học',
        primaryValue: nextStructure,
        secondaryValue: nextMeaning,
        secondaryList: `ý nghĩa: ${duplicates.map((d) => `"${d.meaning}"`).join(', ')}`,
        overrideHint: 'Nếu là cách dùng khác, hãy xác nhận vẫn lưu.',
      });
      if (conflict) return conflict;
    }

    const updated = await prisma.grammar.update({
      where: { id: params.id },
      data: {
        ...(body.structure !== undefined && { structure: body.structure.trim() }),
        ...(body.meaning !== undefined && { meaning: body.meaning.trim() }),
        ...(body.usage !== undefined && { usage: body.usage.trim() }),
        ...(body.formation !== undefined && { formation: body.formation.trim() }),
        ...(body.exceptions !== undefined && { exceptions: body.exceptions?.trim() || null }),
        ...(body.exampleKorean !== undefined && { exampleKorean: body.exampleKorean.trim() }),
        ...(body.exampleVietnamese !== undefined && { exampleVietnamese: body.exampleVietnamese.trim() }),
        ...(body.similarGrammar !== undefined && { similarGrammar: body.similarGrammar?.trim() || null }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
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
    console.error('Lỗi cập nhật ngữ pháp:', error);
    return NextResponse.json({ error: 'Không thể cập nhật ngữ pháp' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.grammar.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Đã xóa ngữ pháp thành công' });
  } catch (error) {
    console.error('Lỗi xóa ngữ pháp:', error);
    return NextResponse.json({ error: 'Không thể xóa ngữ pháp' }, { status: 500 });
  }
}
