export type LearningStatus = 'NOT_LEARNED' | 'LEARNING' | 'MASTERED';

export type PartOfSpeech =
  | 'Danh từ'
  | 'Động từ'
  | 'Tính từ'
  | 'Trạng từ'
  | 'Đại từ'
  | 'Số từ'
  | 'Thán từ'
  | 'Liên từ'
  | 'Cụm từ'
  | 'Khác';

export interface UserSetting {
  id: string;
  name: string;
  targetWordsPerDay: number;
  targetReviewPerDay: number;
  theme: string;
  streakCount: number;
  lastActiveDate: string | null;
  geminiApiKey?: string | null;
}

export interface Topic {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  color: string;
  vocabularies?: { id: string; korean: string; vietnamese: string }[];
  _count?: {
    vocabularies: number;
    grammars: number;
  };
}

export interface Textbook {
  id: string;
  title: string;
  level: string;
  description?: string | null;
  color: string;
  chapters?: Chapter[];
  _count?: {
    chapters: number;
  };
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  textbookId: string;
  textbook?: Textbook;
  lessons?: Lesson[];
  _count?: {
    lessons: number;
  };
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  chapterId: string;
  chapter?: Chapter;
  vocabularies?: { id: string; korean: string; vietnamese: string }[];
  _count?: {
    vocabularies: number;
    grammars: number;
  };
}

export interface Vocabulary {
  id: string;
  korean: string;
  hanja?: string | null;
  vietnamese: string;
  partOfSpeech: string;
  exampleKorean?: string | null;
  exampleVietnamese?: string | null;
  notes?: string | null;
  status: LearningStatus;
  isFavorite: boolean;
  isDifficult: boolean;
  srsStep: number;
  srsEaseFactor: number;
  srsInterval: number;
  nextReviewDate?: string | Date | null;
  lastReviewedAt?: string | Date | null;
  reviewCount: number;
  incorrectCount: number;
  topicId?: string | null;
  topic?: Topic | null;
  lessonId?: string | null;
  lesson?: Lesson | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Grammar {
  id: string;
  structure: string;
  meaning: string;
  usage: string;
  formation: string;
  exceptions?: string | null;
  exampleKorean: string;
  exampleVietnamese: string;
  similarGrammar?: string | null;
  notes?: string | null;
  status: LearningStatus;
  isFavorite: boolean;
  topicId?: string | null;
  topic?: Topic | null;
  lessonId?: string | null;
  lesson?: Lesson | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface DashboardStats {
  totalVocab: number;
  totalGrammar: number;
  masteredVocab: number;
  learningVocab: number;
  notLearnedVocab: number;
  masteredGrammar: number;
  learningGrammar: number;
  notLearnedGrammar: number;
  streakCount: number;
  dueReviewsToday: number;
  todayStudiedWords: number;
  todayStudiedGrammar: number;
  targetWordsPerDay: number;
  targetReviewPerDay: number;
  chartData: {
    date: string;
    wordsLearned: number;
    grammarLearned: number;
    reviewsCompleted: number;
  }[];
  recentVocab: Vocabulary[];
  recentGrammar: Grammar[];
}

export interface QuizQuestion {
  id: string;
  type: number; // 1 to 8
  typeName: string;
  question: string;
  instruction: string;
  options?: string[]; // Multiple choice options
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation: string;
  relatedVocabOrGrammar?: string;
}

export interface QuizResult {
  id: string;
  quizType: string;
  title: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  details: QuizQuestion[];
  completedAt: string;
}
