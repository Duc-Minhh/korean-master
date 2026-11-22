import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const histories = await prisma.quizHistory.findMany({
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    // Compute mistake statistics
    const mistakeMap: Record<string, { count: number; name: string; type: string }> = {};

    for (const h of histories) {
      if (!h.details) continue;
      try {
        const questions = JSON.parse(h.details);
        for (const q of questions) {
          if (!q.isCorrect && q.relatedVocabOrGrammar) {
            const key = q.relatedVocabOrGrammar;
            if (!mistakeMap[key]) {
              mistakeMap[key] = {
                count: 0,
                name: key,
                type: q.typeName || 'Kiểm tra',
              };
            }
            mistakeMap[key].count += 1;
          }
        }
      } catch (err) {
        // ignore parse error for legacy rows
      }
    }

    const frequentMistakes = Object.values(mistakeMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      histories,
      frequentMistakes,
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử kiểm tra:', error);
    return NextResponse.json({ error: 'Không thể lấy lịch sử kiểm tra' }, { status: 500 });
  }
}
