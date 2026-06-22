"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type TmaPanelProps = {
  fixtureId: string;
  isUnlocked: boolean;
};

export default function TmaPanel({ fixtureId, isUnlocked: initialUnlocked }: TmaPanelProps) {
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If already unlocked, load the report immediately
  useEffect(() => {
    if (isUnlocked && !reportText && !isLoadingReport) {
      loadReport();
    }
  }, [isUnlocked, reportText]);

  const loadReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch("/api/tma/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载报告失败");
      setReportText(data.insights);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/tma/unlock-ru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解锁失败");
      
      setIsUnlocked(true);
      // loadReport is triggered by useEffect
    } catch (err: any) {
      setError(err.message);
      setIsUnlocking(false);
    }
  };

  if (isUnlocked) {
    return (
      <div className="bg-[#0d1114] border border-[#272f35] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex justify-between items-start mb-6 border-b border-[#272f35] pb-4 relative z-10">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            TMA Quant Edge Report
          </h2>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20">
            ✓ UNLOCKED
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 text-red-400 rounded-xl text-sm mb-6 border border-red-900/50 font-semibold relative z-10">
            ⚠️ {error}
            <button onClick={loadReport} className="ml-4 underline hover:text-red-300">Retry</button>
          </div>
        )}

        {isLoadingReport || !reportText ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-gray-400 relative z-10">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold animate-pulse tracking-widest uppercase">Generating AI Insights...</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-emerald max-w-none text-sm md:text-base prose-headings:font-black prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-emerald-400 prose-code:bg-[#151a1e] prose-code:text-emerald-300 prose-code:px-1 prose-code:rounded relative z-10">
            <ReactMarkdown>{reportText}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0d1114] border border-[#272f35] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          TMA Quant Edge
        </h2>
        <span className="px-2.5 py-0.5 bg-[#151a1e] text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">Premium</span>
      </div>
      
      <p className="text-gray-400 text-sm font-medium mb-6 leading-relaxed relative z-10">
        PitchLab engine has collected historical CLV movements, expected goals (xG), and market value deviations for this match. Use TMA large models to unlock deep tactical insights.
      </p>

      {error && (
        <div className="p-3 bg-red-950/30 text-red-400 rounded-xl text-sm mb-4 border border-red-900/50 font-semibold relative z-10">
          ⚠️ {error}
        </div>
      )}

      <button 
        onClick={handleUnlock}
        disabled={isUnlocking}
        className="w-full py-4 rounded-xl border border-[#272f35] bg-[#151a1e] hover:border-emerald-500/50 hover:bg-emerald-500/10 text-white transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative z-10 group"
      >
        {isUnlocking ? (
          <span className="flex items-center gap-2 text-emerald-500 font-bold tracking-widest uppercase">
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          <>
            <span className="tracking-widest uppercase text-sm">Unlock Match Report</span>
            <span className="px-2.5 py-0.5 bg-emerald-500 text-[#0d1114] text-xs rounded-full font-black shadow-[0_0_10px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-shadow">-2000 RU</span>
          </>
        )}
      </button>
    </div>
  );
}
