"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, HelpCircle } from "lucide-react";

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
  const [balance, setBalance] = useState<number>(1000);
  const [useInsurance, setUseInsurance] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const hasBet = !!(selection || customSelection);

  // 1. 监听盘口选择广播事件
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

  // 2. 自动获取用户的真实虚拟账户余额
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/paper/wallet");
        if (res.ok) {
          const data = await res.json();
          // 处理不同的 API 返回结构
          const bal = typeof data.balance === "number" ? data.balance : (data.wallet?.balance ?? 1000);
          setBalance(bal);
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      }
    };
    if (hasBet) {
      fetchBalance();
    }
  }, [hasBet]);

  const oddsValue = customSelection
    ? customSelection.odds
    : selection === "H"
    ? latestOdds.home
    : selection === "D"
    ? latestOdds.draw
    : selection === "A"
    ? latestOdds.away
    : 0;

  const insuranceFee = useMemo(() => {
    return useInsurance ? Math.round(stake * 0.1) : 0;
  }, [useInsurance, stake]);

  const totalCost = stake + insuranceFee;
  const potentialPayout = stake * oddsValue;

  const handleSubmit = async () => {
    const isCustom = !!customSelection;
    if (!selection && !isCustom) return;
    setIsSubmitting(true);
    setError(null);

    // 校验余额是否足够扣除本金 + 保险费
    if (balance < totalCost) {
      setError("Insufficient balance to cover stake and insurance premium.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/paper/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixture_id: fixtureId,
          league,
          home,
          away,
          kickoff_utc: typeof kickoffUtc === "string" ? kickoffUtc : kickoffUtc.toISOString(),
          market: isCustom ? customSelection.marketName : "1x2",
          selection: isCustom ? customSelection.selectionName : selection,
          odds: oddsValue,
          stake: Number(stake),
          insurance: useInsurance
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm trade.");
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1416]/95 backdrop-blur-xl border-t border-emerald-500/35 p-7 pb-12 rounded-t-3xl flex flex-col items-center justify-center text-center shadow-[0_-12px_45px_rgba(0,0,0,0.8)] relative overflow-hidden animate-slide-up select-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4 font-black border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          ✓
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-400 animate-spin" /> Bet Confirmed!
        </h3>
        <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em] font-extrabold">Synchronizing Portfolio...</p>
      </div>
    );
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0f1416]/95 backdrop-blur-xl border-t border-[#202b30]/85 p-5 pb-8 rounded-t-3xl shadow-[0_-12px_36px_rgba(0,0,0,0.7)] transition-all duration-300 ease-out select-none ${
        hasBet ? "translate-y-0" : "translate-y-[calc(100%-52px)]"
      }`}
    >
      {/* Drawer Drag Handle */}
      <div className="flex flex-col items-center justify-center pb-4 -mt-1 cursor-pointer">
        <div className="w-9.5 h-1 bg-[#202b30] rounded-full mb-1.5"></div>
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
          QUANT BETSLIP {hasBet ? "(1 ACTIVE TRADE)" : "(EMPTY)"}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Selection Details Card */}
        {hasBet ? (
          customSelection ? (
            <div className="bg-[#161e22] border border-[#202b30] rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-widest">
                <span>{customSelection.marketName}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[8px]">
                  Custom Market
                </span>
              </div>
              <div className="flex justify-between items-end mt-1 border-b border-[#202b30]/50 pb-2">
                <span className="font-bold text-white text-xs">{customSelection.selectionName}</span>
                <span className="font-black text-emerald-400 text-lg">{customSelection.odds.toFixed(2)}</span>
              </div>
              <p className="text-[7.5px] text-gray-500 uppercase font-black tracking-widest mt-1">
                ✓ Auto-settled paper trade simulation
              </p>
            </div>
          ) : (
            <div className="bg-[#161e22] border border-[#202b30] rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-widest">
                <span>Match Winner (1X2)</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[8px]">
                  Model Popular
                </span>
              </div>
              <div className="flex justify-between items-end mt-1 border-b border-[#202b30]/50 pb-2">
                <span className="font-bold text-white text-xs">
                  {selection === "H" ? `${home} Win` : selection === "D" ? "Draw" : `${away} Win`}
                </span>
                <span className="font-black text-emerald-400 text-lg">{oddsValue.toFixed(2)}</span>
              </div>
              <p className="text-[7.5px] text-gray-500 uppercase font-black tracking-widest mt-1">
                ✓ Auto-settled paper trade simulation
              </p>
            </div>
          )
        ) : (
          <div className="py-2 text-center text-[9px] text-gray-600 uppercase font-black tracking-widest">
            Please pick an odds button to slip
          </div>
        )}

        {/* 🛡️ 90+ Fergie Time Insurance Card */}
        {hasBet && (
          <div className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
            useInsurance 
              ? 'border-[#c5a059]/40 bg-[#c5a059]/5 text-white' 
              : 'border-[#202b30] bg-[#161e22] text-gray-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                useInsurance ? 'bg-gold-glow text-[#070a0b]' : 'bg-[#0f1416] text-gray-500'
              }`}>
                <Shield size={15} className={useInsurance ? "animate-pulse" : ""} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-white">90+ Time Insurance</span>
                <span className="text-[7.5px] text-gray-500 uppercase tracking-widest mt-0.5">Protect against 90+ min heartbreaks</span>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => setUseInsurance(!useInsurance)}
              className={`w-9.5 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${
                useInsurance ? 'bg-[#c5a059]' : 'bg-gray-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                useInsurance ? 'translate-x-4.5' : 'translate-x-0'
              }`}></div>
            </button>
          </div>
        )}

        {/* Stake Input Area */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Virtual Stake</span>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
              Avail Bal: {balance.toFixed(0)} RU
            </span>
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs uppercase tracking-wider">RU</span>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
              disabled={!hasBet}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#202b30] bg-[#070a0b] text-right font-black text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-30 text-sm transition-all"
              min={1}
            />
          </div>
          
          <div className="flex justify-between text-xs mt-1.5 items-center bg-[#161e22]/50 p-3.5 rounded-2xl border border-[#202b30]/60">
            <div className="flex flex-col">
              <span className="text-gray-500 font-black text-[9px] tracking-widest uppercase">Est. Returns:</span>
              {useInsurance && (
                <span className="text-[7.5px] font-bold text-[#c5a059] uppercase tracking-wider mt-0.5">
                  Premium: {insuranceFee} RU
                </span>
              )}
            </div>
            <span className="font-black text-emerald-400 text-base">
              {hasBet ? potentialPayout.toFixed(2) : "0.00"} <span className="text-xs text-gray-500 font-bold">RU</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/20 text-rose-400 rounded-xl text-xs border border-rose-900/40 font-bold select-text">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!hasBet || isSubmitting}
          className="w-full py-4 text-xs mt-1 bg-emerald-500 hover:bg-emerald-400 text-[#070a0b] transition-all duration-300 font-black uppercase tracking-widest rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isSubmitting ? "Processing..." : hasBet ? "Confirm Trade" : "Select Odds First"}
        </button>
      </div>
    </div>
  );
}
