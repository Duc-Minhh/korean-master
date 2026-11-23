'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Trophy,
  History,
  TrendingDown,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Topic, Lesson, QuizQuestion, QuizResult } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

interface QuizPracticeProps {
  topics: Topic[];
  lessons: Lesson[];
}

export default function QuizPractice({ topics, lessons }: QuizPracticeProps) {
  const { showToast } = useToast();

  // Test Config state
  const [selectedType, setSelectedType] = useState<string>('vocab');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');

  // Active Test state
  const [isTesting, setIsTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  // Result state
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // History & Mistake stats state
  const [showHistory, setShowHistory] = useState(false);
  const [histories, setHistories] = useState<any[]>([]);
  const [frequentMistakes, setFrequentMistakes] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const QUIZ_MODES = [
    {
      id: 'vocab',
      title: '1. Ôn luyện từ vựng',
      badge: 'Gộp Dạng 1 - 5',
      desc: 'Tổng hợp 5 dạng: Chọn nghĩa Hàn - Việt, Việt - Hàn, điền từ vào câu và luyện gõ chính tả Hangul',
      icon: BookOpen,
    },
    {
      id: 'grammar',
      title: '2. Ôn luyện ngữ pháp',
      badge: 'Gộp Dạng 6 - 8',
      desc: 'Tổng hợp 3 dạng: Nhận biết cấu trúc, chia đuôi câu và chọn câu sử dụng ngữ pháp đúng',
      icon: Layers,
    },
    {
      id: 'all',
      title: '3. Đề tổng hợp toàn diện',
      badge: 'Fix cứng 40 câu',
      desc: 'Đề thi hoàn chỉnh 40 câu kết hợp cả Từ vựng theo chủ đề và Ngữ pháp theo bài học',
      icon: Award,
    },
  ];

  // Start Quiz
  const handleStartQuiz = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: selectedType,
        count: selectedType === 'all' ? '40' : String(questionCount),
      });

      if (selectedType === 'vocab' || selectedType === 'all') {
        params.set('topicId', selectedTopic);
      }
      if (selectedType === 'grammar' || selectedType === 'all') {
        params.set('lessonId', selectedLesson);
      }

      const res = await fetch(`/api/quiz?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Không thể tạo đề kiểm tra');
      }

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('Chưa có đủ từ vựng/ngữ pháp trong hệ thống');
      }

      setQuestions(data.questions);
      setIsAIGenerated(Boolean(data.isAIGenerated));
      setUserAnswers({});
      setCurrentQIndex(0);
      setQuizResult(null);
      setIsTesting(true);

      if (data.isAIGenerated) {
        showToast('✨ AI Gemini vừa sáng tạo đề thi mới cho bạn!', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khởi tạo bài kiểm tra', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer
  const handleAnswerChange = (qId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: answer,
    }));
  };

  // Finish and Submit Quiz
  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizType: selectedType,
          title: QUIZ_MODES.find((t) => t.id === selectedType)?.title || 'Bài kiểm tra',
          questions,
          userAnswers,
        }),
      });

      if (!res.ok) throw new Error('Không thể nộp bài');
      const data = await res.json();
      setQuizResult(data);
      setIsTesting(false);

      if (data.score >= 80) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      showToast('Lỗi khi nộp bài kiểm tra', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/quiz/history');
      if (res.ok) {
        const data = await res.json();
        setHistories(data.histories || []);
        setFrequentMistakes(data.frequentMistakes || []);
      }
    } catch (e) {
      showToast('Lỗi tải lịch sử kiểm tra', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 mb-2">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Hệ thống Luyện tập & Đề thi Tổng hợp 40 câu</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Luyện tập và Kiểm tra kiến thức
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kiểm tra toàn diện từ vựng, ngữ pháp, ghép câu và luyện gõ tiếng Hàn từ chính dữ liệu bạn đã nhập.
            </p>
          </div>

          <button
            onClick={() => {
              setShowHistory(!showHistory);
              setIsTesting(false);
              setQuizResult(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition self-start sm:self-auto"
          >
            <History className="w-4 h-4" />
            <span>{showHistory ? 'Quay lại làm bài' : 'Lịch sử & Lỗi thường gặp'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: History & Mistake Statistics */}
      {showHistory ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Frequent Mistakes Widget */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                Từ vựng & Ngữ pháp trả lời sai nhiều nhất
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống tự động thống kê để giúp bạn tập trung ôn lại các điểm kiến thức hay nhầm lẫn.
            </p>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang phân tích...</div>
            ) : frequentMistakes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có dữ liệu câu sai. Hãy làm bài kiểm tra để hệ thống phân tích!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {frequentMistakes.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold font-korean text-sm text-slate-900">{m.name}</span>
                      <p className="text-[11px] text-slate-500">{m.type}</p>
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full">
                      Sai {m.count} lần
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Quiz History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Lịch sử các lần làm bài gần đây</h3>
            </div>
            {histories.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Chưa có bài thi nào được lưu.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-sm">
                {histories.map((h) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">{h.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ngày làm: {new Date(h.completedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-extrabold ${
                          h.score >= 80 ? 'text-emerald-600' : h.score >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}
                      >
                        {h.score}%
                      </span>
                      <p className="text-xs text-slate-500">
                        {h.correctCount} / {h.totalQuestions} câu đúng
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : isTesting ? (
        /* VIEW 2: Active Quiz Room */
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-6 animate-in fade-in duration-200">
          {/* Quiz Room Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {currentQ?.typeName}
                </span>
                {isAIGenerated && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>AI Gemini</span>
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                Câu hỏi {currentQIndex + 1} / {questions.length}
              </p>
            </div>

            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn hủy bài kiểm tra này?')) {
                  setIsTesting(false);
                }
              }}
              className="text-xs text-slate-400 hover:text-rose-600 transition"
            >
              Thoát bài kiểm tra
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Prompt */}
          <div className="py-4 text-center space-y-3">
            <p className="text-xs text-slate-500 font-medium">{currentQ?.instruction}</p>
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-korean tracking-wide">
                {currentQ?.question}
              </h2>
              {/* Audio button if Korean word or sentence */}
              {/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentQ?.question || '') && (
                <button
                  type="button"
                  onClick={() => speakKorean(currentQ?.question || '')}
                  className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Answer Input or Options */}
          {currentQ?.options && currentQ.options.length > 0 ? (
            /* Multiple Choice Options (Types 1, 2, 3, 6, 7, 8) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {currentQ.options.map((opt, idx) => {
                const isSelected = userAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerChange(currentQ.id, opt)}
                    className={`p-4 rounded-xl border text-left text-sm font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <span className="font-korean">{opt}</span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Free Typing Input (Types 4 & 5) */
            <div className="max-w-md mx-auto space-y-2">
              <input
                type="text"
                autoFocus
                value={userAnswers[currentQ?.id] || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
              />
              <p className="text-[11px] text-slate-400 text-center">
                (Gõ chính xác nghĩa hoặc từ tiếng Hàn tương ứng)
              </p>
            </div>
          )}

          {/* Question Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            {currentQIndex + 1 < questions.length ? (
              <button
                onClick={() => setCurrentQIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow transition flex items-center gap-1.5"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                {loading ? 'Đang chấm điểm...' : 'Nộp bài & Xem kết quả'}
              </button>
            )}
          </div>
        </div>
      ) : quizResult ? (
        /* VIEW 3: Result & Explanations */
        <div className="space-y-6 animate-in zoom-in-95 duration-200">
          {/* Score Header Card */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-soft text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Kết quả bài kiểm tra</h2>
              <p className="text-sm text-slate-500 mt-1">
                Thời gian hoàn thành: {new Date(quizResult.completedAt).toLocaleTimeString('vi-VN')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 py-4">
              <div>
                <span className="text-5xl font-black text-blue-600">{quizResult.score}%</span>
                <p className="text-xs text-slate-400 mt-1">Điểm số đạt được</p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="text-left text-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{quizResult.correctCount} câu đúng</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>{quizResult.wrongCount} câu sai</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleStartQuiz}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Làm lại đề mới</span>
              </button>
              <button
                onClick={() => setQuizResult(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Chọn bài kiểm tra khác
              </button>
            </div>
          </div>

          {/* Detailed Question Review with Explanations */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900">Chi tiết bài làm & Giải thích đáp án</h3>
            {quizResult.details.map((q, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl p-5 border shadow-soft space-y-3 ${
                  q.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {q.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Câu {idx + 1}: {q.typeName}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      q.isCorrect
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {q.isCorrect ? 'Đúng' : 'Chưa đúng'}
                  </span>
                </div>

                <div className="text-base font-bold text-slate-900 font-korean">
                  {q.question}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div
                    className={`p-3 rounded-xl border ${
                      q.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span className="font-bold block text-[11px] uppercase">Bạn đã chọn:</span>
                    <span className="font-korean font-semibold">
                      {q.userAnswer || '(Để trống)'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                    <span className="font-bold block text-[11px] uppercase text-slate-500">
                      Đáp án chính xác:
                    </span>
                    <span className="font-korean font-bold text-emerald-700">
                      {q.correctAnswer}
                    </span>
                  </div>
                </div>

                {/* Database Explanation */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-blue-700 uppercase">
                      Giải thích đáp án:
                    </span>
                    {/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(q.explanation) && (
                      <button
                        onClick={() => speakKorean(q.correctAnswer)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VIEW 4: Config & Start Quiz */
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Chọn chế độ luyện tập & kiểm tra</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn Ôn luyện Từ vựng (dạng 1-5), Ôn luyện Ngữ pháp (dạng 6-8) hoặc Đề thi Tổng hợp 40 câu
            </p>
          </div>

          {/* 3 Main Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUIZ_MODES.map((mode) => {
              const isSelected = selectedType === mode.id;
              const IconComponent = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(mode.id);
                    if (mode.id === 'all') {
                      setQuestionCount(40);
                    } else if (questionCount === 40) {
                      setQuestionCount(10);
                    }
                  }}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {mode.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm sm:text-base">{mode.title}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{mode.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-blue-200/60 text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Đang chọn chế độ này</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Test Parameters (Conditional per Mode) */}
          {selectedType === 'vocab' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Số lượng câu hỏi
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={5}>5 câu (Kiểm tra nhanh)</option>
                  <option value={10}>10 câu (Tiêu chuẩn)</option>
                  <option value={15}>15 câu (Mở rộng)</option>
                  <option value={20}>20 câu (Toàn diện)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Chọn chủ đề từ vựng cần làm
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả chủ đề</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t._count?.vocabularies || 0} từ)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedType === 'grammar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Số lượng câu hỏi
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={5}>5 câu (Kiểm tra nhanh)</option>
                  <option value={10}>10 câu (Tiêu chuẩn)</option>
                  <option value={15}>15 câu (Mở rộng)</option>
                  <option value={20}>20 câu (Toàn diện)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Chọn bài học ngữ pháp để làm
                </label>
                <select
                  value={selectedLesson}
                  onChange={(e) => setSelectedLesson(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả bài học</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l._count?.grammars || 0} ngữ pháp)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedType === 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Số lượng câu hỏi
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-indigo-700 flex items-center justify-between">
                  <span>40 câu hoàn chỉnh</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">Cố định</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Chọn chủ đề từ vựng
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả chủ đề</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t._count?.vocabularies || 0} từ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Chọn bài học ngữ pháp
                </label>
                <select
                  value={selectedLesson}
                  onChange={(e) => setSelectedLesson(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả bài học</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l._count?.grammars || 0} ngữ pháp)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Smart Tips per Mode */}
          {selectedType === 'vocab' && (
            <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Chế độ <strong>Ôn luyện từ vựng</strong>: Hệ thống sẽ tự động phối hợp 5 dạng bài tập (chọn nghĩa Hàn - Việt, Việt - Hàn, điền từ vào câu ví dụ, tự gõ nghĩa và gõ tiếng Hàn) theo chủ đề bạn đã chọn.
              </span>
            </div>
          )}

          {selectedType === 'grammar' && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Chế độ <strong>Ôn luyện ngữ pháp</strong>: Hệ thống sẽ tạo bài kiểm tra 3 dạng ngữ pháp chuyên sâu (nhận biết ý nghĩa, chia đuôi động từ vào câu và chọn câu chuẩn ngữ pháp) theo bài học bạn đã chọn.
              </span>
            </div>
          )}

          {selectedType === 'all' && (
            <div className="p-3.5 bg-purple-50 border border-purple-200/80 rounded-xl text-xs text-purple-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Đề thi tổng hợp hoàn chỉnh 40 câu</strong>: Kết hợp cân bằng giữa Từ vựng theo chủ đề và Ngữ pháp theo bài học đã chọn, tạo trải nghiệm thi thử TOPIK toàn diện nhất!
              </span>
            </div>
          )}

          {/* Start Test Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartQuiz}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {loading ? (
                <span>Đang khởi tạo đề thi...</span>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>
                    {selectedType === 'all'
                      ? 'Bắt đầu làm Đề tổng hợp (40 câu)'
                      : selectedType === 'vocab'
                      ? `Bắt đầu ôn luyện từ vựng (${questionCount} câu)`
                      : `Bắt đầu ôn luyện ngữ pháp (${questionCount} câu)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
