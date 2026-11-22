'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Volume2,
  RotateCw,
  TrendingUp,
  History,
  Calendar,
} from 'lucide-react';
import { Vocabulary } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

export default function SmartReviewSRS() {
  const { showToast } = useToast();

  const [dueItems, setDueItems] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [historyTab, setHistoryTab] = useState(false);

  const fetchDueItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review');
      if (!res.ok) throw new Error('Không thể tải danh sách ôn tập');
      const data = await res.json();
      setDueItems(data.items || []);
    } catch (err) {
      showToast('Lỗi tải từ cần ôn tập hôm nay', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDueItems();
  }, [fetchDueItems]);

  const currentItem: Vocabulary | undefined = dueItems[currentIndex];

  const handleStartSession = () => {
    if (dueItems.length === 0) return;
    setActiveSession(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  const handleRateSRS = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!currentItem) return;

    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentItem.id,
          rating,
        }),
      });
    } catch (err) {
      console.error('Lỗi lưu đánh giá SRS:', err);
    }

    if (currentIndex + 1 < dueItems.length) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
      }, 150);
    } else {
      setSessionCompleted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      fetchDueItems();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* SRS Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 mb-2">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thuật toán Lặp lại ngắt quãng (SM-2 SRS)</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ôn tập thông minh (Spaced Repetition)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tự động giãn cách thời gian ôn tập: từ khó ôn lại sớm hơn, từ nhớ tốt giãn cách thời gian để tối ưu hóa trí nhớ dài hạn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryTab(!historyTab)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              <History className="w-4 h-4" />
              <span>{historyTab ? 'Đóng lịch sử' : 'Lịch sử ôn tập'}</span>
            </button>

            {!activeSession && dueItems.length > 0 && (
              <button
                onClick={handleStartSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bắt đầu phiên ôn ({dueItems.length} thẻ)</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Cần ôn hôm nay</span>
            <span className="text-xl font-black text-rose-600">{dueItems.length} từ</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Chu kỳ ngắt quãng</span>
            <span className="text-xl font-black text-indigo-600">1 - 3 - 7 - 14 - 30 ngày</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium">Bộ nhớ lưu trữ</span>
            <span className="text-xl font-black text-emerald-600">Đồng bộ trực tiếp DB</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Review Session */}
      {activeSession ? (
        sessionCompleted ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-5 shadow-soft animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Tuyệt vời! Đã hoàn thành bài ôn hôm nay</h2>
              <p className="text-sm text-slate-500 mt-1">
                Các từ vựng đã được tính toán lại khoảng cách thời gian và dời lịch ôn tập sang các ngày tới.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSession(false);
                fetchDueItems();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow hover:bg-blue-700 transition"
            >
              Quay lại danh sách
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
              <span>
                Thẻ {currentIndex + 1} / {dueItems.length}
              </span>
              <button
                onClick={() => setActiveSession(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                Tạm dừng phiên ôn
              </button>
            </div>

            {/* SRS Interactive Card */}
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              className="perspective-1000 w-full min-h-[340px] cursor-pointer select-none"
            >
              <div
                className={`relative w-full h-full min-h-[340px] transition-transform duration-500 transform-style-3d rounded-3xl shadow-card border border-slate-200/80 bg-white ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side */}
                <div
                  className={`absolute inset-0 backface-hidden p-8 flex flex-col justify-between rounded-3xl bg-white ${
                    isFlipped ? 'pointer-events-none' : ''
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      SRS Bước {currentItem?.srsStep || 0}
                    </span>
                    <span className="text-slate-400 text-xs">{currentItem?.topic?.name}</span>
                  </div>

                  <div className="text-center space-y-3 py-6">
                    <div className="flex items-center justify-center gap-3">
                      <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-korean tracking-wide">
                        {currentItem?.korean}
                      </h2>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakKorean(currentItem?.korean || '');
                        }}
                        className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    {currentItem?.hanja && (
                      <p className="text-sm font-mono text-slate-400">[{currentItem.hanja}]</p>
                    )}
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {currentItem?.partOfSpeech}
                    </span>
                  </div>

                  <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nhấn vào thẻ để kiểm tra trí nhớ</span>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className={`absolute inset-0 backface-hidden rotate-y-180 p-8 flex flex-col justify-between rounded-3xl bg-white ${
                    !isFlipped ? 'pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                    <span className="font-bold font-korean text-base text-slate-900">
                      {currentItem?.korean}
                    </span>
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đáp án & Ví dụ
                    </span>
                  </div>

                  <div className="py-2 space-y-3">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-blue-700">
                        {currentItem?.vietnamese}
                      </p>
                    </div>

                    {currentItem?.exampleKorean && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-left text-xs">
                        <p className="font-semibold text-slate-800 font-korean">
                          {currentItem.exampleKorean}
                        </p>
                        <p className="text-slate-500 italic">{currentItem.exampleVietnamese}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-xs text-slate-400">
                    Đánh giá khả năng hồi tưởng để tính toán chu kỳ tiếp theo:
                  </div>
                </div>
              </div>
            </div>

            {/* SRS 4-Rating Buttons with Projected Intervals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <button
                onClick={() => handleRateSRS('AGAIN')}
                className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition text-center shadow-sm"
              >
                <div className="font-bold">Chưa nhớ</div>
                <div className="text-[10px] text-rose-500 font-normal mt-0.5">Ôn lại: 1 ngày</div>
              </button>

              <button
                onClick={() => handleRateSRS('HARD')}
                className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs transition text-center shadow-sm"
              >
                <div className="font-bold">Khó nhớ</div>
                <div className="text-[10px] text-amber-500 font-normal mt-0.5">Ôn lại: 2 ngày</div>
              </button>

              <button
                onClick={() => handleRateSRS('GOOD')}
                className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs transition text-center shadow-sm"
              >
                <div className="font-bold">Nhớ tốt</div>
                <div className="text-[10px] text-blue-500 font-normal mt-0.5">Ôn lại: 7 ngày</div>
              </button>

              <button
                onClick={() => handleRateSRS('EASY')}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs transition text-center shadow-sm"
              >
                <div className="font-bold">Rất dễ</div>
                <div className="text-[10px] text-emerald-500 font-normal mt-0.5">Ôn lại: 14 ngày</div>
              </button>
            </div>
          </div>
        )
      ) : (
        /* List of Due Words */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Danh sách từ cần ôn hôm nay ({dueItems.length})</span>
            </h3>
            {dueItems.length > 0 && (
              <button
                onClick={handleStartSession}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition"
              >
                Bắt đầu phiên ôn
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Đang kiểm tra lịch ôn...</div>
          ) : dueItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <p className="text-base font-semibold text-slate-800">
                Hôm nay bạn không có thẻ nào đến hạn ôn!
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tất cả từ vựng đang trong chu kỳ nhớ dài hạn. Bạn có thể sang mục Flashcard hoặc Làm bài kiểm tra để luyện tập thêm!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dueItems.map((v) => (
                <div
                  key={v.id}
                  className="p-4 flex items-center justify-between hover:bg-blue-50/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => speakKorean(v.korean)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-korean text-base">
                          {v.korean}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {v.partOfSpeech}
                        </span>
                        {v.isDifficult && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Khó nhớ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{v.vietnamese}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="font-semibold text-indigo-600">
                      SRS Cấp độ {v.srsStep}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Khoảng cách: {v.srsInterval} ngày
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
