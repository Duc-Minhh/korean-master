import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'Cần cung cấp ít nhất 2 ID để so sánh' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length < 2) {
      return NextResponse.json({ error: 'Cần ít nhất 2 ID ngữ pháp' }, { status: 400 });
    }

    const items = await prisma.grammar.findMany({
      where: { id: { in: ids } },
      include: { topic: true, lesson: true },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Lỗi so sánh ngữ pháp:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
