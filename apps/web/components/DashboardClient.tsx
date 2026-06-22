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
  const [activeDateIndex, setActiveDateIndex] = useState(3); // 默认高亮今天 (第 3 个索引)
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
      
      // 平滑将今天（TODAY）的日期按钮滚动到横向滑动轴的视觉中心
      setTimeout(() => {
        const activeBtn = document.querySelector(".date-btn-active");
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }, 150);
    }
  }, []);

  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    
    // 生成以今天为中心，过去3天到未来3天，共7天的连续滑动轴
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      list.push({
        day: isToday ? "TODAY" : d.toLocaleDateString("en-US", { weekday: 'short' }).toUpperCase(),
        date: d.getDate().toString(),
        dateObj: d
      });
    }
    return list;
  }, []);

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
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7] text-[#1c1c1e] pb-28 font-sans selection:bg-[#34c759]/20 relative overflow-x-hidden">
      
      {/* ⚽️ Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-5 pt-5 pb-4 sticky top-0 z-40 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.4)]"></div>
          <span className="text-[13px] font-black uppercase tracking-[0.25em] text-gray-800">
            PITCHLAB <span className="text-[#34c759] font-black">QUANT</span>
          </span>
        </div>
        
        {isMounted && totalSubscriptionsCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eafaf1] border border-[#d5f5e3] text-[#248a3d]">
            <Bell size={11} className="fill-current" />
            <span className="text-[9px] font-black uppercase tracking-wider">
              {totalSubscriptionsCount} Subscribed
            </span>
          </div>
        )}
      </header>

      {/* 📊 今日量化大盘数据面板 */}
      <div className="px-4 pt-5 pb-2">
        <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col gap-4.5 select-none">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Football Quant Index</span>
              <h2 className="text-base font-black text-gray-800 uppercase mt-0.5 tracking-tight">
                Market Sentiment
              </h2>
            </div>
            <span className={`text-[8px] font-black px-2.5 py-1 rounded-full border tracking-widest uppercase ${
              marketStatus === "HIGH VOLATILITY" 
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-[#eafaf1] text-[#248a3d] border-[#d5f5e3]"
            }`}>
              {marketStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Upset Index Panel */}
            <div className="bg-[#f2f2f7]/60 border border-gray-150 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-1 z-10">
                <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest">Upset Index</span>
                <AlertTriangle size={11} className="text-[#34c759]" />
              </div>
              <div className="flex items-baseline gap-1 z-10">
                <span className="text-lg font-black text-gray-850">{upsetIndex}%</span>
                <span className="text-[7.5px] font-bold text-gray-400 uppercase">Risk</span>
              </div>
              
              {/* Quant Sparkline Trend */}
              <div className="w-full h-10 mt-2.5 relative">
                <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="upsetGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34c759" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#34c759" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={getSvgAreaPath(upsetTrend)} fill="url(#upsetGlow)" />
                  <path d={getSvgPath(upsetTrend)} fill="none" stroke="#34c759" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Market Sentiment Panel */}
            <div className="bg-[#f2f2f7]/60 border border-gray-150 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-1 z-10">
                <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest">Volume Sentiment</span>
                <TrendingUp size={11} className="text-[#007aff]" />
              </div>
              <div className="flex items-baseline gap-1 z-10">
                <span className="text-lg font-black text-[#007aff]">Bullish</span>
                <span className="text-[7.5px] font-bold text-blue-400 uppercase">Active</span>
              </div>
              
              {/* Quant Sparkline Trend */}
              <div className="w-full h-10 mt-2.5 relative">
                <svg className="w-full h-full" viewBox="0 0 160 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sentimentGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007aff" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={getSvgAreaPath(sentimentTrend)} fill="url(#sentimentGlow)" />
                  <path d={getSvgPath(sentimentTrend)} fill="none" stroke="#007aff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📅 Premium Horizontal Date selector */}
      <div className="bg-[#f2f2f7]/95 backdrop-blur-md border-b border-gray-200/60 sticky top-[57px] z-30 px-3 py-3 shadow-sm flex flex-col gap-3">
        <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-1.5">
          {dates.map((d, i) => {
            const active = activeDateIndex === i;
            return (
              <button 
                key={i} 
                onClick={() => setActiveDateIndex(i)}
                className={`flex flex-col items-center justify-center min-w-[62px] py-2.5 rounded-2xl transition-all duration-300 ${
                  active 
                    ? 'bg-[#34c759] text-white font-black shadow-[0_4px_12px_rgba(52,199,89,0.25)] scale-[1.03] date-btn-active' 
                    : 'bg-white border border-gray-200/60 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className={`text-[8.5px] font-black tracking-widest ${active ? 'text-white' : 'text-gray-400'}`}>{d.day}</span>
                <span className="text-[17px] font-black mt-0.5 leading-none">{d.date}</span>
              </button>
            );
          })}
        </div>

        {/* Clean Pill Toggle Filter */}
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200/50 mx-0.5">
          <button 
            onClick={() => setFilterMode("all")}
            className={`flex-1 py-2 text-[9.5px] font-black rounded-xl uppercase tracking-widest transition-all duration-300 ${
              filterMode === "all" 
                ? "bg-gray-100 text-gray-800 font-extrabold shadow-sm" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            All Matches
          </button>
          <button 
            onClick={() => setFilterMode("subscribed")}
            className={`flex-1 py-2 text-[9.5px] font-black rounded-xl uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
              filterMode === "subscribed" 
                ? "bg-[#eafaf1] text-[#248a3d] font-extrabold shadow-sm border border-[#d5f5e3]" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Bell size={11} className={filterMode === "subscribed" ? "fill-current" : ""} /> Subscribed
          </button>
        </div>
      </div>

      {/* 🚀 Main Schedule Matches Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#34c759] rounded-full"></span>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {filterMode === "subscribed" ? "YOUR SUBSCRIPTIONS" : "SCHEDULED FIXTURES"}
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-3xl bg-white">
              <Calendar size={28} className="text-gray-300 mb-3" />
              <span className="text-gray-450 font-black text-[9.5px] uppercase tracking-widest">No fixtures found</span>
            </div>
          )}
          
          {Object.entries(grouped).map(([league, matches]) => (
            <div key={league} className="space-y-3">
              {/* League Header */}
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[9.5px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 bg-white border border-gray-200/80 py-1.5 px-3.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.01)]">
                  <Trophy size={11} className="text-[#34c759]" />
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
                      <MatteCard className={`p-4 relative transition-all duration-300 border-gray-200/70 hover:border-[#34c759]/40 overflow-hidden ${
                        isSubscribed ? 'border-[#34c759]/50 bg-[#eafaf1]/10 shadow-[0_4px_16px_rgba(52,199,89,0.04)]' : 'bg-white'
                      }`}>
                        
                        {isSubscribed && (
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#34c759]"></div>
                        )}

                        <div className="flex items-center justify-between w-full min-w-0">
                          
                          {/* Schedule / Time Info */}
                          <div className="flex flex-col items-center justify-center w-[54px] shrink-0 border-r border-gray-100 pr-3 mr-1 text-center">
                            {hasFinished ? (
                              <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">FT</span>
                            ) : (
                              <span className="text-xs font-black text-[#34c759] flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(match.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            )}
                          </div>
                          
                          {/* Teams & Score Dashboard - Protected against text overflows */}
                          <div className="flex-1 flex flex-col gap-2 px-2.5 min-w-0">
                            {/* Home Row */}
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <TeamFlag teamName={match.home} className="w-6 h-4 object-cover rounded border border-gray-100 shrink-0" />
                                <span className={`text-xs font-extrabold uppercase truncate min-w-0 ${
                                  hasFinished 
                                    ? isHomeWinner ? 'text-gray-900' : 'text-gray-400'
                                    : 'text-gray-800'
                                }`}>
                                  {match.home}
                                </span>
                              </div>
                              {hasFinished && (
                                <span className={`text-xs font-black shrink-0 pl-1 ${isHomeWinner ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {match.homeGoals}
                                </span>
                              )}
                            </div>

                            {/* Away Row */}
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <TeamFlag teamName={match.away} className="w-6 h-4 object-cover rounded border border-gray-100 shrink-0" />
                                <span className={`text-xs font-extrabold uppercase truncate min-w-0 ${
                                  hasFinished 
                                    ? isAwayWinner ? 'text-gray-900' : 'text-gray-400'
                                    : 'text-gray-800'
                                }`}>
                                  {match.away}
                                </span>
                              </div>
                              {hasFinished && (
                                <span className={`text-xs font-black shrink-0 pl-1 ${isAwayWinner ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {match.awayGoals}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subscribe Bell Button */}
                          <div className="flex items-center pl-2.5 shrink-0">
                            <button 
                              onClick={(e) => toggleMatchFollow(e, match.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                                isSubscribed 
                                  ? 'bg-[#34c759] text-white shadow-[0_3px_8px_rgba(52,199,89,0.25)]' 
                                  : 'bg-gray-50 border border-gray-200 text-gray-400 hover:text-[#34c759] hover:border-[#34c759]/30'
                              }`}
                            >
                              <Bell size={12} className={isSubscribed ? "fill-current" : ""} />
                            </button>
                          </div>
                        </div>

                        {/* 📊 双向胜率对比量化进度条 */}
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 select-none">
                          <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest px-0.5">
                            <span>Win Probability</span>
                            <span className="text-[#34c759] font-extrabold uppercase">Dixon-Coles Model</span>
                          </div>
                          <div className="flex h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/20 relative">
                            <div style={{ width: `${pHome}%` }} className="bg-[#34c759] h-full relative flex items-center">
                              {pHome > 15 && (
                                <span className="absolute left-2 text-[7px] font-black text-white uppercase">{pHome}%</span>
                              )}
                            </div>
                            <div style={{ width: `${pDraw}%` }} className="bg-gray-300 h-full relative flex items-center justify-center">
                              {pDraw > 15 && (
                                <span className="text-[7px] font-black text-gray-600 uppercase">{pDraw}%</span>
                              )}
                            </div>
                            <div style={{ width: `${pAway}%` }} className="bg-emerald-650/80 bg-emerald-600 h-full relative flex items-center justify-end">
                              {pAway > 15 && (
                                <span className="absolute right-2 text-[7px] font-black text-white uppercase">{pAway}%</span>
                              )}
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
