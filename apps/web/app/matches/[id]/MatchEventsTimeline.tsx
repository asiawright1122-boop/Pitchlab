"use client";

import React from "react";
import { Activity, Clock, ShieldAlert, Award, RefreshCw } from "lucide-react";

interface MatchEvent {
  time: { elapsed: number; extra: number | null };
  team: { name: string; logo?: string };
  player: { name: string };
  assist: { name: string } | null;
  type: string; // Goal | Card | Subst | Var
  detail: string; // Normal Goal | Yellow Card | Red Card | Penalty | ...
}

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  homeTeam: string;
  awayTeam: string;
}

export default function MatchEventsTimeline({ events, homeTeam, awayTeam }: MatchEventsTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center justify-center py-12">
        <ShieldAlert size={28} className="text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">No match events recorded yet</p>
      </div>
    );
  }

  // 排序：将事件按时间升序排列
  const sortedEvents = [...events].sort((a, b) => a.time.elapsed - b.time.elapsed);

  const isHomeEvent = (teamName: string) => {
    return teamName.toLowerCase() === homeTeam.toLowerCase();
  };

  const getEventStyle = (type: string, detail: string) => {
    const typeLower = type.toLowerCase();
    const detailLower = detail ? detail.toLowerCase() : "";

    if (typeLower === "goal") {
      return {
        cardBg: "bg-gradient-to-tr from-[#34c759]/5 via-[#34c759]/8 to-[#34c759]/3 border-[#34c759]/30",
        tagBg: "bg-[#34c759]/10 text-[#248a3d] border-[#34c759]/20",
        icon: (
          <span className="w-8 h-8 rounded-full bg-[#34c759] text-white flex items-center justify-center font-black shadow-[0_2px_8px_rgba(52,199,89,0.3)] text-sm select-none">
            ⚽
          </span>
        )
      };
    }

    if (typeLower === "card") {
      const isRed = detailLower.includes("red");
      if (isRed) {
        return {
          cardBg: "bg-gradient-to-tr from-rose-500/5 via-rose-500/8 to-rose-500/3 border-rose-500/30",
          tagBg: "bg-rose-500/10 text-rose-700 border-rose-500/20",
          icon: (
            <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-black shadow-[0_2px_8px_rgba(244,63,94,0.3)] text-xs select-none">
              🟥
            </span>
          )
        };
      }
      return {
        cardBg: "bg-gradient-to-tr from-amber-500/5 via-amber-500/8 to-amber-500/3 border-amber-500/30",
        tagBg: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        icon: (
          <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-800 flex items-center justify-center font-black shadow-[0_2px_8px_rgba(245,158,11,0.3)] text-xs select-none">
            🟨
          </span>
        )
      };
    }

    if (typeLower === "subst") {
      return {
        cardBg: "bg-gradient-to-tr from-[#007aff]/5 via-[#007aff]/8 to-[#007aff]/3 border-[#007aff]/30",
        tagBg: "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/20",
        icon: (
          <span className="w-8 h-8 rounded-full bg-[#007aff] text-white flex items-center justify-center font-black shadow-[0_2px_8px_rgba(0,122,255,0.3)] text-[10px] select-none">
            🔄
          </span>
        )
      };
    }

    // Default or VAR
    return {
      cardBg: "bg-gradient-to-tr from-indigo-500/5 via-indigo-500/8 to-indigo-500/3 border-indigo-500/30",
      tagBg: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
      icon: (
        <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black shadow-[0_2px_8px_rgba(99,102,241,0.3)] text-xs select-none">
          🖥️
        </span>
      )
    };
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] transition-all flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1 border-b border-gray-100 pb-3">
        <Activity size={14} className="text-[#34c759]" />
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Match Timeline</h3>
      </div>

      <div className="relative border-l-2 border-gray-100 ml-4 md:ml-6 pl-6 py-2 flex flex-col gap-6 select-none">
        {sortedEvents.map((ev, index) => {
          const home = isHomeEvent(ev.team.name);
          const style = getEventStyle(ev.type, ev.detail);

          return (
            <div 
              key={`event-${index}`} 
              className="relative flex items-start group animate-fade-in"
            >
              {/* Timeline Axle Icon */}
              <div className="absolute -left-[41px] top-1 z-10 transition-transform duration-300 group-hover:scale-110">
                {style.icon}
              </div>

              {/* Event Card Panel */}
              <div className={`border rounded-2xl p-4 flex-1 flex items-center justify-between shadow-sm transition-all duration-300 ${style.cardBg}`}>
                <div className="flex flex-col gap-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-gray-800 flex items-center gap-0.5">
                      <Clock size={10} className="text-gray-400" />
                      {ev.time.elapsed}'
                      {ev.time.extra ? `+${ev.time.extra}` : ""}
                    </span>
                    <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 uppercase tracking-wider truncate max-w-[110px]">
                      {ev.team.name}
                    </span>
                    {ev.detail && (
                      <span className={`text-[7.5px] font-black border px-1.5 py-0.2 rounded-md uppercase tracking-wider ${style.tagBg}`}>
                        {ev.detail}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-black text-gray-800 mt-1 truncate">
                    {ev.player.name}
                  </div>

                  {ev.assist && (
                    <div className="text-[9.5px] text-gray-400 font-bold flex items-center gap-1.5 mt-0.5">
                      <Award size={10} className="text-gray-400" />
                      <span>Assist: {ev.assist.name}</span>
                    </div>
                  )}
                </div>

                {/* Team label badge */}
                <div className="flex-shrink-0">
                  <span className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    home 
                      ? "bg-[#34c759]/10 text-[#248a3d] border-[#34c759]/20" 
                      : "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/20"
                  }`}>
                    {home ? "Home" : "Away"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
