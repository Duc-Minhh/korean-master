import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const textbooks = await prisma.textbook.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                _count: {
                  select: {
                    vocabularies: true,
                    grammars: true,
                  },
                },
              },
            },
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: { chapters: true },
        },
      },
    });

    return NextResponse.json({ textbooks });
  } catch (error) {
    console.error('Lỗi lấy danh sách giáo trình:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu giáo trình' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, level, description, color, textbookId, chapterId, order } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Tiêu đề và loại đối tượng là bắt buộc' }, { status: 400 });
    }

    if (type === 'textbook') {
      const tb = await prisma.textbook.create({
        data: {
          title: title.trim(),
          level: level || 'Sơ cấp 1',
          description: description?.trim() || null,
          color: color || 'from-blue-600 to-indigo-700',
        },
      });
      return NextResponse.json(tb, { status: 201 });
    }

    if (type === 'chapter') {
      if (!textbookId) {
        return NextResponse.json({ error: 'Thiếu ID giáo trình' }, { status: 400 });
      }
      const ch = await prisma.chapter.create({
        data: {
          title: title.trim(),
          order: order || 1,
          textbookId,
        },
      });
      return NextResponse.json(ch, { status: 201 });
    }

    if (type === 'lesson') {
      if (!chapterId) {
        return NextResponse.json({ error: 'Thiếu ID chương' }, { status: 400 });
      }
      const ls = await prisma.lesson.create({
        data: {
          title: title.trim(),
          order: order || 1,
          chapterId,
        },
      });
      return NextResponse.json(ls, { status: 201 });
    }

    return NextResponse.json({ error: 'Loại đối tượng không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi tạo giáo trình / chương / bài:', error);
    return NextResponse.json({ error: 'Không thể tạo mới' }, { status: 500 });
  }
}
