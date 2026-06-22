"use client";

import { useState, useMemo } from "react";
import type { Fixture, OddsSnapshot, Prediction } from "@prisma/client";
import TeamFlag from "@/components/TeamFlag";
import BettingMarkets from "./BettingMarkets";
import LineupsField from "./LineupsField";
import MatchEventsTimeline from "./MatchEventsTimeline";
import TmaPanel from "./TmaPanel";
import { Activity, Flag, BarChart2, MessageSquare, ShieldAlert, BarChart, Shield } from "lucide-react";
import { MatteCard } from "@/components/ui/MatteCard";

interface MatchDetailClientProps {
  fixture: Fixture & { predictions: Prediction[] };
  liveDetails: {
    lineups: any[];
    stats: any[];
    events: any[];
  };
  latestOdds: {
    home: number;
    draw: number;
    away: number;
  };
  initialOdds: OddsSnapshot[];
  isUnlocked: boolean;
}

export default function MatchDetailClient({
  fixture,
  liveDetails,
  latestOdds,
  initialOdds,
  isUnlocked
}: MatchDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"markets" | "stats" | "lineups" | "timeline" | "chat">("markets");

  const hasFinished = fixture.status === "finished";

  // Parse stats for circular meter presentation
  const statsSummary = useMemo(() => {
    if (!liveDetails.stats || liveDetails.stats.length < 2) {
      return {
        possession: { home: "50%", away: "50%", homeVal: 50, awayVal: 50 },
        shots: { home: 0, away: 0, homeVal: 50, awayVal: 50 },
        fouls: { home: 0, away: 0, homeVal: 50, awayVal: 50 }
      };
    }

    const homeStats = liveDetails.stats[0]?.statistics || [];
    const awayStats = liveDetails.stats[1]?.statistics || [];

    const getVal = (statsList: any[], type: string, defaultVal: string | number) => {
      const item = statsList.find((s: any) => s.type === type);
      return item ? item.value : defaultVal;
    };

    const homePoss = getVal(homeStats, "Ball Possession", "50%");
    const awayPoss = getVal(awayStats, "Ball Possession", "50%");
    const homePossNum = parseInt(homePoss) || 50;
    const awayPossNum = parseInt(awayPoss) || 50;

    const homeShots = parseInt(getVal(homeStats, "Total Shots", 0)) || 0;
    const awayShots = parseInt(getVal(awayStats, "Total Shots", 0)) || 0;
    const totalShots = homeShots + awayShots || 1;
    const homeShotsPct = Math.round((homeShots / totalShots) * 100);

    const homeFouls = parseInt(getVal(homeStats, "Fouls", 0)) || 0;
    const awayFouls = parseInt(getVal(awayStats, "Fouls", 0)) || 0;
    const totalFouls = homeFouls + awayFouls || 1;
    const homeFoulsPct = Math.round((homeFouls / totalFouls) * 100);

    return {
      possession: { 
        home: `${homePossNum}%`, 
        away: `${awayPossNum}%`, 
        homeVal: homePossNum, 
        awayVal: awayPossNum 
      },
      shots: { 
        home: homeShots, 
        away: awayShots, 
        homeVal: homeShotsPct, 
        awayVal: 100 - homeShotsPct 
      },
      fouls: { 
        home: homeFouls, 
        away: awayFouls, 
        homeVal: homeFoulsPct, 
        awayVal: 100 - homeFoulsPct 
      }
    };
  }, [liveDetails]);

  // 📈 实时攻防时空波形图数据合成 (攻防分时图，类似股市 K 线)
  const momentumPoints = useMemo(() => {
    const points: number[] = [];
    const events = liveDetails.events || [];
    
    if (events.length > 0) {
      const buckets = Array(24).fill(0);
      events.forEach((evt: any) => {
        const min = parseInt(evt.time?.elapsed) || 0;
        const bucketIdx = Math.min(23, Math.floor((min / 90) * 24));
        
        let weight = 0;
        if (evt.type === "Goal") weight = 40;
        else if (evt.detail?.includes("Card")) weight = evt.detail?.includes("Red") ? -25 : -5;
        else if (evt.type === "subst") weight = 2; // 调整
        else weight = 8; // 射门/进攻等
        
        const isHome = evt.team?.name === fixture.home;
        buckets[bucketIdx] += isHome ? weight : -weight;
      });
      
      let current = 0;
      for (let i = 0; i < 24; i++) {
        current = current * 0.45 + buckets[i] * 0.55;
        points.push(Math.max(-45, Math.min(45, current)));
      }
    } else {
      const seed = parseInt(fixture.id.replace(/\D/g, "").substring(0, 5)) || 42;
      const homeGoalCount = fixture.homeGoals ?? 0;
      const awayGoalCount = fixture.awayGoals ?? 0;
      const goalDiff = (homeGoalCount - awayGoalCount) * 12;
      
      for (let i = 0; i < 24; i++) {
        const wave = Math.sin(i * 0.8 + seed) * 18 + Math.cos(i * 0.45 - seed) * 8;
        const trend = (i / 23) * goalDiff;
        points.push(Math.max(-45, Math.min(45, wave + trend)));
      }
    }
    
    return points;
  }, [liveDetails.events, fixture]);

  const momentumPath = useMemo(() => {
    if (momentumPoints.length === 0) return "";
    const w = 340;
    const h = 60;
    const step = w / (momentumPoints.length - 1);
    const midY = h / 2;
    
    return momentumPoints.map((p, i) => {
      const x = i * step;
      const y = midY - (p / 45) * (h / 2) * 0.8;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [momentumPoints]);

  return (
    <div className="flex flex-col flex-1 pb-24 z-10">
      
      {/* 🏟️ 3D Isometric 战术球场沙盘 */}
      <div className="bg-pitch-green border-b border-[#202b30] pt-6 pb-6 px-4 flex flex-col gap-6 items-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Isometric Sandbox Container */}
        <div className="w-full max-w-[340px] h-[190px] isometric-perspective flex items-center justify-center relative overflow-hidden select-none">
          {/* Isometric Grass Field Grid */}
          <div className="w-[380px] h-[260px] bg-[#10b981]/5 border-2 border-emerald-500/20 rounded-3xl isometric-pitch flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-pitch-green opacity-40"></div>
            
            {/* Field Lines */}
            <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-white/10"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/10"></div>
            
            {/* Penalty Areas */}
            <div className="absolute left-0 top-[22%] w-[18%] h-[56%] border-r border-y border-white/10"></div>
            <div className="absolute right-0 top-[22%] w-[18%] h-[56%] border-l border-y border-white/10"></div>
          </div>

          {/* Isometric Floating Tactical Cards */}
          {/* Home Logo */}
          <div className="absolute left-[12%] top-[25%] isometric-float flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#0f1416]/95 border border-emerald-500/40 p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.8)] flex items-center justify-center transition-transform hover:scale-105">
              <TeamFlag teamName={fixture.home} className="w-full h-full object-contain" />
            </div>
            <span className="text-[9px] font-black text-emerald-400 bg-[#070a0b]/90 border border-emerald-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {fixture.home}
            </span>
          </div>

          {/* Away Logo */}
          <div className="absolute right-[12%] top-[25%] isometric-float flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#0f1416]/95 border border-[#202b30] p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.8)] flex items-center justify-center transition-transform hover:scale-105">
              <TeamFlag teamName={fixture.away} className="w-full h-full object-contain" />
            </div>
            <span className="text-[9px] font-black text-gray-300 bg-[#070a0b]/90 border border-[#202b30] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {fixture.away}
            </span>
          </div>

          {/* Floating Score overlay */}
          <div className="absolute top-[42%] text-center z-20 select-none">
            <div className="text-4.5xl font-black text-white tracking-tighter drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] flex items-center gap-4.5 font-sans">
              <span>{fixture.homeGoals ?? 0}</span>
              <span className="text-emerald-500 animate-pulse text-3xl font-light">:</span>
              <span>{fixture.awayGoals ?? 0}</span>
            </div>
            <div className="mt-2.5 px-3 py-0.5 bg-[#070a0b]/90 border border-emerald-500/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-[0.2em] inline-block shadow-[0_0_8px_rgba(16,185,129,0.15)]">
              {fixture.status === "finished" ? "FT MATCH" : "LIVE QUANT"}
            </div>
          </div>
        </div>

        {/* 📈 实时攻防时空分时图 (Attack Momentum Wave) */}
        <div className="w-full max-w-[340px] bg-[#070a0b]/75 border border-[#202b30] rounded-2xl p-4.5 flex flex-col gap-2.5 relative select-none">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Attack Momentum</span>
            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 border border-emerald-500/20 rounded uppercase tracking-widest">
              Live Wave
            </span>
          </div>
          
          <div className="w-full h-[60px] relative">
            {/* Zero midline */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] border-t border-dashed border-gray-700/60 z-0"></div>
            
            <svg className="w-full h-full relative z-10" viewBox="0 0 340 60" preserveAspectRatio="none">
              <path 
                d={momentumPath} 
                fill="none" 
                stroke="url(#waveGradient)" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex justify-between text-[7px] font-black text-gray-600 uppercase tracking-widest px-0.5">
            <span>{fixture.home.substring(0, 3)} Dominance</span>
            <span>{fixture.away.substring(0, 3)} Dominance</span>
          </div>
        </div>

      </div>

      {/* 📱 Interactive Premium Tab Menu */}
      <div className="px-4 py-3 bg-[#070a0b]/80 border-b border-[#202b30] sticky top-[57px] z-20 backdrop-blur-md">
        <div className="flex justify-center items-center gap-1 bg-[#0f1416] p-1 rounded-2xl border border-[#202b30] overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab("markets")}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === "markets" 
                ? "bg-[#202b30] text-white shadow-sm border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <BarChart2 size={11} /> Markets
          </button>
          
          <button 
            onClick={() => setActiveTab("stats")}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === "stats" 
                ? "bg-[#202b30] text-white shadow-sm border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <BarChart2 size={11} /> Stats
          </button>
          
          <button 
            onClick={() => setActiveTab("lineups")}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === "lineups" 
                ? "bg-[#202b30] text-white shadow-sm border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Flag size={11} /> Lineups
          </button>
          
          <button 
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === "timeline" 
                ? "bg-[#202b30] text-white shadow-sm border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Activity size={11} /> Timeline
          </button>
          
          <button 
            onClick={() => setActiveTab("chat")}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === "chat" 
                ? "bg-[#202b30] text-white shadow-sm border border-[#2c3c43]" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <MessageSquare size={11} /> Chat
          </button>
        </div>
      </div>

      {/* 🚀 Main Sliding Tab View Content */}
      <div className="flex-1 px-4 py-5 space-y-6">
        
        {activeTab === "markets" && (
          <div className="space-y-6">
            <BettingMarkets 
              fixtureId={fixture.id} 
              homeTeam={fixture.home}
              awayTeam={fixture.away}
              oddsSnapshots={initialOdds}
              predictions={fixture.predictions}
            />
            <TmaPanel fixtureId={fixture.id} isUnlocked={isUnlocked} />
          </div>
        )}

        {activeTab === "stats" && (
          <MatteCard className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2 border-b border-[#202b30]/85 pb-3">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">DETAILED STATS</h3>
            </div>
            
            {liveDetails.stats && liveDetails.stats.length >= 2 ? (
              <div className="space-y-4">
                {liveDetails.stats[0].statistics.map((s: any, idx: number) => {
                  const homeVal = s.value;
                  const awayVal = liveDetails.stats[1].statistics[idx]?.value ?? 0;
                  const hNum = parseFloat(homeVal) || 0;
                  const aNum = parseFloat(awayVal) || 0;
                  const total = hNum + aNum || 1;
                  const hPct = Math.round((hNum / total) * 100);
                  
                  return (
                    <div key={s.type} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-400 px-1">
                        <span>{homeVal}</span>
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">{s.type}</span>
                        <span>{awayVal}</span>
                      </div>
                      <div className="flex h-2 bg-[#070a0b] rounded-full overflow-hidden border border-[#202b30]/40">
                        <div style={{ width: `${hPct}%` }} className="bg-emerald-500"></div>
                        <div style={{ width: `${100 - hPct}%` }} className="bg-emerald-800"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">
                No statistics records for this match.
              </div>
            )}
          </MatteCard>
        )}

        {activeTab === "lineups" && (
          <LineupsField 
            lineups={liveDetails.lineups} 
            homeTeam={fixture.home} 
            awayTeam={fixture.away} 
          />
        )}

        {activeTab === "timeline" && (
          <MatchEventsTimeline 
            events={liveDetails.events} 
            homeTeam={fixture.home} 
            awayTeam={fixture.away} 
          />
        )}

        {activeTab === "chat" && (
          <MatteCard className="p-8 text-center flex flex-col items-center justify-center gap-4 py-16">
            <MessageSquare size={36} className="text-emerald-500 animate-pulse" />
            <h4 className="text-sm font-black text-white uppercase tracking-widest mt-2">
              PitchLab Chat Room
            </h4>
            <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed">
              Live discussion, supporter channels and fan rooms are coming soon! Keep tuned.
            </p>
            <div className="mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 select-none">
              <ShieldAlert size={12} /> Telegram Mini App Integration
            </div>
          </MatteCard>
        )}

      </div>
    </div>
  );
}
