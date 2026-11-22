'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Volume2,
  Edit2,
  Trash2,
  Star,
  Check,
  X,
  AlertCircle,
  Columns,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Grammar, Topic, Lesson, LearningStatus } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';

interface GrammarManagerProps {
  topics: Topic[];
  lessons: Lesson[];
}

export default function GrammarManager({ topics, lessons }: GrammarManagerProps) {
  const { showToast } = useToast();

  const [items, setItems] = useState<Grammar[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Grammar | null>(null);
  const [deletingItem, setDeletingItem] = useState<Grammar | null>(null);

  // Compare mode
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<Grammar[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    structure: '',
    meaning: '',
    usage: '',
    formation: '',
    exceptions: '',
    exampleKorean: '',
    exampleVietnamese: '',
    similarGrammar: '',
    notes: '',
    topicId: '',
    lessonId: '',
    status: 'NOT_LEARNED' as LearningStatus,
  });

  const fetchGrammar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        topicId: selectedTopic,
        lessonId: selectedLesson,
        status: selectedStatus,
      });

      const res = await fetch(`/api/grammar?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải ngữ pháp');
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      showToast('Lỗi tải danh sách ngữ pháp', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedTopic, selectedLesson, selectedStatus, showToast]);

  useEffect(() => {
    fetchGrammar();
  }, [fetchGrammar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.structure.trim() ||
      !formData.meaning.trim() ||
      !formData.usage.trim() ||
      !formData.formation.trim() ||
      !formData.exampleKorean.trim() ||
      !formData.exampleVietnamese.trim()
    ) {
      showToast('Vui lòng điền đầy đủ cấu trúc, ý nghĩa, cách dùng, công thức và ví dụ!', 'error');
      return;
    }

    try {
      if (editingItem) {
        const res = await fetch(`/api/grammar/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Cập nhật thất bại');
        showToast('Cập nhật ngữ pháp thành công!', 'success');
      } else {
        const res = await fetch('/api/grammar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Thêm ngữ pháp thất bại');
        showToast('Đã thêm cấu trúc ngữ pháp mới!', 'success');
      }

      setIsAddModalOpen(false);
      resetForm();
      fetchGrammar();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      structure: '',
      meaning: '',
      usage: '',
      formation: '',
      exceptions: '',
      exampleKorean: '',
      exampleVietnamese: '',
      similarGrammar: '',
      notes: '',
      topicId: '',
      lessonId: '',
      status: 'NOT_LEARNED',
    });
    setEditingItem(null);
  };

  const openEditModal = (item: Grammar) => {
    setEditingItem(item);
    setFormData({
      structure: item.structure,
      meaning: item.meaning,
      usage: item.usage,
      formation: item.formation,
      exceptions: item.exceptions || '',
      exampleKorean: item.exampleKorean,
      exampleVietnamese: item.exampleVietnamese,
      similarGrammar: item.similarGrammar || '',
      notes: item.notes || '',
      topicId: item.topicId || '',
      lessonId: item.lessonId || '',
      status: item.status,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/grammar/${deletingItem.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Không thể xóa ngữ pháp');
      showToast('Đã xóa ngữ pháp thành công', 'success');
      setDeletingItem(null);
      fetchGrammar();
    } catch (err) {
      showToast('Lỗi khi xóa ngữ pháp', 'error');
    }
  };

  const handleToggleFavorite = async (item: Grammar) => {
    try {
      const res = await fetch(`/api/grammar/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((g) => (g.id === item.id ? { ...g, isFavorite: !g.isFavorite } : g))
        );
        showToast(item.isFavorite ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích', 'info');
      }
    } catch (e) {
      showToast('Lỗi cập nhật yêu thích', 'error');
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          showToast('Chỉ có thể so sánh tối đa 3 ngữ pháp cùng lúc', 'info');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleOpenCompareModal = async () => {
    if (compareIds.length < 2) {
      showToast('Vui lòng chọn ít nhất 2 cấu trúc để so sánh', 'info');
      return;
    }

    try {
      const res = await fetch(`/api/grammar/compare?ids=${compareIds.join(',')}`);
      if (!res.ok) throw new Error('Không thể lấy dữ liệu so sánh');
      const data = await res.json();
      setCompareItems(data.items);
      setIsCompareModalOpen(true);
    } catch (err) {
      showToast('Lỗi so sánh ngữ pháp', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Quản lý ngữ pháp</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng cộng <span className="font-bold text-slate-800">{total}</span> cấu trúc ngữ pháp trong kho dữ liệu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Compare Button */}
          {compareIds.length > 0 && (
            <button
              onClick={handleOpenCompareModal}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition animate-in zoom-in-95"
            >
              <Columns className="w-4 h-4" />
              <span>So sánh ({compareIds.length})</span>
            </button>
          )}

          {/* Add Grammar Button */}
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ngữ pháp</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm cấu trúc, ý nghĩa, cách dùng..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Topic Filter */}
          <div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          <div>
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Tất cả bài học</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="NOT_LEARNED">Chưa học</option>
              <option value="LEARNING">Đang học</option>
              <option value="MASTERED">Đã nắm vững</option>
            </select>
          </div>
        </div>

        {compareIds.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-medium">
            <span>Đã chọn {compareIds.length} cấu trúc ngữ pháp để so sánh.</span>
            <button
              onClick={() => setCompareIds([])}
              className="text-slate-400 hover:text-slate-600 underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        )}
      </div>

      {/* Grammar Cards Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Đang tải danh sách ngữ pháp...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">Chưa tìm thấy ngữ pháp phù hợp</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy thêm các cấu trúc ngữ pháp bạn đã học trong giáo trình để tiện tra cứu và ôn tập!
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ngữ pháp ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((g) => {
            const isComparing = compareIds.includes(g.id);
            return (
              <div
                key={g.id}
                className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-soft hover:shadow-card relative ${
                  isComparing ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80'
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(g)}
                        className={`p-1 rounded-md transition ${
                          g.isFavorite
                            ? 'text-amber-400 hover:text-amber-500'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${g.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>
                      <h3 className="text-lg font-extrabold text-slate-900 font-korean tracking-tight text-indigo-900">
                        {g.structure}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          g.status === 'MASTERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : g.status === 'LEARNING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g.status === 'MASTERED'
                          ? 'Đã nắm vững'
                          : g.status === 'LEARNING'
                          ? 'Đang học'
                          : 'Chưa học'}
                      </span>
                      <button
                        onClick={() => openEditModal(g)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(g)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meaning & Usage */}
                  <div className="mt-2.5">
                    <p className="text-sm font-semibold text-slate-800">{g.meaning}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{g.usage}</p>
                  </div>

                  {/* Formation formula */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block">
                      Công thức kết hợp:
                    </span>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-indigo-900 font-medium">
                      {g.formation}
                    </pre>
                  </div>

                  {/* Exceptions if any */}
                  {g.exceptions && (
                    <div className="mt-2 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl">
                      <span className="font-bold">Lưu ý / Ngoại lệ:</span> {g.exceptions}
                    </div>
                  )}

                  {/* Example */}
                  <div className="mt-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-indigo-700 uppercase">
                        Ví dụ minh họa
                      </span>
                      <button
                        onClick={() => speakKorean(g.exampleKorean)}
                        className="p-1 text-indigo-500 hover:text-indigo-700 transition"
                        title="Nghe phát âm ví dụ"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 font-korean">
                      {g.exampleKorean}
                    </p>
                    <p className="text-xs text-slate-600 italic">{g.exampleVietnamese}</p>
                  </div>

                  {/* Similar Grammar */}
                  {g.similarGrammar && (
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Ngữ pháp tương tự / Dễ nhầm:</span>{' '}
                      {g.similarGrammar}
                    </div>
                  )}
                </div>

                {/* Footer: Tags and Compare Toggle */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {g.topic && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {g.topic.name}
                      </span>
                    )}
                    {g.lesson && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {g.lesson.title}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleCompare(g.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      isComparing
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>{isComparing ? 'Đang chọn' : 'So sánh'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa ngữ pháp */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingItem ? 'Chỉnh sửa ngữ pháp' : 'Thêm cấu trúc ngữ pháp mới'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lưu trữ chi tiết quy tắc kết hợp và các ví dụ thực tế
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Structure */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cấu trúc ngữ pháp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.structure}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                    placeholder="Ví dụ: -(으)려고 하다, -기 때문에..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-korean font-semibold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Meaning */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ý nghĩa tiếng Việt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.meaning}
                    onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                    placeholder="Ví dụ: Dự định làm gì, Vì... nên..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Usage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cách sử dụng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.usage}
                  onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                  placeholder="Dùng khi người nói dự định thực hiện một hành động nào đó trong tương lai gần..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Formation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Công thức kết hợp (V / A / N) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.formation}
                  onChange={(e) => setFormData({ ...formData, formation: e.target.value })}
                  placeholder="Động từ có patchim + 으려고 하다&#10;Động từ không có patchim + 려고 하다"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Exceptions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Điều kiện sử dụng / Trường hợp đặc biệt
                </label>
                <input
                  type="text"
                  value={formData.exceptions}
                  onChange={(e) => setFormData({ ...formData, exceptions: e.target.value })}
                  placeholder="Không dùng với thì quá khứ hoặc đuôi câu rủ rê/mệnh lệnh..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ví dụ tiếng Hàn <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.exampleKorean}
                    onChange={(e) => setFormData({ ...formData, exampleKorean: e.target.value })}
                    placeholder="Ví dụ: 이번 주말에 한국 영화를 보려고 해요."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-korean text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Dịch nghĩa ví dụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.exampleVietnamese}
                    onChange={(e) => setFormData({ ...formData, exampleVietnamese: e.target.value })}
                    placeholder="Ví dụ: Cuối tuần này tôi định xem phim Hàn Quốc."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Similar grammar & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngữ pháp tương tự / Dễ nhầm
                  </label>
                  <input
                    type="text"
                    value={formData.similarGrammar}
                    onChange={(e) => setFormData({ ...formData, similarGrammar: e.target.value })}
                    placeholder="-(으)ㄹ 것이다, -기로 하다..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ghi chú cá nhân
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Mẹo nhớ, lưu ý thi Topik..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Topic, Lesson, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="">-- Chưa chọn chủ đề --</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bài học
                  </label>
                  <select
                    value={formData.lessonId}
                    onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="">-- Chưa chọn bài học --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as LearningStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="NOT_LEARNED">Chưa học</option>
                    <option value="LEARNING">Đang học</option>
                    <option value="MASTERED">Đã nắm vững</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Lưu cập nhật' : 'Thêm ngữ pháp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: So sánh ngữ pháp (Side-by-side comparison) */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Bảng so sánh cấu trúc ngữ pháp ({compareItems.length})
                </h3>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compareItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3"
                  >
                    <div className="border-b border-indigo-100 pb-2">
                      <h4 className="text-lg font-black text-indigo-900 font-korean">
                        {item.structure}
                      </h4>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{item.meaning}</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        Cách sử dụng:
                      </span>
                      <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{item.usage}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        Công thức:
                      </span>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-indigo-950 mt-0.5 font-medium">
                        {item.formation}
                      </pre>
                    </div>

                    {item.exceptions && (
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold">Ngoại lệ:</span> {item.exceptions}
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Ví dụ:</span>
                      <p className="text-xs font-korean font-semibold text-slate-900">
                        {item.exampleKorean}
                      </p>
                      <p className="text-[11px] text-slate-600 italic">
                        {item.exampleVietnamese}
                      </p>
                    </div>

                    {item.similarGrammar && (
                      <div className="text-xs text-slate-500">
                        <span className="font-bold text-slate-700">Dễ nhầm với:</span>{' '}
                        {item.similarGrammar}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
              >
                Đóng so sánh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-md p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa ngữ pháp?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa cấu trúc <span className="font-bold text-slate-800">"{deletingItem.structure}"</span>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow transition"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
