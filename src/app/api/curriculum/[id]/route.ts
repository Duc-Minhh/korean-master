import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'textbook', 'chapter', or 'lesson'
    const body = await request.json();

    if (type === 'textbook') {
      const updated = await prisma.textbook.update({
        where: { id: params.id },
        data: {
          ...(body.title && { title: body.title.trim() }),
          ...(body.level && { level: body.level }),
          ...(body.description !== undefined && { description: body.description?.trim() || null }),
          ...(body.color && { color: body.color }),
        },
      });
      return NextResponse.json(updated);
    }

    if (type === 'chapter') {
      const updated = await prisma.chapter.update({
        where: { id: params.id },
        data: {
          ...(body.title && { title: body.title.trim() }),
          ...(body.order !== undefined && { order: Number(body.order) }),
        },
      });
      return NextResponse.json(updated);
    }

    if (type === 'lesson') {
      const updated = await prisma.lesson.update({
        where: { id: params.id },
        data: {
          ...(body.title && { title: body.title.trim() }),
          ...(body.order !== undefined && { order: Number(body.order) }),
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi cập nhật curriculum:', error);
    return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'textbook') {
      await prisma.textbook.delete({ where: { id: params.id } });
    } else if (type === 'chapter') {
      await prisma.chapter.delete({ where: { id: params.id } });
    } else if (type === 'lesson') {
      await prisma.lesson.delete({ where: { id: params.id } });
    } else {
      return NextResponse.json({ error: 'Thiếu hoặc sai loại đối tượng' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa thành công' });
  } catch (error) {
    console.error('Lỗi xóa curriculum:', error);
    return NextResponse.json({ error: 'Không thể xóa' }, { status: 500 });
  }
}
