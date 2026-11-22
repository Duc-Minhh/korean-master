import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({
        vocabularies: [],
        grammars: [],
        suggestions: [],
      });
    }

    const [vocabularies, grammars] = await Promise.all([
      prisma.vocabulary.findMany({
        where: {
          OR: [
            { korean: { contains: q } },
            { vietnamese: { contains: q } },
            { hanja: { contains: q } },
            { exampleKorean: { contains: q } },
          ],
        },
        include: { topic: true, lesson: true },
        take: 20,
      }),
      prisma.grammar.findMany({
        where: {
          OR: [
            { structure: { contains: q } },
            { meaning: { contains: q } },
            { usage: { contains: q } },
            { exampleKorean: { contains: q } },
          ],
        },
        include: { topic: true, lesson: true },
        take: 20,
      }),
    ]);

    // Build suggestions
    const suggestions = [
      ...vocabularies.map((v) => ({
        type: 'VOCABULARY',
        title: v.korean,
        subtitle: `${v.vietnamese} (${v.partOfSpeech})`,
        id: v.id,
      })),
      ...grammars.map((g) => ({
        type: 'GRAMMAR',
        title: g.structure,
        subtitle: g.meaning,
        id: g.id,
      })),
    ].slice(0, 8);

    return NextResponse.json({
      vocabularies,
      grammars,
      suggestions,
      total: vocabularies.length + grammars.length,
    });
  } catch (error) {
    console.error('Lỗi tra từ điển:', error);
    return NextResponse.json({ error: 'Không thể tra cứu từ điển' }, { status: 500 });
  }
}
