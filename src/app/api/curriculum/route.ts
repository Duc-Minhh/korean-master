import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const textbooks = await prisma.textbook.findMany({
      orderBy: { createdAt: 'asc' },
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
            vocabularies: {
              take: 5,
              select: {
                id: true,
                korean: true,
                vietnamese: true,
              },
            },
          },
        },
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
          select: { chapters: true, lessons: true },
        },
      },
    });

    // Merge any lessons from chapters into lessons if not already present
    const formattedTextbooks = textbooks.map((tb) => {
      const directLessons = tb.lessons || [];
      const chapterLessons = tb.chapters?.flatMap((c) => c.lessons) || [];
      const allLessonsMap = new Map();
      directLessons.forEach((l) => allLessonsMap.set(l.id, l));
      chapterLessons.forEach((l) => {
        if (!allLessonsMap.has(l.id)) {
          allLessonsMap.set(l.id, l);
        }
      });
      return {
        ...tb,
        lessons: Array.from(allLessonsMap.values()),
      };
    });

    return NextResponse.json({ textbooks: formattedTextbooks });
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
      if (!textbookId && !chapterId) {
        return NextResponse.json({ error: 'Thiếu ID giáo trình' }, { status: 400 });
      }
      const ls = await prisma.lesson.create({
        data: {
          title: title.trim(),
          order: order || 1,
          textbookId: textbookId || null,
          ...(chapterId && { chapterId }),
        },
        include: {
          _count: {
            select: { vocabularies: true, grammars: true },
          },
        },
      });
      return NextResponse.json(ls, { status: 201 });
    }

    return NextResponse.json({ error: 'Loại đối tượng không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi tạo giáo trình / bài học:', error);
    return NextResponse.json({ error: 'Không thể tạo mới' }, { status: 500 });
  }
}
