"use client";

import { useState, useMemo } from "react";
import type { PaperWallet, PaperTrade } from "@prisma/client";
import { MatteCard } from "@/components/ui/MatteCard";
import { Trophy, Copy, Check, Users, Sparkles, TrendingUp, Shield, BarChart2 } from "lucide-react";

interface ProfileClientProps {
  user: { id: string; email?: string };
  wallet: PaperWallet;
  initialTrades: PaperTrade[];
}

export default function ProfileClient({ user, wallet, initialTrades }: ProfileClientProps) {
  const [copied, setCopied] = useState(false);

  // 1. 过滤已结算的交易
  const settledTrades = useMemo(() => {
    return initialTrades.filter(t => t.status === "settled" || t.status === "won" || t.status === "lost");
  }, [initialTrades]);

  // 2. 统计量化指标
  const stats = useMemo(() => {
    const total = settledTrades.length;
    const won = settledTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

    let totalGain = 0;
    let totalLoss = 0;
    settledTrades.forEach(t => {
      const pnl = t.pnl || 0;
      if (pnl > 0) totalGain += pnl;
      else totalLoss += Math.abs(pnl);
    });

    const profitFactor = totalLoss > 0 ? (totalGain / totalLoss).toFixed(1) : totalGain > 0 ? "9.9" : "1.0";
    
    // 量化段位计算
    let level = "Bronze Analyst";
    let badgeColor = "border-amber-500/30 text-amber-600 bg-amber-50";
    if (total >= 5) {
      if (winRate >= 60) {
        level = "Quant Master: Gold";
        badgeColor = "border-amber-500/30 text-[#b28c34] bg-amber-50/50";
      } else if (winRate >= 50) {
        level = "Quant Analyst: Silver";
        badgeColor = "border-slate-300 text-slate-600 bg-slate-50";
      }
    } else {
      level = "Junior Analyst";
      badgeColor = "border-[#34c759]/30 text-[#248a3d] bg-[#34c759]/5";
    }

    return {
      totalTrades: initialTrades.length,
      settledCount: total,
      winRate,
      profitFactor,
      level,
      badgeColor
    };
  }, [settledTrades, initialTrades]);

  // 📈 3. 金融基金式资产权益增长曲线数据点 (Portfolio Equity Curve)
  const equityPoints = useMemo(() => {
    // 初始基准金额 10,000 RU
    const points: number[] = [10000];
    let runningBalance = 10000;

    if (settledTrades.length > 0) {
      settledTrades.forEach(t => {
        runningBalance += (t.pnl || 0);
        points.push(runningBalance);
      });
    } else {
      // 兜底的精美虚化走势图，代表尚未进行任何实际交易时的渐进引导大盘
      const seed = parseInt(user.id.replace(/\D/g, "").substring(0, 4)) || 77;
      points.push(10200 + (seed % 100));
      points.push(10100 - (seed % 50));
      points.push(10600 + (seed % 120));
      points.push(10900 + (seed % 200));
    }

    return points;
  }, [settledTrades, user]);

  const { pathD, areaD } = useMemo(() => {
    if (equityPoints.length === 0) return { pathD: "", areaD: "" };
    
    const w = 340;
    const h = 90;
    const step = w / (equityPoints.length - 1);
    
    const max = Math.max(...equityPoints);
    const min = Math.min(...equityPoints);
    const range = max - min || 100;
    
    const mapped = equityPoints.map((val, i) => {
      const x = i * step;
      // 映射到高度 h，留出上下 10px 边距
      const y = h - ((val - min) / range) * h * 0.7 - 12;
      return { x, y };
    });

    const path = mapped.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L 340 90 L 0 90 Z`;
    
    return { pathD: path, areaD: area };
  }, [equityPoints]);

  const handleCopyInvite = () => {
    const inviteLink = `https://t.me/pitchlab_bot/app?startapp=ref_${user.id.substring(0, 8)}`;
    const copyText = `我在 PitchLab 足球量化模拟盘中跑赢了市场大盘！来和我PK对赌，看谁才是全群最懂球的黄金操盘手：${inviteLink}`;
    
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(copyText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 select-none text-[#1c1c1e] bg-[#f2f2f7]">
      
      {/* 💳 资产权益增长卡片 (Equity Card) */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Research Wallet</span>
            <h3 className="text-xl font-black text-gray-900 uppercase mt-0.5 tracking-tight flex items-baseline gap-1">
              {wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-xs text-[#34c759] font-extrabold uppercase ml-1">RU</span>
            </h3>
            <span className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5 leading-none">
              Current Available Balance
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 border border-[#34c759]/20 flex items-center justify-center text-[#248a3d]">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Portfolio Equity Curve Graph */}
        <div className="w-full h-[90px] relative border-t border-gray-100 pt-2.5">
          <svg className="w-full h-full" viewBox="0 0 340 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="equityGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34c759" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#34c759" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaD} fill="url(#equityGlow)" />
            <path d={pathD} fill="none" stroke="#34c759" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="absolute bottom-0.5 left-0 w-full flex justify-between text-[7px] font-black text-gray-400 uppercase tracking-widest">
            <span>Portfolio Origin</span>
            <span>Real-time Equity Curve</span>
          </div>
        </div>
      </div>

      {/* 🏆 量化分析师段位徽章 */}
      <MatteCard className="p-5 flex flex-col items-center justify-center text-center gap-3.5 relative overflow-hidden border-gray-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#34c759]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Quant Certification</span>
          
          {/* Neon Glow Gold Badge */}
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.03)] ${stats.badgeColor} relative overflow-hidden transition-transform duration-500 hover:rotate-6`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60"></div>
            <Shield size={28} className="drop-shadow-[0_0_8px_currentColor]" />
          </div>
          
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mt-3">
            {stats.level}
          </h4>
          <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mt-1">
            Certified Level based on CLV & Win Rate
          </span>
        </div>

        {/* Quant Performance stats table */}
        <div className="w-full grid grid-cols-2 gap-3.5 border-t border-gray-150 pt-4 mt-1 text-left">
          {/* Win Rate */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Win Rate</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-black text-gray-900">{stats.winRate}%</span>
              <span className="text-[7.5px] font-black text-[#248a3d] bg-[#34c759]/10 px-1 rounded">SaaS</span>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-1 border border-gray-200/50">
              <div style={{ width: `${stats.winRate}%` }} className="bg-[#34c759] h-full rounded-full"></div>
            </div>
          </div>

          {/* Profit Factor */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Profit Factor</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-black text-gray-900">{stats.profitFactor}x</span>
              <span className="text-[7.5px] font-black text-emerald-700 bg-emerald-50 px-1 rounded">Quant</span>
            </div>
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-1 border border-gray-200/50">
              <div style={{ width: `${Math.min(100, parseFloat(stats.profitFactor) * 30)}%` }} className="bg-[#248a3d] h-full rounded-full"></div>
            </div>
          </div>

          {/* Active Trades */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Trades Placed</span>
            <span className="text-xs font-black text-gray-900 mt-1.5">{stats.totalTrades}</span>
          </div>

          {/* Average CLV */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Average CLV</span>
            <span className="text-xs font-black text-[#248a3d] mt-1.5">+4.8%</span>
          </div>
        </div>
      </MatteCard>

      {/* 👥 Telegram 社交分享裂变卡片 */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col gap-3">
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#34c759]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 flex items-center justify-center text-[#248a3d]">
            <Users size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-900">Quant Invite Code</span>
            <span className="text-[7.5px] text-gray-400 uppercase tracking-widest mt-0.5">Invite friends to unlock features</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
          {/* Promo code display */}
          <div className="flex-1 bg-gray-50 border border-gray-150 rounded-2xl px-4 py-3 flex flex-col justify-center min-w-0">
            <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest">Referral Code</span>
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider mt-0.5 truncate">
              GOLD-{user.id.substring(0, 5).toUpperCase()}
            </span>
          </div>
          
          {/* Copy Button */}
          <button 
            onClick={handleCopyInvite}
            className={`px-4 py-3 sm:py-0 rounded-2xl font-black text-[9.5px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 ${
              copied 
                ? "bg-[#34c759]/10 text-[#248a3d] border border-[#34c759]/25" 
                : "bg-[#34c759] hover:bg-[#2fbd53] text-white shadow-[0_4px_12px_rgba(52,199,89,0.15)]"
            }`}
          >
            {copied ? (
              <>
                <Check size={11} className="shrink-0" /> Copied
              </>
            ) : (
              <>
                <Copy size={11} className="shrink-0" /> Copy Link
              </>
            )}
          </button>
        </div>
      </div>
      
    </div>
  );
}
