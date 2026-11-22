'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Layers,
  Brain,
  Award,
  BookmarkCheck,
  Search,
  FolderTree,
  Settings,
  Flame,
  X,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'vocabulary'
  | 'grammar'
  | 'flashcards'
  | 'srs'
  | 'quiz'
  | 'handbook'
  | 'dictionary'
  | 'curriculum'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  streakCount: number;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  streakCount,
  isOpenMobile,
  setIsOpenMobile,
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'vocabulary' as NavTab, label: 'Quản lý từ vựng', icon: BookOpen },
    { id: 'grammar' as NavTab, label: 'Quản lý ngữ pháp', icon: FileText },
    { id: 'flashcards' as NavTab, label: 'Học Flashcard', icon: Layers },
    { id: 'srs' as NavTab, label: 'Ôn tập thông minh', icon: Brain, badge: 'SRS' },
    { id: 'quiz' as NavTab, label: 'Luyện tập & Kiểm tra', icon: Award },
    { id: 'handbook' as NavTab, label: 'Sổ tay ngữ pháp', icon: BookmarkCheck },
    { id: 'dictionary' as NavTab, label: 'Từ điển cá nhân', icon: Search },
    { id: 'curriculum' as NavTab, label: 'Quản lý bài học', icon: FolderTree },
    { id: 'settings' as NavTab, label: 'Cài đặt & Sao lưu', icon: Settings },
  ];

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              한
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                Korean Master
              </h1>
              <p className="text-xs text-blue-400 font-medium">나의 한국어 공부</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Học tập & Quản lý
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Streak & Daily Motivation Card */}
        <div className="p-4 border-t border-slate-800">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Chuỗi học liên tiếp</p>
                <p className="text-sm font-bold text-white">{streakCount} ngày liên tục</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
        </div>
      </aside>
    </>
  );
}
