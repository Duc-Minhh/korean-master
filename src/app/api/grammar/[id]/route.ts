import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
