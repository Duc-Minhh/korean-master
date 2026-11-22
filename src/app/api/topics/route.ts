import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            vocabularies: true,
            grammars: true,
          },
        },
      },
    });
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Lỗi lấy topics:', error);
    return NextResponse.json({ error: 'Không thể lấy danh sách chủ đề' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên chủ đề là bắt buộc' }, { status: 400 });
    }

    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        icon: icon || 'BookOpen',
        description: description?.trim() || null,
        color: color || 'bg-blue-50 text-blue-700 border-blue-200',
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo chủ đề:', error);
    return NextResponse.json({ error: 'Không thể tạo chủ đề' }, { status: 500 });
  }
}
