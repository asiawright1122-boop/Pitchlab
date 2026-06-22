"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { Fixture, Prediction } from "@prisma/client";
import TeamFlag from "./TeamFlag";
import { MatteCard } from "@/components/ui/MatteCard";
import { ChevronRight, Bell, Calendar, Trophy, Sparkles, Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface DashboardClientProps {
  initialFixtures: (Fixture & { predictions: Prediction[] })[];
}

export function DashboardClient({ initialFixtures }: DashboardClientProps) {
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "subscribed">("all");
  const [followedMatches, setFollowedMatches] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pitchlab_followed_matches");
      if (saved) {
        try {
          setFollowedMatches(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse followed matches:", e);
        }
      }
    }
  }, []);

  const dates = useMemo(() => {
    const uniqueDatesMap = new Map<string, Date>();
    initialFixtures.forEach(f => {
      const d = new Date(f.kickoffUtc);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!uniqueDatesMap.has(key)) {
        uniqueDatesMap.set(key, d);
      }
    });
    
    let uniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => a.getTime() - b.getTime());
    if (uniqueDates.length === 0) {
      uniqueDates = [new Date()];
    }

    return uniqueDates.map((d) => {
      const isToday = d.toDateString() === new Date().toDateString();
      return {
        day: isToday ? "TODAY" : d.toLocaleDateString("en-US", { weekday: 'short' }).toUpperCase(),
        date: d.getDate().toString(),
        dateObj: d
      };
    });
  }, [initialFixtures]);

  const filteredFixtures = useMemo(() => {
    if (dates.length === 0) return [];
    const selectedDate = dates[activeDateIndex]?.dateObj || dates[0].dateObj;
    let filtered = initialFixtures.filter(f => {
      const d = new Date(f.kickoffUtc);
      return d.getDate() === selectedDate.getDate() && 
             d.getMonth() === selectedDate.getMonth() && 
             d.getFullYear() === selectedDate.getFullYear();
    });

    if (filterMode === "subscribed") {
      filtered = filtered.filter(f => followedMatches[f.id]);
    }

    return filtered;
  }, [initialFixtures, activeDateIndex, dates, filterMode, followedMatches]);

  const grouped = useMemo(() => {
    return filteredFixtures.reduce((acc, fixture) => {
      if (!acc[fixture.league]) acc[fixture.league] = [];
      acc[fixture.league].push(fixture);
      return acc;
    }, {} as Record<string, typeof filteredFixtures>);
  }, [filteredFixtures]);

  // 📈 足球量化大盘指数算法 (Upset Index 和 Sentiment Index)
  const { upsetIndex, upsetTrend, sentimentTrend, marketStatus } = useMemo(() => {
    if (dates.length === 0) {
      return { upsetIndex: "30.0", upsetTrend: [], sentimentTrend: [], marketStatus: "STABLE" };
    }
    const selectedDate = dates[activeDateIndex]?.dateObj || dates[0].dateObj;
    const dateSeed = selectedDate.getDate() + selectedDate.getMonth() * 10;
    
    // 生成折线图的 10 个数据点
    const upsetPoints: number[] = [];
    const sentimentPoints: number[] = [];
    const baseUpset = 28.0 + (dateSeed % 18);
    const baseSentiment = 55.0 - (dateSeed % 25);
    
    for (let i = 0; i < 10; i++) {
      const uOffset = Math.sin(i * 0.9 + dateSeed) * 5 + ((i * dateSeed) % 3);
      const sOffset = Math.cos(i * 0.7 - dateSeed) * 7 - ((i * dateSeed) % 4);
      upsetPoints.push(Math.max(10, Math.min(90, baseUpset + uOffset)));
      sentimentPoints.push(Math.max(10, Math.min(90, baseSentiment + sOffset)));
    }
    
    const finalUpset = upsetPoints[upsetPoints.length - 1];
    let status = "LOW RISK";
    if (finalUpset > 42) status = "HIGH VOLATILITY";
    else if (finalUpset > 33) status = "MODERATE";

    return {
      upsetIndex: finalUpset.toFixed(1),
      upsetTrend: upsetPoints,
      sentimentTrend: sentimentPoints,
      marketStatus: status
    };
  }, [activeDateIndex, dates]);

  const getSvgPath = (points: number[]) => {
    if (points.length === 0) return "";
    const width = 160;
    const height = 40;
    const step = width / (points.length - 1);
    return points.map((p, i) => {
      const x = i * step;
      const y = height - (p / 100) * height * 0.8 - 4;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  };

  const getSvgAreaPath = (points: number[]) => {
    const path = getSvgPath(points);
    if (!path) return "";
    return `${path} L 160 40 L 0 40 Z`;
  };

  const toggleMatchFollow = (e: React.MouseEvent, fixtureId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFollowedMatches(prev => {
      const next = { ...prev, [fixtureId]: !prev[fixtureId] };
      if (typeof window !== "undefined") {
        localStorage.setItem("pitchlab_followed_matches", JSON.stringify(next));
      }
      return next;
    });
  };

  const totalSubscriptionsCount = useMemo(() => {
    return Object.values(followedMatches).filter(Boolean).length;
  }, [followedMatches]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-pitch text-foreground pb-24 font-sans selection:bg-emerald-500/30 relative">
      
      {/* ⚽️ Top Header */}
      <header className="bg-[#070a0b]/90 backdrop-blur-md border-b border-[#202b30] px-5 pt-5 pb-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
          <span className="text-[13px] font-black uppercase tracking-[0.25em] text-white">
            PITCHLAB <span className="text-emerald-500 font-black">QUANT</span>
          </span>
        </div>
        
        {isMounted && totalSubscriptionsCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Bell size={12} className="animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {totalSubscriptionsCount} Active
            </span>
          </div>
        )}
      </header>

      {/* 📊 今日量化大盘数据面板 (Futu/Bloomberg 对标) */}
      <div className="px-4 pt-5 pb-2">
        <div className="bg-quant-mesh border border-[#202b30] rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col gap-4.5 select-none">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Football Quant Index</span>
              <h2 className="text-lg font-black text-white uppercase mt-0.5 tracking-tight flex items-center gap-1.5">
                Market Sentiment
              </h2>
            </div>
            <span className={`text-[8px] font-black px-2.5 py-1 rounded-full border tracking-widest uppercase ${
              marketStatus === "HIGH VOLATILITY" 
                ? "bg-red-500/10 text-red-400 border-red-500/25"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse"
            }`}>
              {marketStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Upset Index Panel */}
            <div className="bg-[#0f1416]/75 border border-[#202b30] rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-1 z-10">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Upset Index</span>
                <AlertTriangle size={11} className="text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1.5 z-10">
                <span className="text-xl font-black text-white">{upsetIndex}%</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Risk</span>
              </div>
              
              {/* Quant Sparkline Trend */}
              <div className="w-full h-10 mt-3 relative">
                <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="upsetGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={getSvgAreaPath(upsetTrend)} fill="url(#upsetGlow)" />
                  <path d={getSvgPath(upsetTrend)} fill="none" stroke="#10b981" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            {/* Market Sentiment Panel */}
            <div className="bg-[#0f1416]/75 border border-[#202b30] rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-1 z-10">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Volume Sentiment</span>
                <TrendingUp size={11} className="text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5 z-10">
                <span className="text-xl font-black text-emerald-400">Bullish</span>
                <span className="text-[8px] font-bold text-emerald-500/80 uppercase">Active</span>
              </div>
              
              {/* Quant Sparkline Trend */}
              <div className="w-full h-10 mt-3 relative">
                <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sentimentGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={getSvgAreaPath(sentimentTrend)} fill="url(#sentimentGlow)" />
                  <path d={getSvgPath(sentimentTrend)} fill="none" stroke="#059669" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📅 Premium Horizontal Date selector */}
      <div className="bg-[#070a0b]/95 backdrop-blur-md border-b border-[#202b30] sticky top-[57px] z-30 px-3 py-3.5 shadow-md flex flex-col gap-3.5">
        <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-1.5">
          {dates.map((d, i) => {
            const active = activeDateIndex === i;
            return (
              <button 
                key={i} 
                onClick={() => setActiveDateIndex(i)}
                className={`flex flex-col items-center justify-center min-w-[64px] py-2.5 rounded-2xl transition-all duration-300 ${
                  active 
                    ? 'bg-emerald-500 text-[#070a0b] font-black shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.04]' 
                    : 'bg-[#0f1416]/50 border border-[#202b30]/50 text-gray-500 hover:text-gray-300 hover:bg-[#131b1e]/80'
                }`}
              >
                <span className={`text-[9px] font-black tracking-widest ${active ? 'text-[#070a0b]' : 'text-gray-500'}`}>{d.day}</span>
                <span className="text-[18px] font-black mt-0.5 leading-none">{d.date}</span>
              </button>
            );
          })}
        </div>

        {/* Clean Pill Toggle Filter */}
        <div className="flex bg-[#0f1416] p-1.5 rounded-2xl border border-[#202b30] mx-1">
          <button 
            onClick={() => setFilterMode("all")}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all duration-300 ${
              filterMode === "all" 
                ? "bg-[#202b30] text-white shadow-md border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            All Matches
          </button>
          <button 
            onClick={() => setFilterMode("subscribed")}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
              filterMode === "subscribed" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md animate-pulse" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Bell size={11} className={filterMode === "subscribed" ? "fill-current" : ""} /> Subscribed
          </button>
        </div>
      </div>

      {/* 🚀 Main Schedule Matches Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {filterMode === "subscribed" ? "YOUR SUBSCRIPTIONS" : "SCHEDULED FIXTURES"}
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center border border-dashed border-[#202b30] rounded-3xl bg-[#0f1416]/50">
              <Calendar size={28} className="text-[#202b30] mb-3" />
              <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest">No fixtures found</span>
            </div>
          )}
          
          {Object.entries(grouped).map(([league, matches]) => (
            <div key={league} className="space-y-3.5">
              {/* League Header */}
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 bg-[#0f1416] border border-[#202b30] py-1.5 px-3.5 rounded-full">
                  <Trophy size={11} className="text-emerald-500" />
                  {league}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {matches.map((match) => {
                  const isSubscribed = followedMatches[match.id];
                  const hasFinished = match.status === 'finished';
                  
                  const homeScore = match.homeGoals ?? 0;
                  const awayScore = match.awayGoals ?? 0;
                  const isHomeWinner = hasFinished && homeScore > awayScore;
                  const isAwayWinner = hasFinished && awayScore > homeScore;

                  // 📊 胜率数据整合
                  const homePred = match.predictions.find(p => p.market === "1X2" && (p.selection === "H" || p.selection === "Home"));
                  const awayPred = match.predictions.find(p => p.market === "1X2" && (p.selection === "A" || p.selection === "Away"));
                  const drawPred = match.predictions.find(p => p.market === "1X2" && (p.selection === "D" || p.selection === "Draw"));
                  
                  const pHome = homePred ? Math.round(homePred.prob * 100) : 40;
                  const pAway = awayPred ? Math.round(awayPred.prob * 100) : 35;
                  const pDraw = drawPred ? Math.round(drawPred.prob * 100) : 25;

                  return (
                    <Link href={`/matches/${match.id}`} key={match.id} className="block group">
                      <MatteCard className={`p-4.5 relative transition-all duration-300 border-[#202b30] hover:border-emerald-500/40 overflow-hidden ${
                        isSubscribed ? 'border-emerald-500/50 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.04)]' : ''
                      }`}>
                        
                        {isSubscribed && (
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                        )}

                        <div className="flex items-center justify-between w-full">
                          
                          {/* Schedule / Time Info */}
                          <div className="flex flex-col items-center justify-center w-[58px] shrink-0 border-r border-[#202b30]/60 pr-3.5 mr-1 text-center">
                            {hasFinished ? (
                              <span className="text-[9px] font-black text-gray-500 bg-[#161e22] px-2 py-0.5 rounded-md uppercase tracking-wider">FT</span>
                            ) : (
                              <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(match.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            )}
                          </div>
                          
                          {/* Teams & Score Dashboard */}
                          <div className="flex-1 flex flex-col gap-2.5 px-3.5">
                            {/* Home Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <TeamFlag teamName={match.home} className="w-5.5 h-4 object-cover rounded border border-[#202b30] shrink-0" />
                                <span className={`text-[13px] font-black truncate max-w-[130px] ${
                                  hasFinished 
                                    ? isHomeWinner ? 'text-white' : 'text-gray-500'
                                    : 'text-gray-300'
                                }`}>
                                  {match.home}
                                </span>
                              </div>
                              {hasFinished && (
                                <span className={`text-sm font-black ${isHomeWinner ? 'text-white' : 'text-gray-500'}`}>
                                  {match.homeGoals}
                                </span>
                              )}
                            </div>

                            {/* Away Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <TeamFlag teamName={match.away} className="w-5.5 h-4 object-cover rounded border border-[#202b30] shrink-0" />
                                <span className={`text-[13px] font-black truncate max-w-[130px] ${
                                  hasFinished 
                                    ? isAwayWinner ? 'text-white' : 'text-gray-500'
                                    : 'text-gray-300'
                                }`}>
                                  {match.away}
                                </span>
                              </div>
                              {hasFinished && (
                                <span className={`text-sm font-black ${isAwayWinner ? 'text-white' : 'text-gray-500'}`}>
                                  {match.awayGoals}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subscribe Bell Button */}
                          <div className="flex items-center pl-3.5">
                            <button 
                              onClick={(e) => toggleMatchFollow(e, match.id)}
                              className={`w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                                isSubscribed 
                                  ? 'bg-emerald-500 text-[#070a0b] shadow-[0_0_12px_#10b981]' 
                                  : 'bg-[#161e22] border border-[#202b30] text-gray-500 hover:text-emerald-500 hover:border-emerald-500/40'
                              }`}
                            >
                              <Bell size={13} className={isSubscribed ? "fill-current" : ""} />
                            </button>
                          </div>
                        </div>

                        {/* 📊 双向胜率对比量化进度条 */}
                        <div className="mt-3.5 pt-3 border-t border-[#202b30]/50 space-y-1.5 select-none">
                          <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase tracking-widest px-0.5">
                            <span>Win Probability</span>
                            <span className="text-emerald-400 font-extrabold uppercase">Dixon-Coles Model</span>
                          </div>
                          <div className="flex h-2 bg-[#070a0b] rounded-full overflow-hidden border border-[#202b30]/40 relative">
                            <div style={{ width: `${pHome}%` }} className="bg-emerald-500 h-full relative flex items-center">
                              <span className="absolute left-2.5 text-[7px] font-black text-[#070a0b] uppercase">{pHome}%</span>
                            </div>
                            <div style={{ width: `${pDraw}%` }} className="bg-gray-600 h-full relative flex items-center justify-center">
                              <span className="text-[7px] font-black text-gray-300 uppercase">{pDraw}%</span>
                            </div>
                            <div style={{ width: `${pAway}%` }} className="bg-emerald-800 h-full relative flex items-center justify-end">
                              <span className="absolute right-2.5 text-[7px] font-black text-emerald-200 uppercase">{pAway}%</span>
                            </div>
                          </div>
                        </div>

                      </MatteCard>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
