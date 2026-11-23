'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar, { NavTab } from '@/components/Sidebar';
import DashboardView from '@/components/DashboardView';
import VocabularyManager from '@/components/VocabularyManager';
import GrammarManager from '@/components/GrammarManager';
import FlashcardStudy from '@/components/FlashcardStudy';
import SmartReviewSRS from '@/components/SmartReviewSRS';
import QuizPractice from '@/components/QuizPractice';
import GrammarHandbook from '@/components/GrammarHandbook';
import PersonalDictionary from '@/components/PersonalDictionary';
import CurriculumManager from '@/components/CurriculumManager';
import SettingsBackup from '@/components/SettingsBackup';
import MobileBottomNav from '@/components/MobileBottomNav';
import MobileConnectModal from '@/components/MobileConnectModal';
import { DashboardStats, Topic, Lesson } from '@/types';
import { Menu, Search, PlusCircle, Flame, Smartphone } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Global shared state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial dashboard & metadata
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, topRes, curRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/topics'),
        fetch('/api/curriculum'),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setStats(d);
      }
      if (topRes.ok) {
        const t = await topRes.json();
        setTopics(t.topics || []);
      }
      if (curRes.ok) {
        const c = await curRes.json();
        const allLessons: Lesson[] = [];
        c.textbooks?.forEach((tb: any) => {
          tb.chapters?.forEach((ch: any) => {
            if (ch.lessons) {
              ch.lessons.forEach((ls: any) => {
                allLessons.push({
                  ...ls,
                  chapter: {
                    id: ch.id,
                    title: ch.title,
                    order: ch.order,
                    textbookId: tb.id,
                    textbook: {
                      id: tb.id,
                      title: tb.title,
                      level: tb.level,
                      color: tb.color,
                    },
                  },
                });
              });
            }
          });
        });
        setLessons(allLessons);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu ban đầu:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickAddVocab = () => {
    setActiveTab('vocabulary');
  };

  const handleQuickAddGrammar = () => {
    setActiveTab('grammar');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        streakCount={stats?.streakCount || 1}
        isOpenMobile={isMobileMenuOpen}
        setIsOpenMobile={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search Shortcut to Dictionary */}
            <button
              onClick={() => setActiveTab('dictionary')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs font-medium transition"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Tra từ điển nhanh...</span>
              <span className="sm:hidden">Tra từ</span>
            </button>
          </div>

          {/* Topbar Right Tools */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Phone Connect Button */}
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/80 transition shadow-2xs"
              title="Quét mã QR để mở trên điện thoại"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dùng trên điện thoại</span>
              <span className="sm:hidden">Mobile</span>
            </button>

            {/* Streak Pill */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{stats?.streakCount || 1} ngày</span>
            </div>

            {/* Quick Add Vocab Button */}
            <button
              onClick={() => setActiveTab('vocabulary')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Từ vựng</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 p-3.5 sm:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              loading={loading}
              onNavigate={(tab) => setActiveTab(tab)}
              onQuickAddVocab={handleQuickAddVocab}
              onQuickAddGrammar={handleQuickAddGrammar}
            />
          )}

          {activeTab === 'vocabulary' && (
            <VocabularyManager topics={topics} lessons={lessons} />
          )}

          {activeTab === 'grammar' && (
            <GrammarManager topics={topics} lessons={lessons} />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardStudy topics={topics} lessons={lessons} />
          )}

          {activeTab === 'srs' && <SmartReviewSRS />}

          {activeTab === 'quiz' && (
            <QuizPractice topics={topics} lessons={lessons} />
          )}

          {activeTab === 'handbook' && (
            <GrammarHandbook topics={topics} lessons={lessons} />
          )}

          {activeTab === 'dictionary' && <PersonalDictionary />}

          {activeTab === 'curriculum' && <CurriculumManager />}

          {activeTab === 'settings' && <SettingsBackup />}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          dueReviewsCount={stats?.dueReviewsToday || 0}
        />

        {/* Mobile Connect QR Modal */}
        <MobileConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          localIp="192.168.1.176"
          port={3000}
        />
      </div>
    </div>
  );
}
