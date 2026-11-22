import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.userSetting.findUnique({
      where: { id: 'default-user' },
    });

    if (!settings) {
      settings = await prisma.userSetting.create({
        data: {
          id: 'default-user',
          name: 'Học viên chăm chỉ',
          targetWordsPerDay: 10,
          targetReviewPerDay: 15,
          theme: 'light',
          streakCount: 1,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Lỗi lấy cấu hình:', error);
    return NextResponse.json({ error: 'Không thể lấy cấu hình' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await prisma.userSetting.upsert({
      where: { id: 'default-user' },
      update: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.targetWordsPerDay !== undefined && { targetWordsPerDay: Number(body.targetWordsPerDay) }),
        ...(body.targetReviewPerDay !== undefined && { targetReviewPerDay: Number(body.targetReviewPerDay) }),
        ...(body.theme && { theme: body.theme }),
      },
      create: {
        id: 'default-user',
        name: body.name || 'Học viên chăm chỉ',
        targetWordsPerDay: Number(body.targetWordsPerDay) || 10,
        targetReviewPerDay: Number(body.targetReviewPerDay) || 15,
        theme: body.theme || 'light',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Lỗi cập nhật cấu hình:', error);
    return NextResponse.json({ error: 'Không thể cập nhật cấu hình' }, { status: 500 });
  }
}
