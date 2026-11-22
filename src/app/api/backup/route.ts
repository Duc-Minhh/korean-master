import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Export entire DB as JSON
export async function GET() {
  try {
    const [
      userSettings,
      textbooks,
      chapters,
      lessons,
      topics,
      vocabularies,
      grammars,
      reviewHistories,
      quizHistories,
      studyLogs,
    ] = await Promise.all([
      prisma.userSetting.findMany(),
      prisma.textbook.findMany(),
      prisma.chapter.findMany(),
      prisma.lesson.findMany(),
      prisma.topic.findMany(),
      prisma.vocabulary.findMany(),
      prisma.grammar.findMany(),
      prisma.reviewHistory.findMany(),
      prisma.quizHistory.findMany(),
      prisma.studyLog.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        userSettings,
        textbooks,
        chapters,
        lessons,
        topics,
        vocabularies,
        grammars,
        reviewHistories,
        quizHistories,
        studyLogs,
      },
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="korean_master_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Lỗi xuất dữ liệu sao lưu:', error);
    return NextResponse.json({ error: 'Không thể sao lưu dữ liệu' }, { status: 500 });
  }
}

// Restore entire DB or Reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, backupData } = body;

    if (action === 'restore' && backupData?.data) {
      const { data } = backupData;

      // Clean existing data
      await prisma.reviewHistory.deleteMany();
      await prisma.quizHistory.deleteMany();
      await prisma.vocabulary.deleteMany();
      await prisma.grammar.deleteMany();
      await prisma.lesson.deleteMany();
      await prisma.chapter.deleteMany();
      await prisma.textbook.deleteMany();
      await prisma.topic.deleteMany();
      await prisma.studyLog.deleteMany();

      // Restore topics
      if (data.topics?.length) {
        for (const item of data.topics) {
          const { _count, ...rest } = item;
          await prisma.topic.create({ data: rest });
        }
      }

      // Restore textbooks
      if (data.textbooks?.length) {
        for (const item of data.textbooks) {
          const { _count, chapters, ...rest } = item;
          await prisma.textbook.create({ data: rest });
        }
      }

      // Restore chapters
      if (data.chapters?.length) {
        for (const item of data.chapters) {
          const { _count, lessons, textbook, ...rest } = item;
          await prisma.chapter.create({ data: rest });
        }
      }

      // Restore lessons
      if (data.lessons?.length) {
        for (const item of data.lessons) {
          const { _count, chapter, vocabularies, grammars, ...rest } = item;
          await prisma.lesson.create({ data: rest });
        }
      }

      // Restore vocabularies
      if (data.vocabularies?.length) {
        for (const item of data.vocabularies) {
          const { topic, lesson, reviewHistories, favorites, ...rest } = item;
          await prisma.vocabulary.create({
            data: {
              ...rest,
              createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
              updatedAt: rest.updatedAt ? new Date(rest.updatedAt) : new Date(),
              nextReviewDate: rest.nextReviewDate ? new Date(rest.nextReviewDate) : null,
              lastReviewedAt: rest.lastReviewedAt ? new Date(rest.lastReviewedAt) : null,
            },
          });
        }
      }

      // Restore grammars
      if (data.grammars?.length) {
        for (const item of data.grammars) {
          const { topic, lesson, favorites, ...rest } = item;
          await prisma.grammar.create({
            data: {
              ...rest,
              createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
              updatedAt: rest.updatedAt ? new Date(rest.updatedAt) : new Date(),
            },
          });
        }
      }

      return NextResponse.json({ success: true, message: 'Khôi phục dữ liệu thành công!' });
    }

    if (action === 'clean_all') {
      // Clear user content but keep topics
      await prisma.reviewHistory.deleteMany();
      await prisma.quizHistory.deleteMany();
      await prisma.vocabulary.deleteMany();
      await prisma.grammar.deleteMany();
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ từ vựng và ngữ pháp!' });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi khôi phục / thao tác sao lưu:', error);
    return NextResponse.json({ error: 'Không thể khôi phục dữ liệu' }, { status: 500 });
  }
}
