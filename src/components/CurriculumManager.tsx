'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Tag,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Textbook, Chapter, Lesson, Topic } from '@/types';
import { useToast } from './Toast';

export default function CurriculumManager() {
  const { showToast } = useToast();

  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Modals
  const [modalType, setModalType] = useState<'textbook' | 'chapter' | 'lesson' | 'topic' | null>(null);
  const [parentId, setParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [levelInput, setLevelInput] = useState('Sơ cấp 1');
  const [descInput, setDescInput] = useState('');

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const [tbRes, tpRes] = await Promise.all([
        fetch('/api/curriculum'),
        fetch('/api/topics'),
      ]);
      if (tbRes.ok && tpRes.ok) {
        const tbData = await tbRes.json();
        const tpData = await tpRes.json();
        setTextbooks(tbData.textbooks || []);
        setTopics(tpData.topics || []);

        // Expand chapters by default
        const exp: Record<string, boolean> = {};
        tbData.textbooks?.forEach((tb: Textbook) => {
          tb.chapters?.forEach((ch) => {
            exp[ch.id] = true;
          });
        });
        setExpandedChapters(exp);
      }
    } catch (err) {
      showToast('Lỗi tải dữ liệu giáo trình', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleOpenAdd = (type: 'textbook' | 'chapter' | 'lesson' | 'topic', parent = '') => {
    setModalType(type);
    setParentId(parent);
    setEditingId(null);
    setTitleInput('');
    setDescInput('');
    setLevelInput('Sơ cấp 1');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      showToast('Vui lòng nhập tên/tiêu đề', 'error');
      return;
    }

    try {
      if (modalType === 'topic') {
        const res = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: titleInput.trim(), description: descInput.trim() }),
        });
        if (!res.ok) throw new Error('Không thể thêm chủ đề');
        showToast('Thêm chủ đề thành công!', 'success');
      } else {
        const res = await fetch('/api/curriculum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: modalType,
            title: titleInput.trim(),
            level: levelInput,
            description: descInput.trim(),
            ...(modalType === 'chapter' && { textbookId: parentId }),
            ...(modalType === 'lesson' && { chapterId: parentId }),
          }),
        });
        if (!res.ok) throw new Error('Không thể tạo mới');
        showToast('Tạo mới thành công!', 'success');
      }

      setModalType(null);
      fetchCurriculum();
    } catch (err: any) {
      showToast(err.message || 'Lỗi thao tác', 'error');
    }
  };

  const handleDeleteItem = async (
    type: 'textbook' | 'chapter' | 'lesson',
    id: string,
    name: string,
    counts?: { vocabCount?: number; grammarCount?: number }
  ) => {
    let confirmMsg = `Bạn có chắc chắn muốn xóa "${name}"?`;
    if (type === 'lesson') {
      const vText = counts?.vocabCount ? `${counts.vocabCount} từ vựng` : '';
      const gText = counts?.grammarCount ? `${counts.grammarCount} ngữ pháp` : '';
      const detail = [vText, gText].filter(Boolean).join(' và ');
      confirmMsg = `Bạn có chắc chắn muốn xóa bài học "${name}"?\nToàn bộ ${
        detail ? `${detail} thuộc bài học này` : 'từ vựng và ngữ pháp liên kết'
      } cũng sẽ bị xóa vĩnh viễn khỏi hệ thống!`;
    } else if (type === 'chapter') {
      confirmMsg = `Bạn có chắc chắn muốn xóa chương "${name}"?\nToàn bộ các bài học, từ vựng và ngữ pháp thuộc chương này sẽ bị xóa vĩnh viễn!`;
    } else if (type === 'textbook') {
      confirmMsg = `Bạn có chắc chắn muốn xóa giáo trình "${name}"?\nToàn bộ chương, bài học, từ vựng và ngữ pháp thuộc giáo trình này sẽ bị xóa vĩnh viễn!`;
    }

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(`/api/curriculum/${id}?type=${type}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Xóa thất bại');
      showToast('Đã xóa thành công và dọn sạch dữ liệu liên kết', 'success');
      fetchCurriculum();
    } catch (err) {
      showToast('Lỗi khi xóa', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 mb-2">
            <FolderTree className="w-3.5 h-3.5 text-blue-600" />
            <span>Cấu trúc Giáo trình & Chủ đề</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản lý bài học</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tự do tổ chức phân cấp: Giáo trình → Chương → Bài học và Chủ đề để hệ thống hóa kiến thức.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('topic')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>+ Chủ đề mới</span>
          </button>
          <button
            onClick={() => handleOpenAdd('textbook')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Giáo trình mới</span>
          </button>
        </div>
      </div>

      {/* Topics Summary Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft space-y-3">
        <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-600" />
          <span>Danh sách các chủ đề ({topics.length})</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <span
              key={t.id}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-2"
            >
              <span>{t.name}</span>
              <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border">
                {t._count?.vocabularies || 0} từ
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hierarchical Textbooks Tree */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Đang tải cấu trúc bài học...</div>
        ) : textbooks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">Chưa có giáo trình nào</p>
            <button
              onClick={() => handleOpenAdd('textbook')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Thêm giáo trình đầu tiên
            </button>
          </div>
        ) : (
          textbooks.map((tb) => (
            <div
              key={tb.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
            >
              {/* Textbook Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {tb.level}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight">{tb.title}</h3>
                  </div>
                  {tb.description && (
                    <p className="text-xs text-slate-300 mt-1">{tb.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('chapter', tb.id)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur transition"
                  >
                    + Thêm chương
                  </button>
                  <button
                    onClick={() => handleDeleteItem('textbook', tb.id, tb.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chapters List */}
              <div className="divide-y divide-slate-100 p-2">
                {tb.chapters && tb.chapters.length > 0 ? (
                  tb.chapters.map((ch) => {
                    const isExpanded = expandedChapters[ch.id];
                    return (
                      <div key={ch.id} className="p-3">
                        {/* Chapter Row */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleChapter(ch.id)}
                            className="flex items-center gap-2 text-left font-bold text-sm text-slate-800 hover:text-blue-600 transition"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{ch.title}</span>
                            <span className="text-xs font-normal text-slate-400">
                              ({ch.lessons?.length || 0} bài học)
                            </span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenAdd('lesson', ch.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                            >
                              + Thêm bài học
                            </button>
                            <button
                              onClick={() => handleDeleteItem('chapter', ch.id, ch.title)}
                              className="text-slate-300 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Lessons List inside Chapter */}
                        {isExpanded && ch.lessons && (
                          <div className="mt-2 ml-6 pl-3 border-l-2 border-slate-100 space-y-1.5">
                            {ch.lessons.length === 0 ? (
                              <p className="text-xs text-slate-400 py-1 italic">
                                Chưa có bài học nào trong chương này
                              </p>
                            ) : (
                              ch.lessons.map((ls) => (
                                <div
                                  key={ls.id}
                                  className="p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs transition"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="font-semibold text-slate-800">{ls.title}</span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400">
                                      {ls._count?.vocabularies || 0} từ • {ls._count?.grammars || 0} ngữ pháp
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleDeleteItem('lesson', ls.id, ls.title, {
                                          vocabCount: ls._count?.vocabularies,
                                          grammarCount: ls._count?.grammars,
                                        })
                                      }
                                      className="text-slate-300 hover:text-rose-600 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="p-4 text-xs text-slate-400 text-center italic">
                    Chưa có chương nào. Nhấn "+ Thêm chương" ở góc trên để tạo.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add Item */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {modalType === 'textbook'
                  ? 'Thêm giáo trình mới'
                  : modalType === 'chapter'
                  ? 'Thêm chương mới'
                  : modalType === 'lesson'
                  ? 'Thêm bài học mới'
                  : 'Thêm chủ đề mới'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên / Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Ví dụ: Tiếng Hàn Tổng Hợp 1, Bài 1..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {modalType === 'textbook' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cấp độ
                  </label>
                  <select
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
                  >
                    <option value="Sơ cấp 1">Sơ cấp 1</option>
                    <option value="Sơ cấp 2">Sơ cấp 2</option>
                    <option value="Trung cấp 1">Trung cấp 1</option>
                    <option value="Trung cấp 2">Trung cấp 2</option>
                    <option value="Cao cấp">Cao cấp</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả / Ghi chú
                </label>
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Mô tả tóm tắt..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
