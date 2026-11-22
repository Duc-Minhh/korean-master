'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Volume2,
  BookOpen,
  FileText,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Vocabulary, Grammar } from '@/types';
import { speakKorean } from '@/lib/speech';
import { useToast } from './Toast';

export default function PersonalDictionary() {
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [vocabResults, setVocabResults] = useState<Vocabulary[]>([]);
  const [grammarResults, setGrammarResults] = useState<Grammar[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setVocabResults([]);
      setGrammarResults([]);
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dictionary?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setVocabResults(data.vocabularies || []);
          setGrammarResults(data.grammars || []);
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error('Lỗi tra từ điển:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Đã sao chép từ vào bộ nhớ tạm', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-elevated">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Từ điển cá nhân</h1>

        {/* Big Live Search Box */}
        <div className="mt-6 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ tiếng Hàn (ví dụ: 사과, 인사) hoặc nghĩa tiếng Việt (ví dụ: xin chào, cảm ơn)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 text-sm sm:text-base font-medium shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400/30 transition placeholder:text-slate-400"
          />
        </div>

        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-blue-200 font-semibold">Gợi ý nhanh:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(s.title)}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition font-korean"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results View */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Đang tìm kiếm trong kho dữ liệu...</div>
      ) : !query.trim() ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
          <Search className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-semibold text-slate-700">Bắt đầu tra cứu từ điển</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gõ bất kỳ từ tiếng Hàn hoặc tiếng Việt nào vào thanh tìm kiếm phía trên để xem kết quả.
          </p>
        </div>
      ) : vocabResults.length === 0 && grammarResults.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
          <p className="text-base font-semibold text-slate-700">
            Không tìm thấy kết quả nào cho "{query}"
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Từ khóa này chưa có trong cơ sở dữ liệu của bạn. Bạn có thể sang mục Quản lý từ vựng để thêm mới!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vocabulary Results */}
          {vocabResults.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Từ vựng liên quan ({vocabResults.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vocabResults.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition space-y-2 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-korean text-slate-900">
                          {v.korean}
                        </span>
                        <button
                          onClick={() => speakKorean(v.korean)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopy(v.korean, v.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                          title="Sao chép"
                        >
                          {copiedId === v.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {v.partOfSpeech}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-blue-700">{v.vietnamese}</p>
                    {v.hanja && <p className="text-xs text-slate-400 font-mono">[{v.hanja}]</p>}

                    {v.exampleKorean && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                        <p className="font-semibold text-slate-800 font-korean">{v.exampleKorean}</p>
                        <p className="text-slate-500 italic">{v.exampleVietnamese}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar Results */}
          {grammarResults.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Ngữ pháp liên quan ({grammarResults.length})</span>
              </h2>

              <div className="space-y-3">
                {grammarResults.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-black font-korean text-indigo-950">
                        {g.structure}
                      </h3>
                      <button
                        onClick={() => speakKorean(g.exampleKorean)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Nghe ví dụ</span>
                      </button>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{g.meaning}</p>
                    <p className="text-xs text-slate-600">{g.usage}</p>

                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs font-mono text-slate-700">
                      {g.formation}
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs space-y-0.5">
                      <p className="font-semibold text-slate-900 font-korean">{g.exampleKorean}</p>
                      <p className="text-slate-500 italic">{g.exampleVietnamese}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
