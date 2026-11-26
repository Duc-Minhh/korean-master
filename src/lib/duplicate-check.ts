import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/** Collapse repeated whitespace and lowercase for reliable string comparison. */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Remove all whitespace and lowercase so spacing variants like "V + -려고" and "V+-려고" match. */
export function normalizeStructureKey(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

export interface VocabDuplicateMatch {
  id: string;
  korean: string;
  vietnamese: string;
  topicName?: string | null;
  exactMeaningMatch: boolean;
}

export interface GrammarDuplicateMatch {
  id: string;
  structure: string;
  meaning: string;
  lessonTitle?: string | null;
  exactMeaningMatch: boolean;
}

/**
 * Find existing vocabulary items matching the given Korean word (ignoring case and extra whitespace).
 */
export async function findVocabDuplicates(
  korean: string,
  vietnamese?: string,
  excludeId?: string
): Promise<VocabDuplicateMatch[]> {
  const targetKorean = normalizeText(korean);
  if (!targetKorean) return [];

  const firstToken = targetKorean.split(' ')[0];
  const candidates = await prisma.vocabulary.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      korean: { contains: firstToken, mode: 'insensitive' },
    },
    select: {
      id: true,
      korean: true,
      vietnamese: true,
      topic: { select: { name: true } },
    },
  });

  const targetMeaning = vietnamese ? normalizeText(vietnamese) : '';

  return candidates
    .filter((item) => normalizeText(item.korean) === targetKorean)
    .map((item) => ({
      id: item.id,
      korean: item.korean,
      vietnamese: item.vietnamese,
      topicName: item.topic?.name || null,
      exactMeaningMatch: Boolean(
        targetMeaning && normalizeText(item.vietnamese) === targetMeaning
      ),
    }));
}

/**
 * Find existing grammar items matching the given structure (ignoring case and whitespace).
 */
export async function findGrammarDuplicates(
  structure: string,
  meaning?: string,
  excludeId?: string
): Promise<GrammarDuplicateMatch[]> {
  const targetStructure = normalizeStructureKey(structure);
  if (!targetStructure) return [];

  const candidates = await prisma.grammar.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: {
      id: true,
      structure: true,
      meaning: true,
      lesson: { select: { title: true } },
    },
  });

  const targetMeaning = meaning ? normalizeText(meaning) : '';

  return candidates
    .filter((item) => normalizeStructureKey(item.structure) === targetStructure)
    .map((item) => ({
      id: item.id,
      structure: item.structure,
      meaning: item.meaning,
      lessonTitle: item.lesson?.title || null,
      exactMeaningMatch: Boolean(
        targetMeaning && normalizeText(item.meaning) === targetMeaning
      ),
    }));
}

/**
 * Shared 409 conflict response builder for both vocabulary and grammar create/update routes.
 */
export function buildDuplicateConflictResponse<
  T extends { exactMeaningMatch: boolean }
>({
  duplicates,
  allowDuplicate,
  entityLabel,
  primaryValue,
  secondaryValue,
  secondaryList,
  overrideHint,
}: {
  duplicates: T[];
  allowDuplicate: boolean;
  entityLabel: string;
  primaryValue: string;
  secondaryValue: string;
  secondaryList: string;
  overrideHint: string;
}): NextResponse | null {
  if (duplicates.length === 0) return null;

  if (duplicates.some((d) => d.exactMeaningMatch)) {
    return NextResponse.json(
      {
        error: `${entityLabel} "${primaryValue}" với ý nghĩa "${secondaryValue}" đã tồn tại trong kho dữ liệu.`,
        canOverride: false,
        duplicates,
      },
      { status: 409 }
    );
  }

  if (!allowDuplicate) {
    return NextResponse.json(
      {
        error: `${entityLabel} "${primaryValue}" đã tồn tại (${secondaryList}). ${overrideHint}`,
        canOverride: true,
        duplicates,
      },
      { status: 409 }
    );
  }

  return null;
}
