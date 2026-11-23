'use client';

import React from 'react';
import {
  BookOpen,
  FileText,
  Flame,
  CheckCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  Layers,
  Award,
  Volume2,
  TrendingUp,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DashboardStats } from '@/types';
import { speakKorean } from '@/lib/speech';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onQuickAddVocab: () => void;
  onQuickAddGrammar: () => void;
}

export default function DashboardView({
  stats,
  loading,
  onNavigate,
  onQuickAddVocab,
  onQuickAddGrammar,
}: DashboardViewProps) {
  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  const vocabProgressPercent = stats.totalVocab
    ? Math.round((stats.masteredVocab / stats.totalVocab) * 100)
    : 0;

  const todayWordPercent = Math.min(
    100,
    Math.round((stats.todayStudiedWords / (stats.targetWordsPerDay || 10)) * 100)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome & Motivational Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-200 mb-3">
            <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Chuỗi học {stats.streakCount} ngày liên tiếp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            안녕하세요! Hôm nay bạn muốn học gì?
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Kiên trì tích lũy từng từ vựng và cấu trúc ngữ pháp mỗi ngày. Chúc bạn có một buổi học hiệu quả!
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('flashcards')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-800 font-semibold text-sm hover:bg-blue-50 transition shadow-md shadow-black/10"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Học Flashcard</span>
            </button>
            <button
              onClick={() => onNavigate('srs')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm border border-white/20 transition backdrop-blur-md"
            >
              <Clock className="w-4 h-4 text-amber-300" />
              <span>Ôn tập SRS ({stats.dueReviewsToday} từ cần ôn)</span>
            </button>
            <button
              onClick={() => onNavigate('quiz')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Kiểm tra</span>
            </button>
          </div>
        </div>

        {/* Background Korean Calligraphy Deco */}
        <div className="absolute right-4 bottom-[-15px] opacity-10 select-none pointer-events-none text-8xl sm:text-9xl font-black font-korean tracking-widest text-white">
          한국어
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Vocabulary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng từ vựng
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalVocab}</span>
            <span className="text-xs text-slate-500 font-medium">từ</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
            <span className="text-emerald-600 font-semibold">{stats.masteredVocab} đã thuộc</span>
            <span className="text-amber-600 font-semibold">{stats.learningVocab} đang học</span>
            <span className="text-slate-400">{stats.notLearnedVocab} chưa học</span>
          </div>
        </div>

        {/* Metric 2: Total Grammar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng ngữ pháp
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalGrammar}</span>
            <span className="text-xs text-slate-500 font-medium">cấu trúc</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-600 border-t border-slate-100 pt-3">
            <span className="text-emerald-600 font-semibold">{stats.masteredGrammar} đã vững</span>
            <span className="text-amber-600 font-semibold">{stats.learningGrammar} đang học</span>
            <span className="text-slate-400">{stats.notLearnedGrammar} chưa học</span>
          </div>
        </div>

        {/* Metric 3: Today Learning Target */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mục tiêu hôm nay
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.todayStudiedWords}</span>
            <span className="text-xs text-slate-500 font-medium">/ {stats.targetWordsPerDay} từ</span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${todayWordPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>Tiến độ đạt {todayWordPercent}%</span>
              <span>{stats.todayStudiedWords >= stats.targetWordsPerDay ? 'Đã đạt mục tiêu 🎉' : 'Cần thêm từ'}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Spaced Repetition Due */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cần ôn hôm nay
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.dueReviewsToday}</span>
            <span className="text-xs text-slate-500 font-medium">thẻ đến hạn</span>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            {stats.dueReviewsToday > 0 ? (
              <button
                onClick={() => onNavigate('srs')}
                className="w-full flex items-center justify-between text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <span>Bắt đầu ôn ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Bạn đã hoàn thành bài ôn hôm nay!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Chart - 7 Days Learning History */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Tiến độ học tập 7 ngày qua</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Số lượng từ vựng và lượt ôn tập được ghi nhận</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return `${parts[1]}/${parts[2]}`;
                    }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                    }}
                    labelFormatter={(label) => `Ngày ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="wordsLearned"
                    name="Từ vựng mới"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="reviewsCompleted"
                    name="Lượt ôn tập"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Chưa có dữ liệu biểu đồ. Hãy học bài để bắt đầu ghi nhận!
              </div>
            )}
          </div>
        </div>

        {/* Quick Management & Mastery Breakdown */}
        <div className="space-y-4 flex flex-col">
          {/* Quick Add Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-soft">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-400" />
              <span>Thêm nhanh nội dung</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Tự cập nhật kiến thức bạn vừa học từ giáo trình
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={onQuickAddVocab}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Từ vựng</span>
              </button>
              <button
                onClick={onQuickAddGrammar}
                className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Ngữ pháp</span>
              </button>
            </div>
          </div>

          {/* Mastery Rate Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Tỷ lệ ghi nhớ từ vựng</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tiến độ chuyển sang trạng thái "Đã thuộc"</p>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <span className="text-4xl font-extrabold text-blue-600">{vocabProgressPercent}%</span>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.masteredVocab} / {stats.totalVocab} từ đã thuộc
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 flex items-center justify-center font-bold text-sm text-blue-700">
                  {vocabProgressPercent}%
                </div>
              </div>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Đã thuộc
                  </span>
                  <span className="font-semibold">{stats.masteredVocab} từ</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Đang học
                  </span>
                  <span className="font-semibold">{stats.learningVocab} từ</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                    Chưa học
                  </span>
                  <span className="font-semibold">{stats.notLearnedVocab} từ</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('vocabulary')}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-between"
            >
              <span>Xem toàn bộ từ vựng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recently Added Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vocabularies */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Từ vựng vừa thêm gần đây</span>
            </h3>
            <button
              onClick={() => onNavigate('vocabulary')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.recentVocab && stats.recentVocab.length > 0 ? (
              stats.recentVocab.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => speakKorean(v.korean)}
                      title="Nghe phát âm"
                      className="p-2 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-700 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-korean text-base">
                          {v.korean}
                        </span>
                        {v.hanja && (
                          <span className="text-xs text-slate-400 font-normal">({v.hanja})</span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {v.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{v.vietnamese}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      v.status === 'MASTERED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : v.status === 'LEARNING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {v.status === 'MASTERED'
                      ? 'Đã thuộc'
                      : v.status === 'LEARNING'
                      ? 'Đang học'
                      : 'Chưa học'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có từ vựng nào.</p>
            )}
          </div>
        </div>

        {/* Recent Grammar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Ngữ pháp vừa thêm gần đây</span>
            </h3>
            <button
              onClick={() => onNavigate('grammar')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.recentGrammar && stats.recentGrammar.length > 0 ? (
              stats.recentGrammar.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition flex items-center justify-between group"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-korean text-indigo-900">
                        {g.structure}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{g.meaning}</p>
                    <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                      VD: {g.exampleKorean}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      g.status === 'MASTERED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : g.status === 'LEARNING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {g.status === 'MASTERED'
                      ? 'Đã vững'
                      : g.status === 'LEARNING'
                      ? 'Đang học'
                      : 'Chưa học'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có ngữ pháp nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
