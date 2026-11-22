import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Get or update UserSetting & Streak
    let userSetting = await prisma.userSetting.findUnique({
      where: { id: 'default-user' },
    });

    if (!userSetting) {
      userSetting = await prisma.userSetting.create({
        data: {
          id: 'default-user',
          name: 'Học viên chăm chỉ',
          targetWordsPerDay: 10,
          targetReviewPerDay: 15,
          streakCount: 1,
          lastActiveDate: todayStr,
        },
      });
    } else {
      // Streak calculation
      if (userSetting.lastActiveDate !== todayStr) {
        const lastDate = userSetting.lastActiveDate ? new Date(userSetting.lastActiveDate) : null;
        const today = new Date(todayStr);

        if (lastDate) {
          const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            // Consecutive day
            userSetting = await prisma.userSetting.update({
              where: { id: 'default-user' },
              data: {
                streakCount: { increment: 1 },
                lastActiveDate: todayStr,
              },
            });
          } else if (diffDays > 1) {
            // Broke streak
            userSetting = await prisma.userSetting.update({
              where: { id: 'default-user' },
              data: {
                streakCount: 1,
                lastActiveDate: todayStr,
              },
            });
          }
        } else {
          userSetting = await prisma.userSetting.update({
            where: { id: 'default-user' },
            data: {
              lastActiveDate: todayStr,
            },
          });
        }
      }
    }

    // 2. Count Vocab by status
    const [
      totalVocab,
      masteredVocab,
      learningVocab,
      notLearnedVocab,
      totalGrammar,
      masteredGrammar,
      learningGrammar,
      notLearnedGrammar,
    ] = await Promise.all([
      prisma.vocabulary.count(),
      prisma.vocabulary.count({ where: { status: 'MASTERED' } }),
      prisma.vocabulary.count({ where: { status: 'LEARNING' } }),
      prisma.vocabulary.count({ where: { status: 'NOT_LEARNED' } }),
      prisma.grammar.count(),
      prisma.grammar.count({ where: { status: 'MASTERED' } }),
      prisma.grammar.count({ where: { status: 'LEARNING' } }),
      prisma.grammar.count({ where: { status: 'NOT_LEARNED' } }),
    ]);

    // 3. Count due SRS reviews today
    const now = new Date();
    const dueReviewsToday = await prisma.vocabulary.count({
      where: {
        OR: [
          { nextReviewDate: { lte: now } },
          { status: 'LEARNING', nextReviewDate: null },
        ],
      },
    });

    // 4. Today Study Log
    const todayLog = await prisma.studyLog.findUnique({
      where: { date: todayStr },
    });

    // 5. Recent 7 days chart data
    const chartLogs = await prisma.studyLog.findMany({
      orderBy: { date: 'asc' },
      take: 7,
    });

    // 6. Recent Vocab & Grammar
    const recentVocab = await prisma.vocabulary.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { topic: true, lesson: true },
    });

    const recentGrammar = await prisma.grammar.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { topic: true, lesson: true },
    });

    return NextResponse.json({
      totalVocab,
      masteredVocab,
      learningVocab,
      notLearnedVocab,
      totalGrammar,
      masteredGrammar,
      learningGrammar,
      notLearnedGrammar,
      streakCount: userSetting.streakCount,
      dueReviewsToday,
      todayStudiedWords: todayLog?.wordsLearned || 0,
      todayStudiedGrammar: todayLog?.grammarLearned || 0,
      targetWordsPerDay: userSetting.targetWordsPerDay,
      targetReviewPerDay: userSetting.targetReviewPerDay,
      chartData: chartLogs,
      recentVocab,
      recentGrammar,
    });
  } catch (error) {
    console.error('Lỗi API Dashboard:', error);
    return NextResponse.json({ error: 'Không thể lấy dữ liệu Dashboard' }, { status: 500 });
  }
}
