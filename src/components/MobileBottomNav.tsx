'use client';

import React from 'react';
import { LayoutDashboard, BookOpen, Layers, Brain, Menu } from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenMenu: () => void;
  dueReviewsCount: number;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenMenu,
  dueReviewsCount,
}: MobileBottomNavProps) {
  const items = [
    { id: 'dashboard' as NavTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'vocabulary' as NavTab, label: 'Từ vựng', icon: BookOpen },
    { id: 'flashcards' as NavTab, label: 'Flashcard', icon: Layers },
    {
      id: 'srs' as NavTab,
      label: 'Ôn tập',
      icon: Brain,
      badge: dueReviewsCount > 0 ? dueReviewsCount : undefined,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-colors relative ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Menu Drawer Toggle */}
        <button
          onClick={onOpenMenu}
          className="flex-1 py-1.5 flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-0.5 tracking-tight">Thêm nữa</span>
        </button>
      </div>
    </nav>
  );
}
