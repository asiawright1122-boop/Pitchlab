"use client";

import React, { useState } from "react";
import { User, Activity, AlertCircle } from "lucide-react";

interface Player {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string; // e.g. "1:1", "2:3"
  rating: string;
}

interface TeamLineup {
  team: { name: string; logo?: string };
  formation: string;
  startXI: { player: Player }[];
  substitutes: { player: Player }[];
}

interface LineupsFieldProps {
  lineups: TeamLineup[];
  homeTeam: string;
  awayTeam: string;
}

export default function LineupsField({ lineups, homeTeam, awayTeam }: LineupsFieldProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  if (!lineups || lineups.length < 2) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center justify-center py-12">
        <AlertCircle size={28} className="text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">Lineup not available yet</p>
      </div>
    );
  }

  const homeLineup = lineups[0];
  const awayLineup = lineups[1];

  // 提取首字母 (e.g. Patrik Schick -> PS)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // 计算球员绝对定位百分比的辅助函数 (主队在下半场 50% - 95%，客队在上半场 5% - 50%)
  const getPlayerPosition = (grid: string, isHome: boolean) => {
    if (!grid) return { top: "50%", left: "50%" };
    const [rowStr, colStr] = grid.split(":");
    const row = parseInt(rowStr) || 1;
    const col = parseInt(colStr) || 1;

    const totalColsMap: Record<number, number> = { 1: 1, 2: 4, 3: 3, 4: 3, 5: 2 };
    
    const XI = isHome ? homeLineup.startXI : awayLineup.startXI;
    const playersInRow = XI.filter(p => p.player.grid && p.player.grid.startsWith(`${row}:`));
    const totalInRow = playersInRow.length || totalColsMap[row] || 3;
    
    // 纵向 top 比例计算
    let topPercent = 50;
    if (isHome) {
      // 主队：门将(1) -> 90% | 后卫(2) -> 74% | 中场(3) -> 61% | 前锋(4) -> 53%
      const rowTops: Record<number, number> = { 1: 88, 2: 73, 3: 61, 4: 53 };
      topPercent = rowTops[row] || (88 - (row - 1) * 12);
    } else {
      // 客队：门将(1) -> 12% | 后卫(2) -> 27% | 中场(3) -> 39% | 前锋(4) -> 47%
      const rowTops: Record<number, number> = { 1: 12, 2: 27, 3: 39, 4: 47 };
      topPercent = rowTops[row] || (12 + (row - 1) * 12);
    }

    // 横向 left 比例计算
    let leftPercent = 50;
    if (totalInRow <= 1) {
      leftPercent = 50;
    } else {
      const step = 82 / (totalInRow - 1);
      const colOrder = Array.from(new Set(playersInRow.map(p => parseInt(p.player.grid.split(":")[1]) || 1))).sort((a, b) => a - b);
      const idx = colOrder.indexOf(col);
      leftPercent = 9 + (idx >= 0 ? idx : 0) * step;
    }

    return { top: `${topPercent}%`, left: `${leftPercent}%` };
  };

  const renderPlayer = (player: Player, isHome: boolean) => {
    const pos = getPlayerPosition(player.grid, isHome);
    const active = selectedPlayer?.id === player.id;
    const ratingVal = parseFloat(player.rating) || 0;
    
    // 根据评分决定颜色
    let ratingColorClass = "bg-gray-400";
    if (ratingVal >= 7.5) ratingColorClass = "bg-[#34c759]";
    else if (ratingVal <= 6.5) ratingColorClass = "bg-rose-500";
    else if (ratingVal > 0) ratingColorClass = "bg-amber-500";

    // 根据主客队分配头像底色
    const avatarBg = isHome 
      ? "bg-gradient-to-tr from-[#34c759]/20 to-[#34c759]/40 border-[#34c759]/50 text-[#1b4332]" 
      : "bg-gradient-to-tr from-[#007aff]/20 to-[#007aff]/40 border-[#007aff]/50 text-[#0a2540]";

    return (
      <button
        key={`${isHome ? "home" : "away"}-player-${player.id}`}
        onClick={() => setSelectedPlayer(player)}
        style={{ top: pos.top, left: pos.left }}
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none z-10"
      >
        <div className="relative">
          {/* Circular Avatar Container */}
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-[11px] border-2 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.12)] ${
            active 
              ? "bg-[#34c759] text-white border-white scale-110 ring-4 ring-[#34c759]/30" 
              : `bg-white ${avatarBg} hover:border-white group-hover:scale-105`
          }`}>
            {getInitials(player.name)}
          </div>

          {/* Left-Bottom Shirt Number Badge */}
          <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-slate-900/90 backdrop-blur-sm border border-white/40 text-[8px] font-black text-white rounded-full flex items-center justify-center shadow-md">
            {player.number}
          </span>

          {/* Right-Top Rating Badge */}
          {ratingVal > 0 && (
            <span className={`absolute -top-1 -right-1.5 text-[8px] font-black text-white px-1 py-0.2 rounded-full border border-white shadow-sm scale-90 ${ratingColorClass}`}>
              {ratingVal.toFixed(1)}
            </span>
          )}
        </div>

        {/* Semi-transparent Name Label */}
        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 shadow-sm max-w-[65px] truncate text-center border transition-all ${
          active 
            ? "bg-[#34c759] text-white border-[#34c759]" 
            : "bg-black/50 backdrop-blur-[3px] text-white/90 border-white/10 group-hover:bg-black/65"
        }`}>
          {player.name.split(" ").slice(-1)[0]}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] transition-all flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-1 border-b border-gray-100 pb-3">
        <Activity size={14} className="text-[#34c759]" />
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Starting Lineups</h3>
      </div>

      {/* 3D 立体感足球场 */}
      <div className="relative w-full aspect-[2/3] bg-[#22543d] rounded-2xl overflow-hidden border border-gray-200/50 shadow-inner select-none">
        
        {/* Grass Patterns (草坪横条条纹) */}
        <div className="absolute inset-0 pointer-events-none flex flex-col">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`stripe-${i}`}
              className={`flex-1 ${i % 2 === 0 ? "bg-black/8" : "bg-transparent"}`}
            />
          ))}
        </div>

        {/* Field Lines (球场白标线) */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute inset-3 border border-white"></div>
          <div className="absolute top-1/2 left-3 right-3 h-[1px] bg-white"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
          
          {/* Penalty box - Away */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[44%] h-[15%] border-b border-x border-white"></div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[20%] h-[5%] border-b border-x border-white"></div>
          
          {/* Penalty box - Home */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[44%] h-[15%] border-t border-x border-white"></div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[20%] h-[5%] border-t border-x border-white"></div>
        </div>

        {/* Formation Overlay Badges */}
        <div className="absolute top-5 left-5 text-white/80 font-black text-[9px] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 tracking-widest uppercase">
          {awayTeam.substring(0, 3)} • {awayLineup.formation}
        </div>
        <div className="absolute bottom-5 right-5 text-white/80 font-black text-[9px] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 tracking-widest uppercase">
          {homeTeam.substring(0, 3)} • {homeLineup.formation}
        </div>

        {/* Players XI */}
        {awayLineup.startXI.map(({ player }) => renderPlayer(player, false))}
        {homeLineup.startXI.map(({ player }) => renderPlayer(player, true))}
      </div>

      {/* Selected Player Floating Details */}
      {selectedPlayer ? (
        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex justify-between items-center transition-all animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <User size={16} className="text-gray-400" />
            </div>
            <div>
              <div className="text-[7.5px] text-gray-400 font-black uppercase tracking-wider mb-0.5">
                {selectedPlayer.pos === "G" ? "GK - Goalkeeper" : selectedPlayer.pos === "D" ? "DF - Defender" : selectedPlayer.pos === "M" ? "MF - Midfielder" : "FW - Forward"}
              </div>
              <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                <span className="text-gray-400 font-bold">#{selectedPlayer.number}</span>
                {selectedPlayer.name}
              </h4>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[7.5px] text-gray-400 font-black uppercase tracking-wider block mb-1">Rating</span>
            <span className={`text-sm font-black px-2.5 py-1 rounded-xl shadow-sm border border-white ${
              parseFloat(selectedPlayer.rating) >= 7.5 
                ? "bg-emerald-100 text-emerald-700" 
                : parseFloat(selectedPlayer.rating) <= 6.5 
                ? "bg-rose-105 text-rose-700" 
                : "bg-amber-100 text-amber-700"
            }`}>
              {selectedPlayer.rating || "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2.5 text-[8.5px] text-gray-400 font-black uppercase tracking-wider border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          💡 Tap a player's avatar to view detailed rating and details
        </div>
      )}
    </div>
  );
}

