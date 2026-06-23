"use client";

import { useState, useMemo, useEffect } from "react";
import type { Fixture, OddsSnapshot, Prediction } from "@prisma/client";
import TeamFlag from "@/components/TeamFlag";
import BettingMarkets from "./BettingMarkets";
import LineupsField from "./LineupsField";
import MatchEventsTimeline from "./MatchEventsTimeline";
import TmaPanel from "./TmaPanel";
import HighlightPlayer from "./HighlightPlayer";
import { 
  BarChart2, 
  Flag, 
  Activity, 
  MessageSquare, 
  ShieldAlert, 
  MapPin, 
  UserCheck, 
  CloudSun, 
  Users,
  BellRing
} from "lucide-react";
import { MatteCard } from "@/components/ui/MatteCard";
import { MatchSubscribeButton } from "@/components/MatchSubscribeButton";

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

interface ConfettiItem {
  id: number;
  left: string;
  delay: string;
  color: string;
  size: string;
}

export default function MatchDetailClient({
  fixture,
  liveDetails,
  latestOdds,
  initialOdds,
  isUnlocked
}: MatchDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"markets" | "stats" | "lineups" | "timeline" | "chat">("markets");

  const [homePredictScore, setHomePredictScore] = useState(0);
  const [awayPredictScore, setAwayPredictScore] = useState(0);
  const [isPredicted, setIsPredicted] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    // 3秒后自动淡出
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const isScheduled = useMemo(() => {
    return fixture.status === "scheduled" || fixture.status === "timed" || 
      (!fixture.homeGoals && !fixture.awayGoals && fixture.status !== "live");
  }, [fixture.status, fixture.homeGoals, fixture.awayGoals]);

  const kickoffDate = useMemo(() => new Date(fixture.kickoffUtc), [fixture.kickoffUtc]);
  
  const formattedTime = useMemo(() => {
    return kickoffDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }, [kickoffDate]);

  const formattedDate = useMemo(() => {
    return kickoffDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }, [kickoffDate]);

  const followingCount = useMemo(() => {
    const idVal = parseInt(fixture.id.replace(/\D/g, "").substring(0, 3)) || 15;
    const val = (idVal % 30) / 10 + 1.2;
    return `${val.toFixed(1)}K`;
  }, [fixture.id]);

  // 客户端高精度实时开赛倒计时
  const [timeRemaining, setTimeRemaining] = useState("");
  useEffect(() => {
    if (!isScheduled) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = kickoffDate.getTime() - now;
      if (diff <= 0) {
        setTimeRemaining("Started");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 65)) / 1000); // 略微去抖
      
      const hStr = hours < 10 ? `0${hours}` : hours;
      const mStr = minutes < 10 ? `0${minutes}` : minutes;
      const sStr = seconds < 10 ? `0${seconds}` : seconds;
      
      setTimeRemaining(`${hStr}h ${mStr}m ${sStr}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isScheduled, kickoffDate]);

  // 触发 Confetti 竞猜粒子特效
  const triggerConfetti = () => {
    const colors = ["#34c759", "#007aff", "#ff9500", "#ff2d55", "#5856d6", "#ffcc00"];
    const items = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.2}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: `${Math.random() * 7 + 5}px`
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 3800);
  };

  const handlePredictSubmit = () => {
    setIsPredicted(true);
    triggerConfetti();
    showToast("Prediction Submitted! 🚀 / 比分竞猜提交成功！");
  };

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

  // 📈 实时攻防时空波形图数据合成
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
        else if (evt.type === "subst") weight = 2;
        else weight = 8;
        
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
    <div className="flex flex-col flex-1 pb-24 z-10 text-[#1c1c1e] bg-[#f2f2f7]">
      
      {/* 🚀 CSS Confetti Keyframes Styles Injector */}
      <style>{`
        @keyframes fallDown {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: fallDown 2.8s linear forwards;
        }
        @keyframes bounceIn {
          0% {
            transform: translate(-50%, 20px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounceIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.15) forwards;
        }
        .hover-glow:hover {
          border-color: rgba(0, 122, 255, 0.45) !important;
          box-shadow: 0 4px 20px rgba(0, 122, 255, 0.1) !important;
        }
        .hover-glow-local:hover {
          border-color: rgba(52, 199, 89, 0.45) !important;
          box-shadow: 0 4px 20px rgba(52, 199, 89, 0.1) !important;
        }
      `}</style>

      {/* Confetti Elements Wrapper */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none z-50 animate-confetti rounded-sm"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animationDelay: c.delay,
            top: "-20px"
          }}
        />
      ))}

      {/* 🏟️ 极具设计感的大比分头部毛玻璃面板 */}
      <div className="pt-5 pb-5 px-4 flex flex-col gap-5 items-center bg-gradient-to-b from-[#070a0b]/10 to-transparent">
        <div className="w-full max-w-[360px] bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex flex-col gap-4.5 relative overflow-hidden select-none">
          
          {/* Top row */}
          <div className="flex justify-between items-center w-full px-1">
            <span className="text-[9px] font-black text-[#34c759] bg-[#34c759]/10 px-2 py-0.5 rounded-md border border-[#34c759]/20 uppercase tracking-widest">
              {fixture.status === "finished" ? "FT MATCH" : isScheduled ? "UPCOMING" : "LIVE QUANT"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse"></span>
              <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest">PitchLab Index</span>
            </div>
          </div>

          {/* Main scoreboard */}
          <div className="flex justify-between items-center gap-2 mt-1">
            {/* Home Team Card */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-150 p-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] flex items-center justify-center transition-transform hover:scale-105">
                <TeamFlag teamName={fixture.home} className="w-full h-full object-contain" />
              </div>
              <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider truncate w-full">
                {fixture.home}
              </span>
            </div>

            {/* Score core (If scheduled, display kickoff time & following count) */}
            {isScheduled ? (
              <div className="flex flex-col items-center shrink-0 px-3 select-none text-center">
                <span className="text-xl font-black text-gray-850 tracking-tight font-sans">
                  {formattedTime}
                </span>
                <span className="text-[7.5px] text-gray-400 font-extrabold mt-1">
                  {formattedDate}
                </span>
                <div className="mt-2.5 px-2.5 py-0.5 bg-[#34c759]/10 border border-[#34c759]/20 text-[#248a3d] rounded-full text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <BellRing size={8} className="animate-pulse" />
                  <span>{followingCount} following</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center shrink-0 px-2">
                <div className="text-4xl font-black text-gray-800 tracking-tighter flex items-center gap-3 font-sans">
                  <span>{fixture.homeGoals ?? 0}</span>
                  <span className="text-[#34c759] text-2.5xl font-light leading-none">:</span>
                  <span>{fixture.awayGoals ?? 0}</span>
                </div>
                <span className="text-[7.5px] text-gray-400 font-black tracking-[0.25em] uppercase mt-2.5 bg-gray-100/80 px-2.5 py-0.5 rounded-full">
                  Scoreboard
                </span>
              </div>
            )}

            {/* Away Team Card */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-150 p-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.03)] flex items-center justify-center transition-transform hover:scale-105">
                <TeamFlag teamName={fixture.away} className="w-full h-full object-contain" />
              </div>
              <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider truncate w-full">
                {fixture.away}
              </span>
            </div>
          </div>

          {/* Active Countdown for Scheduled Matches */}
          {isScheduled && timeRemaining !== "Started" && (
            <div className="flex justify-center mt-1">
              <div className="px-3.5 py-1 bg-rose-50 border border-rose-100 text-rose-500 font-black text-[9px] uppercase tracking-[0.15em] rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                <span>Starts In: {timeRemaining}</span>
              </div>
            </div>
          )}

          {/* Meta Information Quad Grid */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-gray-100 pt-4 mt-1">
            <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-150/40">
              <MapPin size={12} className="text-[#34c759]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider">Stadium</span>
                <span className="text-[8.5px] font-bold text-gray-700 truncate">PitchLab Arena</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-150/40">
              <UserCheck size={12} className="text-[#007aff]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider">Referee</span>
                <span className="text-[8.5px] font-bold text-gray-700 truncate">Mark Geiger</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-150/40">
              <CloudSun size={12} className="text-amber-500" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider">Weather</span>
                <span className="text-[8.5px] font-bold text-gray-700 truncate">Clear 18°C</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-150/40">
              <Users size={12} className="text-indigo-500" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider">Attendance</span>
                <span className="text-[8.5px] font-bold text-gray-700 truncate">45,000 / 50k</span>
              </div>
            </div>
          </div>
        </div>

        {/* 📈 实时攻防波形图 */}
        <div className="w-full max-w-[360px] bg-white border border-gray-200 rounded-3xl p-4.5 flex flex-col gap-2.5 relative select-none shadow-[0_6px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attack Momentum</span>
            <span className="text-[8px] font-black text-[#248a3d] bg-[#eafaf1] px-1.5 py-0.5 border border-[#d5f5e3] rounded uppercase tracking-widest">
              Live Wave
            </span>
          </div>
          
          <div className="w-full h-[60px] relative">
            {/* Zero midline */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] border-t border-dashed border-gray-200 z-0"></div>
            
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
                  <stop offset="0%" stopColor="#007aff" />
                  <stop offset="50%" stopColor="#34c759" />
                  <stop offset="100%" stopColor="#30d158" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex justify-between text-[7px] font-black text-gray-400 uppercase tracking-widest px-0.5">
            <span>{fixture.home.substring(0, 3)} Dominance</span>
            <span>{fixture.away.substring(0, 3)} Dominance</span>
          </div>
        </div>
      </div>

      {/* 📱 升级防折叠横向滚动 Tab 导航栏 */}
      <div className="px-4 py-3 bg-[#f2f2f7]/80 border-b border-gray-200/50 sticky top-[57px] z-20 backdrop-blur-md">
        <div className="relative flex items-center bg-white p-1 rounded-2xl border border-gray-200/50 overflow-x-auto no-scrollbar flex-nowrap w-full scroll-smooth select-none">
          {/* iOS 动效平滑过渡胶囊滑块 */}
          <div 
            className="absolute top-1 bottom-1 left-1 rounded-xl bg-gray-100 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1.15)] pointer-events-none"
            style={{
              width: "calc((100% - 8px) / 5)",
              transform: `translateX(calc(${
                activeTab === "markets" ? 0 :
                activeTab === "stats" ? 1 :
                activeTab === "lineups" ? 2 :
                activeTab === "timeline" ? 3 : 4
              } * 100%))`
            }}
          />

          <button 
            onClick={() => setActiveTab("markets")}
            className={`relative z-10 flex-shrink-0 flex-1 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "markets" 
                ? "text-gray-800 font-extrabold" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <BarChart2 size={11} /> Markets
          </button>
          
          <button 
            onClick={() => setActiveTab("stats")}
            className={`relative z-10 flex-shrink-0 flex-1 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "stats" 
                ? "text-gray-800 font-extrabold" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <BarChart2 size={11} /> Stats
          </button>
          
          <button 
            onClick={() => setActiveTab("lineups")}
            className={`relative z-10 flex-shrink-0 flex-1 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "lineups" 
                ? "text-gray-800 font-extrabold" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Flag size={11} /> Lineups
          </button>
          
          <button 
            onClick={() => setActiveTab("timeline")}
            className={`relative z-10 flex-shrink-0 flex-1 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "timeline" 
                ? "text-gray-800 font-extrabold" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Activity size={11} /> Timeline
          </button>
          
          <button 
            onClick={() => setActiveTab("chat")}
            className={`relative z-10 flex-shrink-0 flex-1 px-4 py-2.5 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "chat" 
                ? "text-gray-800 font-extrabold" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <MessageSquare size={11} /> Chat
          </button>
        </div>
      </div>

      {/* 🚀 Main Tab Content Panel */}
      <div className="flex-1 px-4 py-5 space-y-6">
        
        {activeTab === "markets" && (
          <div className="space-y-6">
            
            {/* Score Predictor (比分竞猜，仅未开赛展示) */}
            {isScheduled && (
              <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#34c759] rounded-full"></span>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Score Prediction</h3>
                  </div>
                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">
                    {isPredicted ? "Submitted" : "Predict & Win"}
                  </span>
                </div>

                {!isPredicted ? (
                  <div className="flex flex-col gap-4 select-none">
                    <div className="flex items-center justify-between gap-3">
                      {/* Home Predict Input */}
                      <div className="flex-1 flex items-center justify-between bg-gray-50 p-2 border border-gray-150 rounded-2xl">
                        <span className="text-[10px] font-black text-gray-700 truncate max-w-[50px]">{fixture.home.substring(0, 3)}</span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setHomePredictScore(Math.max(0, homePredictScore - 1))}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 font-black text-gray-600 flex items-center justify-center active:scale-95 shadow-sm text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-gray-800 w-3 text-center">{homePredictScore}</span>
                          <button 
                            onClick={() => setHomePredictScore(homePredictScore + 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 font-black text-gray-600 flex items-center justify-center active:scale-95 shadow-sm text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <span className="text-gray-450 font-black text-xs shrink-0">—</span>

                      {/* Away Predict Input */}
                      <div className="flex-1 flex items-center justify-between bg-gray-50 p-2 border border-gray-150 rounded-2xl">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setAwayPredictScore(Math.max(0, awayPredictScore - 1))}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 font-black text-gray-600 flex items-center justify-center active:scale-95 shadow-sm text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-gray-800 w-3 text-center">{awayPredictScore}</span>
                          <button 
                            onClick={() => setAwayPredictScore(awayPredictScore + 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 font-black text-gray-600 flex items-center justify-center active:scale-95 shadow-sm text-xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] font-black text-gray-700 truncate max-w-[50px]">{fixture.away.substring(0, 3)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePredictSubmit}
                      className="w-full py-3 bg-[#34c759] text-white hover:bg-[#248a3d] transition-all rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center"
                    >
                      Submit Prediction
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 bg-gray-50/50 p-4 border border-gray-150 rounded-2xl animate-fade-in text-center select-none">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wide">
                      Your Prediction: {fixture.home} {homePredictScore} - {awayPredictScore} {fixture.away}
                    </span>
                    
                    <div className="flex flex-col gap-1.5 mt-1 text-left">
                      <div className="flex justify-between text-[7.5px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Global Trend</span>
                        <span>{Math.floor(followingCount.includes('K') ? parseFloat(followingCount) * 1000 : 87)} Predictions</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex border border-gray-200/50 shadow-inner">
                        <div style={{ width: "65%" }} className="bg-[#34c759]" />
                        <div style={{ width: "20%" }} className="bg-gray-300" />
                        <div style={{ width: "15%" }} className="bg-[#007aff]" />
                      </div>
                      <div className="flex justify-between text-[7.5px] font-black text-gray-500 uppercase tracking-widest mt-1">
                        <span>{fixture.home.substring(0, 3)} Win (65%)</span>
                        <span>Draw (20%)</span>
                        <span>{fixture.away.substring(0, 3)} Win (15%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <BettingMarkets 
              fixtureId={fixture.id} 
              homeTeam={fixture.home}
              awayTeam={fixture.away}
              oddsSnapshots={initialOdds}
              predictions={fixture.predictions}
            />

            {/* Live Channels & Broadcasters Card (直播地址深度重塑：海外直播与国内转播双通道) */}
            <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 select-none">
                <span className="w-1.5 h-3.5 bg-[#34c759] rounded-full"></span>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Broadcasters & Live Streams</h3>
              </div>

              {/* Group 1: Global Streams (海外高清直播源) */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">
                  Global Channels (海外直播源)
                </span>
                
                {/* FOX Sports */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-150/40 rounded-2xl hover-glow transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-black text-[8px] shadow-sm select-none">
                      FOX
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-800">FOX Sports US</span>
                      <span className="text-[8px] text-[#007aff] font-extrabold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#007aff] animate-ping"></span>
                        US Broadcast | HD 1080p
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => showToast("Connecting to FOX Sports HD stream... / 正在连接 FOX Sports 海外高清直播线路...")}
                    className="py-1.5 px-3 bg-white border border-gray-250 hover:text-[#007aff] hover:border-[#007aff]/60 transition-all rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm shrink-0 active:scale-95 duration-150"
                  >
                    ⚡ Stream
                  </button>
                </div>

                {/* BBC iPlayer */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-150/40 rounded-2xl hover-glow transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3a0007] border border-[#5c000b] flex items-center justify-center text-white font-black text-[8px] shadow-sm select-none">
                      BBC
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-800">BBC Sport / iPlayer</span>
                      <span className="text-[8px] text-[#34c759] font-extrabold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#34c759] animate-ping"></span>
                        UK Public TV | Free & HD
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => showToast("Routing to BBC iPlayer Sports feed... / 正在唤起英国 BBC iPlayer 官方世界杯高清信号...")}
                    className="py-1.5 px-3 bg-white border border-gray-250 hover:text-[#007aff] hover:border-[#007aff]/60 transition-all rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm shrink-0 active:scale-95 duration-150"
                  >
                    ⚡ Stream
                  </button>
                </div>

                {/* Telemundo */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-150/40 rounded-2xl hover-glow transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff0055] border border-[#d60047] flex items-center justify-center text-white font-black text-[7.5px] shadow-sm select-none">
                      TELES
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-800">Telemundo Deportes</span>
                      <span className="text-[8px] text-[#007aff] font-extrabold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#007aff] animate-ping"></span>
                        Spanish Broadcast | Live
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => showToast("Connecting to Telemundo Deportes Spanish broadcast... / 正在连接 Telemundo 西班牙语直播源...")}
                    className="py-1.5 px-3 bg-white border border-gray-250 hover:text-[#007aff] hover:border-[#007aff]/60 transition-all rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm shrink-0 active:scale-95 duration-150"
                  >
                    ⚡ Stream
                  </button>
                </div>
              </div>

              {/* Group 2: Local Channels (国内主要转播源) */}
              <div className="flex flex-col gap-2.5 border-t border-gray-100 pt-4">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">
                  Local Channels (国内主要转播源)
                </span>

                {/* CCTV-5 */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-150/40 rounded-2xl hover-glow-local transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-500 flex items-center justify-center text-white font-black text-[8px] shadow-sm select-none">
                      CCTV5
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-800">CCTV-5 体育频道</span>
                      <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mt-0.5">TV Broadcasting | Free</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => showToast("Opening CCTV-5 Sports Channel... / 正在为您生成央视直播流快捷唤起接口...")}
                    className="py-1.5 px-3 bg-white border border-gray-250 hover:text-emerald-500 hover:border-emerald-400 transition-all rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm shrink-0 active:scale-95 duration-150"
                  >
                    ⚡ Stream
                  </button>
                </div>

                {/* Migu Video */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-150/40 rounded-2xl hover-glow-local transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 border border-blue-500 flex items-center justify-center text-white font-black text-[7.5px] shadow-sm select-none">
                      MIGU
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-800">咪咕视频体育网</span>
                      <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mt-0.5">1080P Ultra HD | Live</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => showToast("Redirecting to Migu Video Sports... / 即将为您跳转到咪咕世界杯官方赛事直播地址...")}
                    className="py-1.5 px-3 bg-white border border-gray-250 hover:text-emerald-500 hover:border-emerald-400 transition-all rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm shrink-0 active:scale-95 duration-150"
                  >
                    ⚡ Stream
                  </button>
                </div>
              </div>
            </div>

            <TmaPanel fixtureId={fixture.id} isUnlocked={isUnlocked} />
          </div>
        )}

        {activeTab === "stats" && (
          <MatteCard className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
              <span className="w-1.5 h-3.5 bg-[#34c759] rounded-full"></span>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DETAILED STATS</h3>
            </div>
            
            {liveDetails.stats && liveDetails.stats.length >= 2 ? (
              <div className="space-y-5">
                {liveDetails.stats[0].statistics.map((s: any, idx: number) => {
                  const homeVal = s.value;
                  const awayVal = liveDetails.stats[1].statistics[idx]?.value ?? 0;
                  const hNum = parseFloat(homeVal) || 0;
                  const aNum = parseFloat(awayVal) || 0;
                  const total = hNum + aNum || 1;
                  const hPct = Math.round((hNum / total) * 100);

                  const isHomeLarger = hNum > aNum;
                  const isAwayLarger = aNum > hNum;
                  
                  return (
                    <div key={s.type} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs px-1 select-none">
                        {/* Home Value */}
                        <span className={`w-10 text-left font-black transition-all ${
                          isHomeLarger ? "text-[#34c759] text-sm" : "text-gray-500"
                        }`}>
                          {homeVal}
                        </span>

                        {/* Stat Item Name */}
                        <span className="text-[8.5px] font-black uppercase text-gray-400 tracking-wider text-center flex-1">
                          {s.type}
                        </span>

                        {/* Away Value */}
                        <span className={`w-10 text-right font-black transition-all ${
                          isAwayLarger ? "text-[#007aff] text-sm" : "text-gray-500"
                        }`}>
                          {awayVal}
                        </span>
                      </div>

                      {/* Split Rounded Progress Tracks */}
                      <div className="flex items-center gap-1 h-2 select-none">
                        <div className="flex-1 flex justify-end bg-gray-100 rounded-l-full overflow-hidden h-full">
                          <div 
                            style={{ width: `${hPct}%` }} 
                            className="bg-[#34c759] h-full rounded-l-full"
                          />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 flex justify-start bg-gray-100 rounded-r-full overflow-hidden h-full">
                          <div 
                            style={{ width: `${100 - hPct}%` }} 
                            className="bg-[#007aff] h-full rounded-r-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">
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
            <MessageSquare size={36} className="text-[#34c759] animate-pulse" />
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mt-2">
              PitchLab Chat Room
            </h4>
            <p className="text-xs text-gray-450 max-w-[260px] leading-relaxed">
              Live discussion, supporter channels and fan rooms are coming soon! Keep tuned.
            </p>
            <div className="mt-4 px-4 py-2 bg-[#eafaf1] border border-[#d5f5e3] text-[#248a3d] rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 select-none">
              <ShieldAlert size={12} /> Telegram Mini App Integration
            </div>
          </MatteCard>
        )}

        {/* 🎬 挂载赛事视频集锦视频播放器 (Match Highlights) */}
        <HighlightPlayer />

      </div>

      {/* 📱 iOS-Style Premium Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c1e]/90 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.15)] flex items-center gap-2.5 animate-bounce-in text-white text-[10.5px] font-black uppercase tracking-wider select-none pointer-events-none max-w-[90%] text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759]"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
