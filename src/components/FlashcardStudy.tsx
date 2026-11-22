'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Volume2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Star,
  RefreshCw,
  Sparkles,
  Trophy,
  BookOpen,
  GraduationCap,
  Shuffle,
  ArrowLeftRight,
  Search,
  Play,
  SlidersHorizontal,
  Flame,
  Check,
  ChevronRight,
  BookMarked,
  PlusCircle,
} from 'lucide-react';
import { Vocabulary, Topic, Lesson } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

export type DeckCategory = 'all' | 'topics' | 'lessons' | 'special';

export interface StudyDeck {
  id: string;
  type: 'topic' | 'lesson' | 'special';
  title: string;
  subtitle?: string;
  categoryLabel: string;
  categoryColor: string;
  count: number;
  sampleWords?: { korean: string; vietnamese: string }[];
  topicId?: string;
  lessonId?: string;
  specialMode?: 'all' | 'difficult' | 'new' | 'random';
  icon?: string;
}

interface FlashcardStudyProps {
  topics: Topic[];
  lessons: Lesson[];
}

export default function FlashcardStudy({ topics, lessons }: FlashcardStudyProps) {
  const { showToast } = useToast();

  // Active Deck: if null, show Quizlet-style Deck Library Lobby; if set, show active study room
  const [activeDeck, setActiveDeck] = useState<StudyDeck | null>(null);

  // Deck Library state
  const [categoryTab, setCategoryTab] = useState<DeckCategory>('topics');
  const [searchQuery, setSearchQuery] = useState('');

  // Study Room Options
  const [frontLanguage, setFrontLanguage] = useState<'korean' | 'vietnamese'>('korean');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isDifficultOnly, setIsDifficultOnly] = useState(false);

  // Session Card States
  const [cards, setCards] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // Session statistics
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
  });
  const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);

  // Build the complete list of Study Decks
  const allDecks = useMemo<StudyDeck[]>(() => {
    const list: StudyDeck[] = [];

    // 1. Special / Quick Decks
    list.push(
      {
        id: 'special-all',
        type: 'special',
        title: 'Tất cả từ vựng',
        subtitle: 'Ôn luyện toàn bộ kho từ vựng cá nhân của bạn',
        categoryLabel: 'Bộ thẻ chung',
        categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
        count: topics.reduce((acc, t) => acc + (t._count?.vocabularies || 0), 0),
        specialMode: 'all',
      },
      {
        id: 'special-difficult',
        type: 'special',
        title: 'Thẻ khó & Hay nhầm',
        subtitle: 'Các từ được đánh dấu khó hoặc bạn từng trả lời sai',
        categoryLabel: 'Cần củng cố',
        categoryColor: 'bg-rose-50 text-rose-700 border-rose-200',
        count: 0, // dynamic
        specialMode: 'difficult',
      },
      {
        id: 'special-new',
        type: 'special',
        title: 'Từ mới cần học',
        subtitle: 'Các từ ở trạng thái chưa học, chuẩn bị nạp kiến thức mới',
        categoryLabel: 'Từ mới',
        categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        count: 0,
        specialMode: 'new',
      },
      {
        id: 'special-random',
        type: 'special',
        title: '30 từ ngẫu nhiên',
        subtitle: 'Thử thách phản xạ nhanh với 30 từ bất kỳ trong kho',
        categoryLabel: 'Phản xạ nhanh',
        categoryColor: 'bg-purple-50 text-purple-700 border-purple-200',
        count: 30,
        specialMode: 'random',
      }
    );

    // 2. Topic Decks
    topics.forEach((t) => {
      list.push({
        id: `topic-${t.id}`,
        type: 'topic',
        title: t.name,
        subtitle: t.description || 'Chủ đề từ vựng chuyên biệt',
        categoryLabel: 'Chủ đề',
        categoryColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        count: t._count?.vocabularies ?? 0,
        sampleWords: t.vocabularies?.map((v) => ({
          korean: v.korean,
          vietnamese: v.vietnamese,
        })),
        topicId: t.id,
      });
    });

    // 3. Lesson Decks
    lessons.forEach((l) => {
      const textbookTitle = l.chapter?.textbook?.title || 'Giáo trình';
      const chapterTitle = l.chapter?.title ? ` • ${l.chapter.title}` : '';
      list.push({
        id: `lesson-${l.id}`,
        type: 'lesson',
        title: l.title,
        subtitle: `${textbookTitle}${chapterTitle}`,
        categoryLabel: 'Bài học',
        categoryColor: 'bg-teal-50 text-teal-700 border-teal-200',
        count: l._count?.vocabularies ?? 0,
        sampleWords: l.vocabularies?.map((v) => ({
          korean: v.korean,
          vietnamese: v.vietnamese,
        })),
        lessonId: l.id,
      });
    });

    return list;
  }, [topics, lessons]);

  // Filtered decks for display
  const filteredDecks = useMemo(() => {
    return allDecks.filter((deck) => {
      // Category filter
      if (categoryTab === 'topics' && deck.type !== 'topic') return false;
      if (categoryTab === 'lessons' && deck.type !== 'lesson') return false;
      if (categoryTab === 'special' && deck.type !== 'special') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = deck.title.toLowerCase().includes(query);
        const matchSubtitle = deck.subtitle?.toLowerCase().includes(query) ?? false;
        const matchSample = deck.sampleWords?.some(
          (w) =>
            w.korean.toLowerCase().includes(query) ||
            w.vietnamese.toLowerCase().includes(query)
        ) ?? false;
        return matchTitle || matchSubtitle || matchSample;
      }
      return true;
    });
  }, [allDecks, categoryTab, searchQuery]);

  // Fetch cards when activeDeck changes
  const fetchDeckCards = useCallback(
    async (deck: StudyDeck, difficultOnly: boolean = false) => {
      setLoadingCards(true);
      setIsFlipped(false);
      setCurrentIndex(0);
      setIsSessionCompleted(false);
      setSessionStats({ again: 0, hard: 0, good: 0 });
      setMissedCardIds([]);

      try {
        const params = new URLSearchParams({
          limit: '300',
        });

        if (difficultOnly) {
          params.set('difficultOnly', 'true');
        }

        if (deck.type === 'topic' && deck.topicId) {
          params.set('mode', 'topic');
          params.set('topicId', deck.topicId);
        } else if (deck.type === 'lesson' && deck.lessonId) {
          params.set('mode', 'lesson');
          params.set('lessonId', deck.lessonId);
        } else if (deck.type === 'special' && deck.specialMode) {
          params.set('mode', deck.specialMode);
          if (deck.specialMode === 'random') {
            params.set('limit', '30');
          }
        }

        const res = await fetch(`/api/flashcards?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể tải thẻ flashcard');
        const data = await res.json();
        const items: Vocabulary[] = data.items || [];

        setCards(items);

        if (items.length > 0 && autoSpeak && frontLanguage === 'korean') {
          speakKorean(items[0].korean);
        }
      } catch (err) {
        showToast('Lỗi tải bộ thẻ Flashcard', 'error');
      } finally {
        setLoadingCards(false);
      }
    },
    [autoSpeak, frontLanguage, showToast]
  );

  // Start studying a deck
  const handleStartDeck = (deck: StudyDeck, difficultOnly: boolean = false) => {
    setActiveDeck(deck);
    setIsDifficultOnly(difficultOnly);
    fetchDeckCards(deck, difficultOnly);
  };

  // Back to Deck Library
  const handleBackToDecks = () => {
    setActiveDeck(null);
    setCards([]);
    setIsSessionCompleted(false);
  };

  // Current Card
  const currentCard: Vocabulary | undefined = cards[currentIndex];

  // Auto speak when card changes
  useEffect(() => {
    if (autoSpeak && currentCard && !isSessionCompleted && !loadingCards) {
      if (frontLanguage === 'korean' && !isFlipped) {
        speakKorean(currentCard.korean);
      } else if (frontLanguage === 'vietnamese' && isFlipped) {
        speakKorean(currentCard.korean);
      }
    }
  }, [currentIndex, isFlipped, autoSpeak, currentCard, frontLanguage, isSessionCompleted, loadingCards]);

  // Flip card
  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  // Shuffle current cards
  const handleShuffle = () => {
    if (cards.length <= 1) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    showToast('Đã xáo trộn thứ tự thẻ!', 'info');
  };

  // Swap Front/Back language
  const handleSwapFrontBack = () => {
    setFrontLanguage((prev) => (prev === 'korean' ? 'vietnamese' : 'korean'));
    setIsFlipped(false);
    showToast(
      frontLanguage === 'korean'
        ? 'Đã đổi mặt trước: Tiếng Việt ➔ Tiếng Hàn'
        : 'Đã đổi mặt trước: Tiếng Hàn ➔ Tiếng Việt',
      'info'
    );
  };

  // Toggle Favorite for Current Card
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    const newFav = !currentCard.isFavorite;
    // optimistic update
    setCards((prev) =>
      prev.map((c, i) => (i === currentIndex ? { ...c, isFavorite: newFav } : c))
    );

    try {
      await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleFavorite',
          vocabularyId: currentCard.id,
          isFavorite: newFav,
        }),
      });
      showToast(newFav ? 'Đã thêm vào từ yêu thích ⭐' : 'Đã bỏ yêu thích', 'info');
    } catch {
      showToast('Lỗi cập nhật yêu thích', 'error');
    }
  };

  // Submit Rating
  const handleRate = async (rating: 'AGAIN' | 'HARD' | 'GOOD') => {
    if (!currentCard) return;

    // Track session stats
    setSessionStats((prev) => ({
      ...prev,
      again: rating === 'AGAIN' ? prev.again + 1 : prev.again,
      hard: rating === 'HARD' ? prev.hard + 1 : prev.hard,
      good: rating === 'GOOD' ? prev.good + 1 : prev.good,
    }));

    if (rating === 'AGAIN' || rating === 'HARD') {
      setMissedCardIds((prev) => [...prev, currentCard.id]);
    }

    // Send review to server
    try {
      await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentCard.id,
          rating,
        }),
      });
    } catch (err) {
      console.error('Lỗi lưu thẻ flashcard:', err);
    }

    // Move to next card or finish
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
      }, 150);
    } else {
      setIsSessionCompleted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeDeck || isSessionCompleted || loadingCards || cards.length === 0) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setIsFlipped(false);
          setCurrentIndex((i) => i - 1);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex + 1 < cards.length) {
          setIsFlipped(false);
          setCurrentIndex((i) => i + 1);
        }
      } else if (e.key === '1') {
        e.preventDefault();
        handleRate('AGAIN');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRate('HARD');
      } else if (e.key === '3') {
        e.preventDefault();
        handleRate('GOOD');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentCard?.korean) {
          speakKorean(currentCard.korean);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDeck, isFlipped, currentIndex, cards.length, isSessionCompleted, loadingCards, currentCard]);

  // Restart session with all cards in this deck
  const handleRestartFull = () => {
    if (activeDeck) {
      fetchDeckCards(activeDeck, isDifficultOnly);
    }
  };

  // Re-study only missed or hard cards
  const handleRestudyMissed = () => {
    const filteredMissed = cards.filter((c) => missedCardIds.includes(c.id));
    if (filteredMissed.length > 0) {
      setCards(filteredMissed);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionCompleted(false);
      setSessionStats({ again: 0, hard: 0, good: 0 });
      setMissedCardIds([]);
      showToast(`Bắt đầu ôn lại ${filteredMissed.length} thẻ chưa nhớ!`, 'info');
    } else {
      showToast('Bạn đã nhớ tốt tất cả các thẻ! Tuyệt vời!', 'success');
    }
  };

  /* =========================================================
     VIEW 1: QUIZLET-STYLE STUDY DECK LIBRARY (THƯ VIỆN BỘ THẺ)
     ========================================================= */
  if (!activeDeck) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-100/50 to-indigo-100/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-200/80">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Quizlet-Style Flashcard Decks</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Bộ thẻ học Thẻ ghi nhớ
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Chọn một học phần theo <strong className="text-slate-700 font-semibold">Chủ đề</strong> hoặc{' '}
                <strong className="text-slate-700 font-semibold">Bài học giáo trình</strong> để ôn tập phản xạ từ vựng nhanh, lật 3D và tự động chấm độ ghi nhớ.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 self-start md:self-auto min-w-[280px]">
              <div className="text-center p-2">
                <span className="block text-xl font-black text-blue-600">
                  {topics.reduce((acc, t) => acc + (t._count?.vocabularies || 0), 0)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">Từ vựng</span>
              </div>
              <div className="text-center p-2 border-x border-slate-200/80">
                <span className="block text-xl font-black text-indigo-600">{topics.length}</span>
                <span className="text-[11px] font-semibold text-slate-500">Chủ đề</span>
              </div>
              <div className="text-center p-2">
                <span className="block text-xl font-black text-teal-600">{lessons.length}</span>
                <span className="text-[11px] font-semibold text-slate-500">Bài học</span>
              </div>
            </div>
          </div>

          {/* Search & Tabs Controls */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto text-xs font-bold text-slate-600">
              <button
                onClick={() => setCategoryTab('topics')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  categoryTab === 'topics'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                <BookMarked className="w-4 h-4 text-indigo-500" />
                <span>Theo Chủ đề ({topics.length})</span>
              </button>

              <button
                onClick={() => setCategoryTab('lessons')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  categoryTab === 'lessons'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-teal-500" />
                <span>Theo Bài học ({lessons.length})</span>
              </button>

              <button
                onClick={() => setCategoryTab('special')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  categoryTab === 'special'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bộ thẻ nhanh (4)</span>
              </button>

              <button
                onClick={() => setCategoryTab('all')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                  categoryTab === 'all'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Tất cả ({allDecks.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm bộ thẻ, bài học, từ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3 shadow-soft">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">Không tìm thấy bộ thẻ phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không có chủ đề hoặc bài học nào khớp với từ khóa "{searchQuery}". Hãy thử tìm từ khóa khác hoặc tạo thêm chủ đề mới.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDecks.map((deck) => {
              const isSpecial = deck.type === 'special';
              const isTopic = deck.type === 'topic';
              const isLesson = deck.type === 'lesson';

              return (
                <div
                  key={deck.id}
                  onClick={() => handleStartDeck(deck)}
                  className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-blue-400 shadow-soft hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden hover:-translate-y-1"
                >
                  {/* Decorative top accent */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isSpecial
                        ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                        : isTopic
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                    }`}
                  />

                  <div>
                    {/* Top Meta Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${deck.categoryColor}`}
                      >
                        {deck.categoryLabel}
                      </span>
                      <span className="text-xs font-extrabold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-full">
                        {deck.count} thẻ
                      </span>
                    </div>

                    {/* Deck Title */}
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {deck.title}
                    </h3>
                    {deck.subtitle && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{deck.subtitle}</p>
                    )}

                    {/* Sample Words Snippet (Quizlet hallmark) */}
                    {deck.sampleWords && deck.sampleWords.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                          Từ vựng mẫu
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {deck.sampleWords.slice(0, 4).map((w, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/70 font-korean"
                            >
                              {w.korean}
                            </span>
                          ))}
                          {deck.sampleWords.length > 4 && (
                            <span className="text-[10px] font-bold text-slate-400 px-1 py-0.5">
                              +{deck.sampleWords.length - 4} từ
                            </span>
                          )}
                        </div>
                      </div>
                    ) : isSpecial ? (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 italic">
                          {deck.specialMode === 'difficult'
                            ? 'Bao gồm các từ được gắn cờ khó nhớ hoặc hay làm sai'
                            : deck.specialMode === 'new'
                            ? 'Bao gồm các từ mới thêm vào chưa từng được ôn tập'
                            : deck.specialMode === 'random'
                            ? 'Lấy 30 từ ngẫu nhiên để luyện phản xạ siêu tốc'
                            : 'Bao gồm tất cả từ vựng bạn đã lưu vào hệ thống'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400 italic">
                          {deck.count === 0 ? 'Chưa có từ vựng nào' : 'Nhấn để bắt đầu học'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Học bộ thẻ này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>

                    {deck.count > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDeck(deck, true);
                        }}
                        title="Chỉ ôn các từ khó trong bộ này"
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Flame className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     VIEW 2: ACTIVE QUIZLET STUDY ROOM (PHÒNG HỌC FLASHCARD)
     ========================================================= */
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header Bar with Breadcrumb and Study Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Back to Decks Button */}
          <button
            onClick={handleBackToDecks}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Đổi bộ thẻ khác</span>
          </button>

          {/* Active Deck Info */}
          <div className="text-left sm:text-right">
            <div className="flex items-center sm:justify-end gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeDeck.categoryColor}`}
              >
                {activeDeck.categoryLabel}
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                {activeDeck.title}
              </h2>
            </div>
            {isDifficultOnly && (
              <span className="text-[11px] font-bold text-rose-600 flex items-center sm:justify-end gap-1 mt-0.5">
                <Flame className="w-3 h-3 fill-rose-500" />
                <span>Đang lọc: Chỉ ôn các thẻ khó</span>
              </span>
            )}
          </div>
        </div>

        {/* Toolbar: Shuffle, Front/Back, Auto-speak */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Swap Front/Back */}
            <button
              onClick={handleSwapFrontBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Đổi mặt trước thành Tiếng Việt hoặc Tiếng Hàn"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Mặt trước: {frontLanguage === 'korean' ? 'Hàn ➔ Việt' : 'Việt ➔ Hàn'}
              </span>
            </button>

            {/* Shuffle Deck */}
            <button
              onClick={handleShuffle}
              disabled={cards.length <= 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition"
              title="Xáo trộn ngẫu nhiên thứ tự thẻ"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xáo trộn</span>
            </button>

            {/* Auto speak Toggle */}
            <button
              onClick={() => {
                setAutoSpeak((prev) => !prev);
                showToast(
                  !autoSpeak ? 'Đã bật tự động đọc âm thanh' : 'Đã tắt tự động đọc âm thanh',
                  'info'
                );
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                autoSpeak
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Tự động phát âm</span>
            </button>
          </div>

          {/* Reload Deck button */}
          <button
            onClick={() => fetchDeckCards(activeDeck, isDifficultOnly)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Tải lại bộ thẻ này"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      {loadingCards ? (
        <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang chuẩn bị bộ thẻ Flashcard...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-4 shadow-soft">
          <Layers className="w-14 h-14 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">Bộ thẻ này hiện chưa có từ vựng nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isDifficultOnly
              ? 'Không có từ khó nào trong bộ thẻ này! Thật tuyệt vời.'
              : 'Hãy thêm từ vựng mới hoặc nạp từ file Excel vào danh mục này để bắt đầu học flashcard nhé.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleBackToDecks}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              Chọn bộ thẻ khác
            </button>
            {isDifficultOnly && (
              <button
                onClick={() => {
                  setIsDifficultOnly(false);
                  fetchDeckCards(activeDeck, false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                Học toàn bộ thẻ bộ này
              </button>
            )}
          </div>
        </div>
      ) : isSessionCompleted ? (
        /* Completion Screen */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-6 shadow-soft animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner ring-8 ring-amber-50/50">
            <Trophy className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Hoàn thành bộ thẻ!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Bạn đã ôn luyện toàn bộ {cards.length} thẻ trong bộ{' '}
              <strong className="text-slate-800 font-bold">"{activeDeck.title}"</strong>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="block text-3xl font-black">{sessionStats.good}</span>
              <span className="text-xs font-bold">Đã nhớ tốt</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
              <span className="block text-3xl font-black">{sessionStats.hard}</span>
              <span className="text-xs font-bold">Khó nhớ</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
              <span className="block text-3xl font-black">{sessionStats.again}</span>
              <span className="text-xs font-bold">Chưa nhớ</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handleRestartFull}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Học lại toàn bộ bộ này</span>
            </button>

            {missedCardIds.length > 0 && (
              <button
                onClick={handleRestudyMissed}
                className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4 text-rose-600 fill-rose-500" />
                <span>Chỉ ôn lại {missedCardIds.length} từ chưa nhớ</span>
              </button>
            )}

            <button
              onClick={handleBackToDecks}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition"
            >
              ← Chọn bộ thẻ khác
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard Viewer */
        <div className="space-y-4">
          {/* Deck Progress Bar */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>
              Thẻ {currentIndex + 1} / {cards.length}
            </span>
            <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}% hoàn thành</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={handleFlip}
            className="perspective-1000 w-full min-h-[360px] sm:min-h-[400px] cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full min-h-[360px] sm:min-h-[400px] transition-transform duration-500 transform-style-3d rounded-3xl shadow-card hover:shadow-xl border border-slate-200/90 bg-white ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* ================= FRONT SIDE ================= */}
              <div
                className={`absolute inset-0 backface-hidden p-8 flex flex-col justify-between rounded-3xl bg-gradient-to-b from-white via-white to-slate-50/60 ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                {/* Front Top Tags */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {frontLanguage === 'korean' ? 'Mặt trước: Tiếng Hàn' : 'Mặt trước: Tiếng Việt'}
                  </span>

                  <div className="flex items-center gap-2">
                    {currentCard?.topic && (
                      <span className="text-slate-400 text-xs font-medium">
                        {currentCard.topic.name}
                      </span>
                    )}
                    <button
                      onClick={handleToggleFavorite}
                      title={currentCard?.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                      className="p-1 rounded-full hover:bg-slate-100 transition"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          currentCard?.isFavorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Front Core Word */}
                <div className="text-center space-y-3 py-6">
                  {frontLanguage === 'korean' ? (
                    <>
                      <div className="flex items-center justify-center gap-3">
                        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-korean tracking-wide">
                          {currentCard?.korean}
                        </h2>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakKorean(currentCard?.korean || '');
                          }}
                          title="Phát âm tiếng Hàn"
                          className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                      {currentCard?.hanja && (
                        <p className="text-sm font-mono text-slate-400">[{currentCard.hanja}]</p>
                      )}
                      <span className="inline-block text-xs font-bold px-3 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {currentCard?.partOfSpeech}
                      </span>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl sm:text-4xl font-black text-blue-700">
                        {currentCard?.vietnamese}
                      </h2>
                      <span className="inline-block text-xs font-bold px-3 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Từ loại: {currentCard?.partOfSpeech}
                      </span>
                    </>
                  )}
                </div>

                {/* Front Hint Footer */}
                <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <RotateCw
                    className="w-3.5 h-3.5 text-blue-500 animate-spin"
                    style={{ animationDuration: '4s' }}
                  />
                  <span>Nhấn vào thẻ hoặc bấm phím Space để xem mặt sau</span>
                </div>
              </div>

              {/* ================= BACK SIDE ================= */}
              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 p-8 flex flex-col justify-between rounded-3xl bg-white ${
                  !isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                {/* Back Top */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-korean text-base">
                      {currentCard?.korean}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakKorean(currentCard?.korean || '');
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Mặt sau: Nghĩa & Ví dụ
                  </span>
                </div>

                {/* Back Core Meaning */}
                <div className="py-2 space-y-3">
                  <div className="text-center">
                    {frontLanguage === 'korean' ? (
                      <p className="text-2xl sm:text-3xl font-extrabold text-blue-700">
                        {currentCard?.vietnamese}
                      </p>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 font-korean">
                          {currentCard?.korean}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakKorean(currentCard?.korean || '');
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Từ loại: {currentCard?.partOfSpeech}
                    </p>
                  </div>

                  {/* Example Box */}
                  {currentCard?.exampleKorean && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Ví dụ minh họa
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakKorean(currentCard?.exampleKorean || '');
                          }}
                          className="text-slate-400 hover:text-blue-600 transition"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 font-korean">
                        {currentCard?.exampleKorean}
                      </p>
                      {currentCard?.exampleVietnamese && (
                        <p className="text-xs text-slate-500 italic">
                          {currentCard?.exampleVietnamese}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes if any */}
                  {currentCard?.notes && (
                    <p className="text-xs text-slate-500 italic text-center">
                      Ghi chú: {currentCard.notes}
                    </p>
                  )}
                </div>

                {/* Back Footer Indicator */}
                <div className="text-center text-xs text-slate-400 font-medium">
                  Chọn mức độ ghi nhớ bên dưới hoặc dùng phím 1 - 2 - 3:
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Controls Bar */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  setIsFlipped(false);
                  setCurrentIndex((i) => i - 1);
                }
              }}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Thẻ trước</span>
            </button>

            <button
              onClick={handleFlip}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Xem mặt trước' : 'Lật mặt sau (Space)'}</span>
            </button>

            <button
              onClick={() => {
                if (currentIndex + 1 < cards.length) {
                  setIsFlipped(false);
                  setCurrentIndex((i) => i + 1);
                }
              }}
              disabled={currentIndex + 1 >= cards.length}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition"
            >
              <span>Thẻ sau</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rating Evaluation Bar (SRS SM-2 Integration) */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <button
              onClick={() => handleRate('AGAIN')}
              className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Chưa nhớ</span>
              </div>
              <span className="text-[10px] text-rose-500 font-normal">Phím 1</span>
            </button>

            <button
              onClick={() => handleRate('HARD')}
              className="py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Khó nhớ</span>
              </div>
              <span className="text-[10px] text-amber-500 font-normal">Phím 2</span>
            </button>

            <button
              onClick={() => handleRate('GOOD')}
              className="py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã nhớ tốt</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-normal">Phím 3</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Hint Bar */}
          <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
            Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">Space</kbd> Lật thẻ • <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">1</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">2</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">3</kbd> Đánh giá • <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">S</kbd> Phát âm • <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">←</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">→</kbd> Chuyển thẻ
          </div>
        </div>
      )}
    </div>
  );
}