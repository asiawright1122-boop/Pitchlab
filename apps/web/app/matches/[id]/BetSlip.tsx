"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type BetSlipProps = {
  fixtureId: string;
  home: string;
  away: string;
  league: string;
  kickoffUtc: Date;
  latestOdds: { home: number; draw: number; away: number };
};

export default function BetSlip({ fixtureId, home, away, league, kickoffUtc, latestOdds }: BetSlipProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<"H" | "D" | "A" | null>(null);
  const [customSelection, setCustomSelection] = useState<{
    marketName: string;
    selectionName: string;
    odds: number;
  } | null>(null);
  const [stake, setStake] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleSelectBet = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.fixtureId !== fixtureId) return;

      if (detail.type === "UNSUPPORTED") {
        setSelection(null);
        setCustomSelection({
          marketName: detail.marketName,
          selectionName: detail.selectionName,
          odds: detail.odds
        });
      } else {
        setCustomSelection(null);
        setSelection(detail.type);
      }
    };

    window.addEventListener("select-bet-slip", handleSelectBet);
    return () => {
      window.removeEventListener("select-bet-slip", handleSelectBet);
    };
  }, [fixtureId]);

  const oddsValue = customSelection
    ? customSelection.odds
    : selection === "H"
    ? latestOdds.home
    : selection === "D"
    ? latestOdds.draw
    : selection === "A"
    ? latestOdds.away
    : 0;
  const potentialPayout = stake * oddsValue;

  const handleSubmit = async () => {
    const isCustom = !!customSelection;
    if (!selection && !isCustom) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/paper/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixture_id: fixtureId,
          league,
          home,
          away,
          kickoff_utc: kickoffUtc.toISOString(),
          market: isCustom ? customSelection.marketName : "1x2",
          selection: isCustom ? customSelection.selectionName : selection,
          odds: oddsValue,
          stake: Number(stake)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "提交失败");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50/70 backdrop-blur-md border border-green-200/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-650 flex items-center justify-center text-3xl mb-4 font-bold">
          ✓
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">下注成功!</h3>
        <p className="text-slate-500 text-sm font-medium">正在跳转至资金面板...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 flex flex-col gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div>
        <h3 className="text-lg font-black text-slate-900 mb-1">Interactive Bet Slip</h3>
        <p className="text-sm text-slate-500 font-medium">Paper Trading Simulator</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            setSelection("H");
            setCustomSelection(null);
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
            selection === "H" ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]" : "border-slate-200 bg-slate-50/50 hover:border-slate-350 text-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 mb-1 truncate w-full text-center font-bold">主胜 {home}</span>
          <span className="font-extrabold text-lg">{latestOdds.home ? latestOdds.home.toFixed(2) : "-"}</span>
        </button>
        <button
          onClick={() => {
            setSelection("D");
            setCustomSelection(null);
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
            selection === "D" ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]" : "border-slate-200 bg-slate-50/50 hover:border-slate-350 text-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 mb-1 font-bold">平局 Draw</span>
          <span className="font-extrabold text-lg">{latestOdds.draw ? latestOdds.draw.toFixed(2) : "-"}</span>
        </button>
        <button
          onClick={() => {
            setSelection("A");
            setCustomSelection(null);
          }}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
            selection === "A" ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]" : "border-slate-200 bg-slate-50/50 hover:border-slate-350 text-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 mb-1 truncate w-full text-center font-bold">客胜 {away}</span>
          <span className="font-extrabold text-lg">{latestOdds.away ? latestOdds.away.toFixed(2) : "-"}</span>
        </button>
      </div>

      {customSelection && (
        <div className="bg-[#e04039]/5 border border-[#e04039]/15 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">{customSelection.marketName}</span>
            <span className="bg-[#e04039]/10 text-[#e04039] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
              模拟交易
            </span>
          </div>
          <div className="flex justify-between items-end mt-1">
            <span className="font-extrabold text-slate-800 text-sm">{customSelection.selectionName}</span>
            <span className="font-extrabold text-[#e04039] text-base">{customSelection.odds.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-green-600 font-semibold mt-1">
            ✓ 模拟结算引擎已适配该玩法的自动结算规则。
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-600">虚拟本金 (RU)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-xs">RU</span>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-right font-black focus:outline-none focus:border-[#e04039] focus:ring-1 focus:ring-[#e04039] text-slate-800 transition-all"
            min={1}
          />
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-slate-500 font-semibold">潜在回报:</span>
          <span className="font-extrabold text-[#e04039]">{selection || customSelection ? potentialPayout.toFixed(2) : "0.00"}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-650 rounded-xl text-sm border border-red-100 font-semibold">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={(!selection && !customSelection) || isSubmitting}
        className="w-full py-4 text-base mt-2 bg-[#e04039] hover:bg-slate-900 text-white transition-colors font-bold rounded-xl shadow-sm shadow-[#e04039]/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "处理中..." : (!selection && !customSelection) ? "请选择赛果" : "确认虚拟下注"}
      </button>
    </div>
  );
}
