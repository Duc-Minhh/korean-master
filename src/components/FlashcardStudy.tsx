'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Volume2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Star,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Vocabulary, Topic, Lesson } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

interface FlashcardStudyProps {
  topics: Topic[];
  lessons: Lesson[];
}

export default function FlashcardStudy({ topics, lessons }: FlashcardStudyProps) {
  const { showToast } = useToast();

  // Mode and filter states
  const [mode, setMode] = useState<string>('all'); // all, new, difficult, random, topic, lesson
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  // Deck states
  const [cards, setCards] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Session stats
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
  });
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);

  // Fetch cards based on current mode
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setIsFlipped(false);
    setCurrentIndex(0);
    setIsSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0 });

    try {
      const params = new URLSearchParams({
        mode,
        limit: '30',
        ...(mode === 'topic' && selectedTopicId && { topicId: selectedTopicId }),
        ...(mode === 'lesson' && selectedLessonId && { lessonId: selectedLessonId }),
      });

      const res = await fetch(`/api/flashcards?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải thẻ flashcard');
      const data = await res.json();
      setCards(data.items || []);
    } catch (err) {
      showToast('Lỗi tải bộ thẻ Flashcard', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedTopicId, selectedLessonId, showToast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const currentCard: Vocabulary | undefined = cards[currentIndex];

  // Flip card
  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  // Submit Rating
  const handleRate = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentCard) return;

    // Track session stats
    setSessionStats((prev) => ({
      ...prev,
      again: rating === 'AGAIN' ? prev.again + 1 : prev.again,
      hard: rating === 'HARD' ? prev.hard + 1 : prev.hard,
      good: rating === 'GOOD' || rating === 'EASY' ? prev.good + 1 : prev.good,
    }));

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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSessionCompleted || loading || cards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') {
          handleRate('AGAIN');
        } else if (e.key === '2') {
          handleRate('HARD');
        } else if (e.key === '3') {
          handleRate('GOOD');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, cards.length, isSessionCompleted, loading]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Mode Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Chế độ học Flashcard</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lật thẻ tương tác và đánh giá độ ghi nhớ để cập nhật trạng thái học
            </p>
          </div>

          <button
            onClick={fetchCards}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại bộ thẻ</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'all', label: 'Tất cả từ' },
            { id: 'new', label: 'Từ mới chưa thuộc' },
            { id: 'difficult', label: 'Thẻ khó / Đã đánh dấu' },
            { id: 'random', label: 'Ngẫu nhiên' },
            { id: 'topic', label: 'Theo chủ đề' },
            { id: 'lesson', label: 'Theo bài học' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                if (m.id === 'topic' && !selectedTopicId && topics.length > 0) {
                  setSelectedTopicId(topics[0].id);
                }
                if (m.id === 'lesson' && !selectedLessonId && lessons.length > 0) {
                  setSelectedLessonId(lessons[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                mode === m.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sub-selector for Topic or Lesson */}
        {mode === 'topic' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Chọn chủ đề:</span>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'lesson' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Chọn bài học:</span>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Flashcard Stage */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang chuẩn bị bộ thẻ Flashcard...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
          <Layers className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">Không có từ nào trong danh mục này</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy chọn chế độ khác hoặc thêm từ vựng mới để bắt đầu học flashcard.
          </p>
        </div>
      ) : isSessionCompleted ? (
        /* Completion Screen */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center space-y-6 shadow-soft animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Hoàn thành phiên học Flashcard!</h2>
            <p className="text-sm text-slate-500 mt-1">
              Bạn đã ôn luyện toàn bộ {cards.length} thẻ trong phiên này.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="block text-2xl font-black">{sessionStats.good}</span>
              <span className="text-xs font-semibold">Đã nhớ tốt</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <span className="block text-2xl font-black">{sessionStats.hard}</span>
              <span className="text-xs font-semibold">Khó nhớ</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <span className="block text-2xl font-black">{sessionStats.again}</span>
              <span className="text-xs font-semibold">Chưa nhớ</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={fetchCards}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Học lại bộ này</span>
            </button>
            <button
              onClick={() => {
                setMode('difficult');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition"
            >
              Học các từ khó
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard Viewer */
        <div className="space-y-4">
          {/* Deck Progress Bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>
              Thẻ {currentIndex + 1} / {cards.length}
            </span>
            <span>
              {Math.round(((currentIndex + 1) / cards.length) * 100)}% hoàn thành
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={handleFlip}
            className="perspective-1000 w-full min-h-[340px] sm:min-h-[380px] cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full min-h-[340px] sm:min-h-[380px] transition-transform duration-500 transform-style-3d rounded-3xl shadow-card border border-slate-200/80 bg-white ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT SIDE (Mặt trước - Tiếng Hàn) */}
              <div
                className={`absolute inset-0 backface-hidden p-8 flex flex-col justify-between rounded-3xl bg-gradient-to-b from-white to-slate-50/50 ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                {/* Front Top Tags */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Mặt trước: Tiếng Hàn
                  </span>
                  <div className="flex items-center gap-2">
                    {currentCard?.topic && (
                      <span className="text-slate-400 text-xs">{currentCard.topic.name}</span>
                    )}
                    {currentCard?.isFavorite && (
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                </div>

                {/* Korean Core Word */}
                <div className="text-center space-y-3 py-6">
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
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {currentCard?.partOfSpeech}
                  </span>
                </div>

                {/* Front Hint Footer */}
                <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Nhấn vào thẻ hoặc bấm phím Space để xem nghĩa</span>
                </div>
              </div>

              {/* BACK SIDE (Mặt sau - Nghĩa tiếng Việt & Ví dụ) */}
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
                  <span className="font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Mặt sau: Nghĩa & Ví dụ
                  </span>
                </div>

                {/* Back Core Meaning */}
                <div className="py-2 space-y-3">
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-extrabold text-blue-700">
                      {currentCard?.vietnamese}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Từ loại: {currentCard?.partOfSpeech}</p>
                  </div>

                  {/* Example Box */}
                  {currentCard?.exampleKorean && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Ví dụ minh họa
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakKorean(currentCard?.exampleKorean || '');
                          }}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 font-korean">
                        {currentCard?.exampleKorean}
                      </p>
                      <p className="text-xs text-slate-500 italic">
                        {currentCard?.exampleVietnamese}
                      </p>
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
                <div className="text-center text-xs text-slate-400">
                  Chọn mức độ ghi nhớ bên dưới để chuyển sang thẻ tiếp theo:
                </div>
              </div>
            </div>
          </div>

          {/* Rating Evaluation Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => handleRate('AGAIN')}
              className="py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Chưa nhớ</span>
              </div>
              <span className="text-[10px] text-rose-500 font-normal">Phím 1</span>
            </button>

            <button
              onClick={() => handleRate('HARD')}
              className="py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Khó nhớ</span>
              </div>
              <span className="text-[10px] text-amber-500 font-normal">Phím 2</span>
            </button>

            <button
              onClick={() => handleRate('GOOD')}
              className="py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã nhớ</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-normal">Phím 3</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
