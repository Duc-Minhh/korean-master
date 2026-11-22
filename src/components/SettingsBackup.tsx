'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Save,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { UserSetting } from '@/types';
import { useToast } from './Toast';

export default function SettingsBackup() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<UserSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Targets
  const [wordsTarget, setWordsTarget] = useState(10);
  const [reviewTarget, setReviewTarget] = useState(15);
  const [userName, setUserName] = useState('');
  const [theme, setTheme] = useState('light');

  // Backup restore file state
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setWordsTarget(data.targetWordsPerDay || 10);
          setReviewTarget(data.targetReviewPerDay || 15);
          setUserName(data.name || 'Người học tiếng Hàn');
          setTheme(data.theme || 'light');
        }
      } catch (e) {
        showToast('Lỗi tải cài đặt', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showToast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          targetWordsPerDay: wordsTarget,
          targetReviewPerDay: reviewTarget,
          theme,
        }),
      });
      if (!res.ok) throw new Error('Không thể lưu cài đặt');
      showToast('Đã lưu cấu hình học tập thành công!', 'success');
    } catch (err) {
      showToast('Lỗi lưu cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      showToast('Vui lòng chọn file JSON sao lưu', 'error');
      return;
    }

    if (!confirm('Khôi phục sẽ thay thế dữ liệu hiện tại bằng dữ liệu từ file sao lưu. Bạn có muốn tiếp tục?')) {
      return;
    }

    setRestoring(true);
    try {
      const text = await backupFile.text();
      const backupData = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupData }),
      });

      if (!res.ok) throw new Error('Khôi phục dữ liệu thất bại');
      showToast('Khôi phục dữ liệu thành công! Trang sẽ làm mới.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khôi phục sao lưu', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleCleanData = async () => {
    if (!confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ từ vựng và ngữ pháp do bạn nhập. Bạn có chắc chắn muốn xóa sạch?')) {
      return;
    }

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean_all' }),
      });

      if (!res.ok) throw new Error('Xóa thất bại');
      showToast('Đã xóa sạch dữ liệu từ vựng và ngữ pháp.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      showToast('Lỗi khi xóa sạch dữ liệu', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settings Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Cài đặt & Sao lưu dữ liệu
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Thiết lập mục tiêu học mỗi ngày, bảo vệ và xuất nhập dữ liệu học tập cá nhân.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Study Goals Config */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Mục tiêu học tập hàng ngày</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tên hiển thị người học
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Giao diện màu sắc
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none"
            >
              <option value="light">Trắng & Xanh Navy hiện đại (Mặc định)</option>
              <option value="navy">Đậm sắc Navy Hàn Quốc</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mục tiêu từ vựng mới mỗi ngày
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={wordsTarget}
              onChange={(e) => setWordsTarget(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">Khuyến nghị: 10 - 20 từ mỗi ngày</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mục tiêu lượt ôn tập thẻ mỗi ngày
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={reviewTarget}
              onChange={(e) => setReviewTarget(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">Khuyến nghị: 15 - 30 lượt ôn mỗi ngày</p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt mục tiêu'}</span>
          </button>
        </div>
      </form>

      {/* Data Backup & Export Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Sao lưu & Xuất toàn bộ dữ liệu</span>
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Xuất toàn bộ cơ sở dữ liệu bao gồm từ vựng, ngữ pháp, giáo trình, bài học, lịch sử ôn tập SRS và kết quả thi để lưu trữ an toàn hoặc chuyển sang máy tính khác.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* JSON Full Backup */}
          <a
            href="/api/backup"
            download
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">Tải file sao lưu (JSON)</span>
              <span className="text-xs text-slate-400">Đầy đủ 100% dữ liệu quan hệ</span>
            </div>
          </a>

          {/* Excel Export */}
          <a
            href="/api/vocabulary/export?format=xlsx"
            download
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">Xuất từ vựng sang Excel</span>
              <span className="text-xs text-slate-400">File định dạng chuẩn .xlsx</span>
            </div>
          </a>
        </div>
      </div>

      {/* Restore & Danger Zone */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" />
          <span>Khôi phục dữ liệu từ file sao lưu</span>
        </h2>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <input
            type="file"
            accept=".json"
            onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-700 block w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button
            onClick={handleRestoreBackup}
            disabled={!backupFile || restoring}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition"
          >
            {restoring ? 'Đang khôi phục...' : 'Khôi phục từ file JSON'}
          </button>
        </div>

        {/* Danger Reset */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-rose-600 block">Xóa sạch từ vựng & ngữ pháp</span>
            <span className="text-slate-400">Đặt lại kho dữ liệu để bắt đầu nhập từ đầu</span>
          </div>
          <button
            onClick={handleCleanData}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition"
          >
            Xóa toàn bộ
          </button>
        </div>
      </div>
    </div>
  );
}
