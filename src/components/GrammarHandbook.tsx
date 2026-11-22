'use client';

import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Search,
  Star,
  Volume2,
  BookOpen,
  Filter,
  Columns,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { Grammar, Topic, Lesson } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';

interface GrammarHandbookProps {
  topics: Topic[];
  lessons: Lesson[];
}

export default function GrammarHandbook({ topics, lessons }: GrammarHandbookProps) {
  const { showToast } = useToast();

  const [items, setItems] = useState<Grammar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedGrammar, setSelectedGrammar] = useState<Grammar | null>(null);

  // Compare mode
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<Grammar[]>([]);

  useEffect(() => {
    const fetchHandbook = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search,
          status: statusFilter,
          ...(filterFavorite && { isFavorite: 'true' }),
        });
        const res = await fetch(`/api/grammar?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể tải sổ tay ngữ pháp');
        const data = await res.json();
        setItems(data.items || []);
        if (data.items?.length > 0 && !selectedGrammar) {
          setSelectedGrammar(data.items[0]);
        }
      } catch (err) {
        showToast('Lỗi tải sổ tay ngữ pháp', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchHandbook();
  }, [search, filterFavorite, statusFilter, showToast]);

  const toggleFavorite = async (g: Grammar) => {
    try {
      const res = await fetch(`/api/grammar/${g.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !g.isFavorite }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === g.id ? { ...item, isFavorite: !item.isFavorite } : item))
        );
        if (selectedGrammar?.id === g.id) {
          setSelectedGrammar({ ...selectedGrammar, isFavorite: !selectedGrammar.isFavorite });
        }
      }
    } catch (e) {
      showToast('Lỗi cập nhật yêu thích', 'error');
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) {
        showToast('Tối đa so sánh 3 cấu trúc cùng lúc', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  const openCompareModal = async () => {
    if (compareIds.length < 2) {
      showToast('Chọn ít nhất 2 cấu trúc để so sánh', 'info');
      return;
    }
    try {
      const res = await fetch(`/api/grammar/compare?ids=${compareIds.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        setCompareItems(data.items);
        setCompareModalOpen(true);
      }
    } catch (e) {
      showToast('Lỗi so sánh', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Handbook Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 mb-2">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sổ tay tra cứu & Học tập Ngữ pháp</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sổ tay ngữ pháp</h1>
          <p className="text-sm text-slate-500 mt-1">
            Không gian chuyên biệt để đọc, nghiền ngẫm công thức, đánh dấu yêu thích và so sánh các cấu trúc ngữ pháp.
          </p>
        </div>

        {compareIds.length > 0 && (
          <button
            onClick={openCompareModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition animate-in zoom-in-95"
          >
            <Columns className="w-4 h-4" />
            <span>So sánh các ngữ pháp đã chọn ({compareIds.length})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tra cứu cấu trúc ngữ pháp..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Favorite filter toggle */}
          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              filterFavorite
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Đã đánh dấu yêu thích</span>
          </button>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="MASTERED">Đã nắm vững</option>
            <option value="LEARNING">Đang học</option>
            <option value="NOT_LEARNED">Chưa học</option>
          </select>
        </div>
      </div>

      {/* Two-Column Handbook Layout (Master - Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Grammar Cards List */}
        <div className="lg:col-span-5 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Đang tải sổ tay...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Không tìm thấy cấu trúc ngữ pháp nào
            </div>
          ) : (
            items.map((g) => {
              const isSelected = selectedGrammar?.id === g.id;
              const isComparing = compareIds.includes(g.id);
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGrammar(g)}
                  className={`p-4 rounded-2xl border cursor-pointer transition text-left flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(g);
                        }}
                        className="text-slate-300 hover:text-amber-400 transition"
                      >
                        <Star className={`w-4 h-4 ${g.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <h3 className="font-extrabold text-base font-korean text-indigo-950">
                        {g.structure}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        g.status === 'MASTERED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : g.status === 'LEARNING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {g.status === 'MASTERED' ? 'Đã vững' : g.status === 'LEARNING' ? 'Đang học' : 'Chưa học'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-1 mt-1.5">{g.meaning}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 italic">VD: {g.exampleKorean}</p>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{g.topic?.name || 'Ngữ pháp chung'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompare(g.id);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                        isComparing
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isComparing ? 'Đã chọn so sánh' : '+ So sánh'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Grammar Reader */}
        <div className="lg:col-span-7">
          {selectedGrammar ? (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-soft space-y-6 sticky top-6">
              {/* Reader Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 font-korean">
                      {selectedGrammar.structure}
                    </h2>
                    <button
                      onClick={() => toggleFavorite(selectedGrammar)}
                      className="p-1 rounded-md text-slate-300 hover:text-amber-400"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          selectedGrammar.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-base font-bold text-slate-800 mt-1">{selectedGrammar.meaning}</p>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    selectedGrammar.status === 'MASTERED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedGrammar.status === 'LEARNING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {selectedGrammar.status === 'MASTERED'
                    ? 'Đã nắm vững'
                    : selectedGrammar.status === 'LEARNING'
                    ? 'Đang học'
                    : 'Chưa học'}
                </span>
              </div>

              {/* Usage Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  1. Cách sử dụng & Ngữ cảnh
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedGrammar.usage}
                </p>
              </div>

              {/* Formation Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  2. Công thức kết hợp (V / A / N)
                </h4>
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-indigo-950 font-semibold leading-relaxed">
                    {selectedGrammar.formation}
                  </pre>
                </div>
              </div>

              {/* Exceptions if any */}
              {selectedGrammar.exceptions && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    3. Lưu ý & Trường hợp đặc biệt
                  </h4>
                  <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                    {selectedGrammar.exceptions}
                  </p>
                </div>
              )}

              {/* Example Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    4. Ví dụ câu thực tế
                  </h4>
                  <button
                    onClick={() => speakKorean(selectedGrammar.exampleKorean)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Phát âm câu</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 space-y-1">
                  <p className="text-sm sm:text-base font-bold font-korean text-slate-900">
                    {selectedGrammar.exampleKorean}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 italic">
                    {selectedGrammar.exampleVietnamese}
                  </p>
                </div>
              </div>

              {/* Similar Grammars */}
              {selectedGrammar.similarGrammar && (
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800">Cấu trúc tương tự / Dễ nhầm lẫn:</span>{' '}
                  {selectedGrammar.similarGrammar}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
              Chọn một cấu trúc ngữ pháp ở bên trái để xem nội dung chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Columns className="w-5 h-5 text-indigo-600" />
                <span>So sánh cấu trúc ngữ pháp</span>
              </h3>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compareItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3">
                    <h4 className="text-lg font-black text-indigo-950 font-korean">{item.structure}</h4>
                    <p className="text-xs font-bold text-slate-800">{item.meaning}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.usage}</p>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-[10px] text-slate-400 uppercase">Công thức:</span>
                      <pre className="whitespace-pre-wrap font-sans mt-0.5 text-indigo-950 font-medium">
                        {item.formation}
                      </pre>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                      <p className="font-bold font-korean text-slate-900">{item.exampleKorean}</p>
                      <p className="text-slate-500 italic">{item.exampleVietnamese}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
