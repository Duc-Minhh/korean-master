'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Volume2,
  Edit2,
  Trash2,
  Star,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Vocabulary, Topic, Lesson, PartOfSpeech, LearningStatus } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';
import * as XLSX from 'xlsx';

interface VocabularyManagerProps {
  topics: Topic[];
  lessons: Lesson[];
  initialQuickAdd?: boolean;
}

const PARTS_OF_SPEECH: PartOfSpeech[] = [
  'Danh từ',
  'Động từ',
  'Tính từ',
  'Trạng từ',
  'Đại từ',
  'Số từ',
  'Thán từ',
  'Liên từ',
  'Cụm từ',
  'Khác',
];

export default function VocabularyManager({ topics, lessons }: VocabularyManagerProps) {
  const { showToast } = useToast();

  // Data states
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedLesson, setSelectedLesson] = useState('all');
  const [selectedPOS, setSelectedPOS] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContinuousAdd, setIsContinuousAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<Vocabulary | null>(null);
  const [deletingItem, setDeletingItem] = useState<Vocabulary | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    korean: '',
    hanja: '',
    vietnamese: '',
    partOfSpeech: 'Danh từ',
    exampleKorean: '',
    exampleVietnamese: '',
    notes: '',
    topicId: '',
    lessonId: '',
    status: 'NOT_LEARNED' as LearningStatus,
  });

  // Import state
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importTopicId, setImportTopicId] = useState('');
  const [importLessonId, setImportLessonId] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Fetch vocabulary list
  const fetchVocab = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        search,
        topicId: selectedTopic,
        lessonId: selectedLesson,
        partOfSpeech: selectedPOS,
        status: selectedStatus,
        sort: sortBy,
      });

      const res = await fetch(`/api/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải từ vựng');
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      showToast('Lỗi khi tải danh sách từ vựng', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTopic, selectedLesson, selectedPOS, selectedStatus, sortBy, showToast]);

  useEffect(() => {
    fetchVocab();
  }, [fetchVocab]);

  // Handle Form Submit (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.korean.trim() || !formData.vietnamese.trim()) {
      showToast('Vui lòng nhập từ tiếng Hàn và nghĩa tiếng Việt', 'error');
      return;
    }

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`/api/vocabulary/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Cập nhật thất bại');
        showToast('Cập nhật từ vựng thành công!', 'success');
        setEditingItem(null);
        setIsAddModalOpen(false);
      } else {
        // Add new
        const res = await fetch('/api/vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Thêm từ vựng thất bại');
        showToast('Đã thêm từ vựng mới!', 'success');

        if (isContinuousAdd) {
          // Reset only word fields, keep topic and lesson for fast entry
          setFormData((prev) => ({
            ...prev,
            korean: '',
            hanja: '',
            vietnamese: '',
            exampleKorean: '',
            exampleVietnamese: '',
            notes: '',
          }));
        } else {
          setIsAddModalOpen(false);
          resetForm();
        }
      }
      fetchVocab();
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      korean: '',
      hanja: '',
      vietnamese: '',
      partOfSpeech: 'Danh từ',
      exampleKorean: '',
      exampleVietnamese: '',
      notes: '',
      topicId: '',
      lessonId: '',
      status: 'NOT_LEARNED',
    });
    setEditingItem(null);
  };

  const openEditModal = (item: Vocabulary) => {
    setEditingItem(item);
    setFormData({
      korean: item.korean,
      hanja: item.hanja || '',
      vietnamese: item.vietnamese,
      partOfSpeech: item.partOfSpeech,
      exampleKorean: item.exampleKorean || '',
      exampleVietnamese: item.exampleVietnamese || '',
      notes: item.notes || '',
      topicId: item.topicId || '',
      lessonId: item.lessonId || '',
      status: item.status,
    });
    setIsContinuousAdd(false);
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/vocabulary/${deletingItem.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Không thể xóa từ vựng');
      showToast('Đã xóa từ vựng thành công', 'success');
      setDeletingItem(null);
      fetchVocab();
    } catch (err) {
      showToast('Lỗi khi xóa từ vựng', 'error');
    }
  };

  const handleToggleFavorite = async (item: Vocabulary) => {
    try {
      const res = await fetch(`/api/vocabulary/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, isFavorite: !v.isFavorite } : v))
        );
        showToast(item.isFavorite ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích', 'info');
      }
    } catch (e) {
      showToast('Lỗi cập nhật yêu thích', 'error');
    }
  };

  const handleQuickStatusChange = async (item: Vocabulary, newStatus: LearningStatus) => {
    try {
      const res = await fetch(`/api/vocabulary/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((v) => (v.id === item.id ? { ...v, status: newStatus } : v))
        );
        showToast('Đã đổi trạng thái từ vựng', 'success');
      }
    } catch (e) {
      showToast('Lỗi đổi trạng thái', 'error');
    }
  };

  // Helper to flexibly match column names regardless of accents, spaces, or slashes
  const getFlexibleValue = (row: Record<string, any>, candidateKeywords: string[]): string => {
    const clean = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric

    const cleanedCandidates = candidateKeywords.map(clean);

    for (const [key, val] of Object.entries(row)) {
      if (val === undefined || val === null) continue;
      const cleanedKey = clean(key);
      for (const cand of cleanedCandidates) {
        if (cleanedKey === cand || cleanedKey.includes(cand) || cand.includes(cleanedKey)) {
          return String(val).trim();
        }
      }
    }
    return '';
  };

  // Download Sample Excel Template
  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        'Từ tiếng Hàn': '경영학',
        'Phiên âm / Hán Hàn': 'gyeong-yeong-hak',
        'Nghĩa tiếng Việt': 'Quản trị kinh doanh',
        'Từ loại': 'Danh từ',
        'Ví dụ tiếng Hàn': '저는 경영학을 공부합니다.',
        'Dịch nghĩa câu ví dụ': 'Tôi học ngành quản trị kinh doanh.',
        'Ghi chú': 'Gốc Hán: KINH DOANH HỌC (經營學)',
      },
      {
        'Từ tiếng Hàn': '선생님',
        'Phiên âm / Hán Hàn': 'seon-saeng-nim',
        'Nghĩa tiếng Việt': 'Giáo viên, thầy/cô giáo',
        'Từ loại': 'Danh từ',
        'Ví dụ tiếng Hàn': '선생님께서 한국어를 가르치십니다.',
        'Dịch nghĩa câu ví dụ': 'Thầy giáo dạy tiếng Hàn Quốc.',
        'Ghi chú': 'Kính ngữ 님',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Tu_Vung');
    XLSX.writeFile(wb, 'Mau_Nhap_Tu_Vung_Tieng_Han.xlsx');
  };

  // Import file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Normalize keys intelligently with flexible matching
        const formatted = data.map((row: any) => ({
          korean: getFlexibleValue(row, ['tutienghan', 'tienghan', 'korean', 'tu', 'word']),
          hanja: getFlexibleValue(row, [
            'phienamhanhan',
            'phienam',
            'hanhan',
            'hanja',
            'phatam',
            'cachdoc',
            'pronunciation',
            'romanization',
          ]),
          vietnamese: getFlexibleValue(row, [
            'nghiatiengviet',
            'nghiaviet',
            'vietnamese',
            'nghia',
            'meaning',
          ]),
          partOfSpeech:
            getFlexibleValue(row, ['tuloai', 'loaitu', 'partofspeech', 'pos', 'type']) ||
            'Danh từ',
          exampleKorean: getFlexibleValue(row, [
            'vidutienghan',
            'viduhan',
            'vidu',
            'examplekorean',
            'cauvidu',
            'example',
          ]),
          exampleVietnamese: getFlexibleValue(row, [
            'dichnghiacauvidu',
            'dichnghiavidu',
            'dichcauvidu',
            'dichvidu',
            'dichcau',
            'nghiacauvidu',
            'nghiavidu',
            'dichnghia',
            'dich',
            'examplevietnamese',
            'translation',
          ]),
          notes: getFlexibleValue(row, [
            'ghichucanhan',
            'ghichu',
            'chuthich',
            'meonho',
            'notes',
            'note',
          ]),
        })).filter((item: any) => item.korean && item.vietnamese);

        if (formatted.length === 0) {
          showToast('File không có dữ liệu hợp lệ (Cần cột "Từ tiếng Hàn" và "Nghĩa tiếng Việt")', 'error');
          return;
        }

        setImportPreview(formatted);
        showToast(`Đã đọc ${formatted.length} từ vựng từ file`, 'info');
      } catch (err) {
        showToast('Lỗi đọc file Excel/CSV. Vui lòng kiểm tra định dạng!', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/vocabulary/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: importPreview,
          topicId: importTopicId || undefined,
          lessonId: importLessonId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Nhập dữ liệu thất bại');
      const data = await res.json();
      showToast(`Đã nhập thành công ${data.count} từ vựng vào kho!`, 'success');
      setIsImportModalOpen(false);
      setImportPreview([]);
      fetchVocab();
    } catch (err) {
      showToast('Lỗi khi nhập dữ liệu từ vựng', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Quản lý từ vựng</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng cộng <span className="font-bold text-slate-800">{total}</span> từ vựng đã được lưu trữ trong cơ sở dữ liệu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Add Button */}
          <button
            onClick={() => {
              resetForm();
              setIsContinuousAdd(false);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm từ vựng</span>
          </button>

          {/* Continuous Add Button */}
          <button
            onClick={() => {
              resetForm();
              setIsContinuousAdd(true);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm border border-indigo-200 transition"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Thêm liên tiếp</span>
          </button>

          {/* Import Excel/CSV Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Nhập file</span>
          </button>

          {/* Export Dropdown / Button */}
          <a
            href="/api/vocabulary/export?format=xlsx"
            download
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Xuất Excel</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm tiếng Hàn, nghĩa Việt, phiên âm..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Topic Filter */}
          <div>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setSelectedLesson(e.target.value);
                setPage(1);
              }}
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

          {/* Part of Speech Filter */}
          <div>
            <select
              value={selectedPOS}
              onChange={(e) => {
                setSelectedPOS(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Tất cả từ loại</option>
              {PARTS_OF_SPEECH.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="NOT_LEARNED">Chưa học</option>
              <option value="LEARNING">Đang học</option>
              <option value="MASTERED">Đã thuộc</option>
            </select>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Hiển thị {items.length} / {total} từ
          </span>
          <div className="flex items-center gap-2">
            <span>Sắp xếp theo:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-medium text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="date_desc">Mới thêm gần đây</option>
              <option value="date_asc">Cũ nhất trước</option>
              <option value="korean_asc">Tiếng Hàn (ㄱ - ㅎ)</option>
              <option value="vietnamese_asc">Nghĩa tiếng Việt (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vocabulary List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải danh sách từ vựng...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-semibold text-slate-700">Không tìm thấy từ vựng nào</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Chưa có từ nào khớp với bộ lọc hoặc cơ sở dữ liệu đang trống. Hãy thêm từ vựng mới hoặc nhập từ file!
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm từ vựng ngay</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">⭐</th>
                  <th className="py-3.5 px-4">Từ tiếng Hàn</th>
                  <th className="py-3.5 px-4">Nghĩa tiếng Việt</th>
                  <th className="py-3.5 px-4">Ví dụ minh họa</th>
                  <th className="py-3.5 px-4">Chủ đề & Bài</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((v) => (
                  <tr key={v.id} className="hover:bg-blue-50/30 transition group">
                    {/* Favorite toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleFavorite(v)}
                        className={`p-1 rounded-md transition ${
                          v.isFavorite
                            ? 'text-amber-400 hover:text-amber-500'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${v.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>

                    {/* Korean & Audio */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-korean text-base">
                          {v.korean}
                        </span>
                        <button
                          onClick={() => speakKorean(v.korean)}
                          title="Phát âm tiếng Hàn"
                          className="p-1 rounded-md hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.hanja && <span className="text-xs text-slate-400 font-mono">[{v.hanja}]</span>}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {v.partOfSpeech}
                        </span>
                      </div>
                    </td>

                    {/* Vietnamese & Notes */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{v.vietnamese}</div>
                      {v.notes && <p className="text-xs text-slate-400 italic mt-0.5">{v.notes}</p>}
                    </td>

                    {/* Example */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {v.exampleKorean ? (
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-800 font-korean line-clamp-2">
                            {v.exampleKorean}
                          </p>
                          <p className="text-[11px] text-slate-500 italic line-clamp-1">
                            {v.exampleVietnamese}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Chưa có ví dụ</span>
                      )}
                    </td>

                    {/* Topic & Lesson */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="space-y-1">
                        {v.topic && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {v.topic.name}
                          </span>
                        )}
                        {v.lesson && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {v.lesson.title}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={v.status}
                        onChange={(e) =>
                          handleQuickStatusChange(v, e.target.value as LearningStatus)
                        }
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border focus:outline-none transition ${
                          v.status === 'MASTERED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : v.status === 'LEARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="NOT_LEARNED">Chưa học</option>
                        <option value="LEARNING">Đang học</option>
                        <option value="MASTERED">Đã thuộc</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(v)}
                          title="Chỉnh sửa"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(v)}
                          title="Xóa"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Trang <span className="font-bold text-slate-800">{page}</span> / {totalPages}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm / Sửa từ vựng */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingItem ? 'Chỉnh sửa từ vựng' : isContinuousAdd ? 'Thêm từ vựng liên tiếp' : 'Thêm từ vựng mới'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isContinuousAdd
                    ? 'Nhập từ và nhấn "Lưu & Thêm tiếp" để nhập nhanh hàng loạt'
                    : 'Cập nhật từ vựng vào kho dữ liệu cá nhân của bạn'}
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Korean Word */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Từ tiếng Hàn <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={formData.korean}
                      onChange={(e) => setFormData({ ...formData, korean: e.target.value })}
                      placeholder="Ví dụ: 사과, 공부하다..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-korean font-semibold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {formData.korean && (
                      <button
                        type="button"
                        onClick={() => speakKorean(formData.korean)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Hanja / Pronunciation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Phiên âm / Hán Hàn
                  </label>
                  <input
                    type="text"
                    value={formData.hanja}
                    onChange={(e) => setFormData({ ...formData, hanja: e.target.value })}
                    placeholder="Ví dụ: sa-gwa hoặc 謝過"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vietnamese Meaning */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nghĩa tiếng Việt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vietnamese}
                    onChange={(e) => setFormData({ ...formData, vietnamese: e.target.value })}
                    placeholder="Ví dụ: Quả táo, xin lỗi..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Part of Speech */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Từ loại
                  </label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {PARTS_OF_SPEECH.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Example Korean */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ví dụ tiếng Hàn
                </label>
                <input
                  type="text"
                  value={formData.exampleKorean}
                  onChange={(e) => setFormData({ ...formData, exampleKorean: e.target.value })}
                  placeholder="Ví dụ: 저는 사과를 좋아합니다."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-korean text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Example Vietnamese */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Dịch nghĩa câu ví dụ
                </label>
                <input
                  type="text"
                  value={formData.exampleVietnamese}
                  onChange={(e) => setFormData({ ...formData, exampleVietnamese: e.target.value })}
                  placeholder="Ví dụ: Tôi thích ăn táo."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Topic */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Chưa chọn chủ đề --</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bài học
                  </label>
                  <select
                    value={formData.lessonId}
                    onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Chưa chọn bài học --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Trạng thái học
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as LearningStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="NOT_LEARNED">Chưa học</option>
                    <option value="LEARNING">Đang học</option>
                    <option value="MASTERED">Đã thuộc</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú cá nhân
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Mẹo nhớ từ, từ đồng nghĩa/trái nghĩa, quy tắc phát âm..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
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
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Lưu cập nhật' : isContinuousAdd ? 'Lưu & Thêm tiếp' : 'Thêm từ vựng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhập Excel / CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Nhập từ vựng hàng loạt (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Định dạng file yêu cầu:</span>
                  </p>
                  <p>
                    Các cột trong file: <b>Từ tiếng Hàn</b>, <b>Phiên âm / Hán Hàn</b>, <b>Nghĩa tiếng Việt</b>, <b>Từ loại</b>, <b>Ví dụ tiếng Hàn</b>, <b>Dịch nghĩa câu ví dụ</b>, <b>Ghi chú</b>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-100 text-blue-700 font-bold border border-blue-300 text-xs shadow-2xs transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tải file Excel mẫu chuẩn</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 transition cursor-pointer relative bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Kéo thả file Excel hoặc nhấn để chọn file
                </p>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ .xlsx, .xls, .csv</p>
              </div>

              {/* Destination Topic & Lesson */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gán vào chủ đề (tùy chọn):
                  </label>
                  <select
                    value={importTopicId}
                    onChange={(e) => setImportTopicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="">-- Để trống hoặc theo file --</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gán vào bài học (tùy chọn):
                  </label>
                  <select
                    value={importLessonId}
                    onChange={(e) => setImportLessonId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                  >
                    <option value="">-- Để trống hoặc theo file --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase mb-2">
                    Xem trước ({importPreview.length} từ hợp lệ):
                  </p>
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="p-2">Tiếng Hàn</th>
                          <th className="p-2">Phiên âm / Hán</th>
                          <th className="p-2">Nghĩa Việt</th>
                          <th className="p-2">Từ loại</th>
                          <th className="p-2">Ví dụ tiếng Hàn</th>
                          <th className="p-2">Dịch câu ví dụ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 10).map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold font-korean">{row.korean}</td>
                            <td className="p-2 text-slate-500 font-mono">{row.hanja || '-'}</td>
                            <td className="p-2 font-medium text-slate-900">{row.vietnamese}</td>
                            <td className="p-2 text-slate-600">{row.partOfSpeech}</td>
                            <td className="p-2 font-korean truncate max-w-[140px]">{row.exampleKorean || '-'}</td>
                            <td className="p-2 italic text-slate-600 truncate max-w-[140px]">{row.exampleVietnamese || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.length > 10 && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      ... và {importPreview.length - 10} từ vựng khác
                    </p>
                  )}
                </div>
              )}

              {/* Import Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportPreview([]);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <span>Đang nhập dữ liệu...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác nhận nhập ({importPreview.length} từ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-md p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa từ vựng?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa từ <span className="font-bold text-slate-800">"{deletingItem.korean}"</span> ({deletingItem.vietnamese})? Hành động này sẽ xóa vĩnh viễn khỏi cơ sở dữ liệu.
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
