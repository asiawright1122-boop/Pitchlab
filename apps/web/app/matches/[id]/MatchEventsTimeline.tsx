"use client";

import React from "react";

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
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm text-center">
        <p className="text-sm text-slate-400">本场比赛暂无关键事件记录</p>
      </div>
    );
  }

  // 排序：将事件按时间升序排列
  const sortedEvents = [...events].sort((a, b) => a.time.elapsed - b.time.elapsed);

  const renderEventIcon = (type: string, detail: string) => {
    if (type === "Goal") {
      if (detail === "Penalty") {
        return (
          <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-sm text-xs select-none">
            ⚽️
          </span>
        );
      }
      return (
        <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-sm text-sm select-none">
          ⚽
        </span>
      );
    }

    if (type === "Card") {
      const isRed = detail.toLowerCase().includes("red");
      return (
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm select-none ${
          isRed ? "bg-rose-500 text-white" : "bg-amber-400 text-slate-800"
        }`}>
          {isRed ? "🟥" : "🟨"}
        </span>
      );
    }

    if (type === "Subst" || type === "subst") {
      return (
        <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm text-xs select-none">
          🔄
        </span>
      );
    }

    // Default VAR or generic
    return (
      <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm text-xs select-none">
        🖥️
      </span>
    );
  };

  const isHomeEvent = (teamName: string) => {
    return teamName.toLowerCase() === homeTeam.toLowerCase();
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-md transition-all flex flex-col gap-6">
      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <span className="w-2.5 h-6 bg-[#e04039] rounded-full inline-block"></span>
        赛况直播与重要事件 (Timeline)
      </h3>

      <div className="relative border-l border-slate-200 ml-4 md:ml-6 pl-6 py-2 flex flex-col gap-6">
        {sortedEvents.map((ev, index) => {
          const home = isHomeEvent(ev.team.name);
          return (
            <div 
              key={`event-${index}`} 
              className="relative flex items-start group animate-fade-in"
            >
              {/* 时间线轴上图标 */}
              <div className="absolute -left-[41px] top-1 z-10 transition-transform group-hover:scale-110">
                {renderEventIcon(ev.type, ev.detail)}
              </div>

              {/* 事件卡片内容 */}
              <div className="bg-slate-50/60 hover:bg-slate-50 border border-slate-150 rounded-xl p-4 flex-1 flex items-center justify-between shadow-sm transition-all">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#e04039]">
                      {ev.time.elapsed}'
                      {ev.time.extra ? `+${ev.time.extra}` : ""}
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
                      {ev.team.name}
                    </span>
                    {ev.detail && (
                      <span className="text-[10px] font-extrabold text-slate-550 border border-slate-300/60 px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                        {ev.detail}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-extrabold text-slate-800 mt-1">
                    {ev.player.name}
                  </div>

                  {ev.assist && (
                    <div className="text-xs text-slate-450 font-bold flex items-center gap-1">
                      <span className="text-[10px]">👟</span> 
                      助攻: {ev.assist.name}
                    </div>
                  )}
                </div>

                {/* 主客队徽章区分指示 */}
                <div className="flex items-center">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    home 
                      ? "bg-blue-50 text-blue-600 border border-blue-100" 
                      : "bg-red-50 text-red-600 border border-red-100"
                  }`}>
                    {home ? "主队" : "客队"}
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
