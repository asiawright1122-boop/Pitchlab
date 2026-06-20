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
      <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#e04039] rounded-full inline-block animate-pulse"></span>
            TMA 量化研报 (Quant Edge)
          </h2>
          <span className="px-3 py-1 bg-green-550/10 text-green-600 rounded-full text-xs font-bold border border-green-500/20">
            ✓ 已解锁
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-650 rounded-xl text-sm mb-6 border border-red-100 font-semibold">
            ⚠️ {error}
            <button onClick={loadReport} className="ml-4 underline hover:text-red-800">重试</button>
          </div>
        )}

        {isLoadingReport || !reportText ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-8 h-8 border-4 border-[#e04039]/20 border-t-[#e04039] rounded-full animate-spin"></div>
            <p className="text-sm font-semibold animate-pulse text-slate-500">正在生成模型洞察分析...</p>
          </div>
        ) : (
          <div className="prose prose-slate prose-red max-w-none text-sm md:text-base prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-[#e04039] prose-code:bg-slate-100 prose-code:text-slate-800 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{reportText}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-[#e04039] rounded-full inline-block"></span>
          TMA 智能量化研报
        </h2>
        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-650 rounded-full text-xs font-bold border border-slate-200/50">Premium</span>
      </div>
      
      <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">
        PitchLab 量化引擎已收集本场赛事的历史 CLV 波动、预期进球数据 (xG) 与市场价值偏差。使用 TMA 大模型解锁深度战术走势解读。
      </p>

      {error && (
        <div className="p-3 bg-red-50 text-red-650 rounded-xl text-sm mb-4 border border-red-100 font-semibold">
          ⚠️ {error}
        </div>
      )}

      <button 
        onClick={handleUnlock}
        disabled={isUnlocking}
        className="w-full py-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUnlocking ? (
          <span className="flex items-center gap-2 text-slate-600 font-bold">
            <div className="w-4 h-4 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin"></div>
            正在处理支付...
          </span>
        ) : (
          <>
            <span>解锁该赛事深度报告</span>
            <span className="px-2.5 py-0.5 bg-[#e04039] text-white text-xs rounded-full font-bold shadow-sm shadow-[#e04039]/10">-2000 RU</span>
          </>
        )}
      </button>
    </div>
  );
}
