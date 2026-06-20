"use client";

import React, { useState } from "react";

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
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-sm text-center">
        <p className="text-sm text-slate-400">暂无首发阵容数据</p>
      </div>
    );
  }

  const homeLineup = lineups[0];
  const awayLineup = lineups[1];

  // 计算球员绝对定位百分比的辅助函数 (主队在下半场 50% - 95%，客队在上半场 5% - 50%)
  const getPlayerPosition = (grid: string, isHome: boolean) => {
    if (!grid) return { top: "50%", left: "50%" };
    const [rowStr, colStr] = grid.split(":");
    const row = parseInt(rowStr) || 1;
    const col = parseInt(colStr) || 1;

    // 每一排有几个球员，用于横向均分
    // 这里简单预设：如果是 1 (门将) 占 50%；2-5 (后卫/中场/前锋) 根据列数计算
    const totalColsMap: Record<number, number> = { 1: 1, 2: 4, 3: 3, 4: 3, 5: 2 };
    
    // 我们会根据这一排实际有多少名球员来精准排布
    const XI = isHome ? homeLineup.startXI : awayLineup.startXI;
    const playersInRow = XI.filter(p => p.player.grid && p.player.grid.startsWith(`${row}:`));
    const totalInRow = playersInRow.length || totalColsMap[row] || 3;
    
    // 找出该球员在这一排中是第几个（排序）
    const sortedRowPlayers = [...playersInRow].sort((a, b) => {
      const aCol = parseInt(a.player.grid.split(":")[1]) || 1;
      const bCol = parseInt(b.player.grid.split(":")[1]) || 1;
      return aCol - bCol; // 这里只作防错
    });
    const colIndex = playersInRow.findIndex(p => p.player.id === XI.find(x => x.player.grid === grid)?.player.id);
    
    // 纵向 top 比例计算
    let topPercent = 50;
    if (isHome) {
      // 主队：靠近底部的排数小 (1是门将，在最底端；4是前锋，在靠近中线处)
      // 门将(1) -> 90% | 后卫(2) -> 75% | 中场(3) -> 60% | 前锋(4) -> 53%
      const rowTops: Record<number, number> = { 1: 90, 2: 74, 3: 61, 4: 53 };
      topPercent = rowTops[row] || (90 - (row - 1) * 12);
    } else {
      // 客队：靠近顶端的排数小 (1是门将，在最顶端；4是前锋，在靠近中线处)
      // 门将(1) -> 10% | 后卫(2) -> 26% | 中场(3) -> 39% | 前锋(4) -> 47%
      const rowTops: Record<number, number> = { 1: 10, 2: 26, 3: 39, 4: 47 };
      topPercent = rowTops[row] || (10 + (row - 1) * 12);
    }

    // 横向 left 比例计算
    let leftPercent = 50;
    if (totalInRow <= 1) {
      leftPercent = 50;
    } else {
      // 让球员在 10% - 90% 范围内均匀分布
      // 比如 4 个后卫，列索引 0, 1, 2, 3，分布在 15%, 38%, 62%, 85%
      const step = 80 / (totalInRow - 1);
      // 我们用 col 序号进行索引计算
      const colOrder = Array.from(new Set(playersInRow.map(p => parseInt(p.player.grid.split(":")[1]) || 1))).sort((a, b) => a - b);
      const idx = colOrder.indexOf(col);
      leftPercent = 10 + (idx >= 0 ? idx : 0) * step;
    }

    return { top: `${topPercent}%`, left: `${leftPercent}%` };
  };

  const renderRatingBadge = (rating: string) => {
    if (!rating) return null;
    const num = parseFloat(rating);
    let colorClass = "bg-slate-400 text-white";
    if (num >= 7.5) colorClass = "bg-emerald-500 text-white font-extrabold";
    else if (num <= 6.5) colorClass = "bg-rose-500 text-white";
    
    return (
      <span className={`text-[9px] px-1 rounded-md scale-90 -mt-0.5 inline-block ${colorClass}`}>
        {num.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-md transition-all flex flex-col gap-6">
      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <span className="w-2.5 h-6 bg-[#e04039] rounded-full inline-block"></span>
        首发阵容与战术板 (Lineups)
      </h3>

      {/* 战术足球场 */}
      <div className="relative w-full aspect-[2/3] md:aspect-[3/4] bg-gradient-to-b from-[#2e5e34] via-[#3a7541] to-[#2e5e34] rounded-2xl overflow-hidden border-2 border-slate-700/30 shadow-inner">
        {/* 球场标线 */}
        <div className="absolute inset-0 pointer-events-none opacity-45">
          {/* 草皮横向花纹条纹 */}
          <div className="absolute inset-0 flex flex-col">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`pitch-stripe-${i}`}
                className={`flex-1 ${i % 2 === 0 ? "bg-black/5" : "bg-transparent"}`}
              ></div>
            ))}
          </div>

          {/* 外边框 */}
          <div className="absolute inset-3 border border-white"></div>
          {/* 中线 */}
          <div className="absolute top-1/2 left-3 right-3 h-[1px] bg-white"></div>
          {/* 中圈 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white rounded-full"></div>
          {/* 中点 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>

          {/* 顶端客队禁区 */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-44 h-16 border-b border-x border-white"></div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 border-b border-x border-white"></div>
          {/* 顶端弧线 */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-16 h-8 border-b border-white rounded-b-full"></div>

          {/* 底端主队禁区 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-44 h-16 border-t border-x border-white"></div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-6 border-t border-x border-white"></div>
          {/* 底端弧线 */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-16 h-8 border-t border-white rounded-t-full"></div>
        </div>

        {/* 队名与阵型指示 */}
        <div className="absolute top-6 left-6 text-white font-extrabold text-xs bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          {awayTeam} • {awayLineup.formation}
        </div>
        <div className="absolute bottom-6 right-6 text-white font-extrabold text-xs bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          {homeTeam} • {homeLineup.formation}
        </div>

        {/* 客队球员 (上) */}
        {awayLineup.startXI.map(({ player }) => {
          const pos = getPlayerPosition(player.grid, false);
          const active = selectedPlayer?.id === player.id;
          return (
            <button
              key={`away-player-${player.id}`}
              onClick={() => setSelectedPlayer(player)}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none z-10"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs border-2 transition-all ${
                active 
                  ? "bg-[#e04039] text-white border-white scale-110 shadow-lg" 
                  : "bg-white/80 backdrop-blur-sm text-slate-800 border-red-500 hover:border-red-650 group-hover:scale-105"
              }`}>
                {player.number}
              </div>
              <span className="text-[10px] text-white font-bold bg-slate-900/60 backdrop-blur-[2px] px-1.5 py-0.5 rounded mt-1 shadow-sm max-w-[70px] truncate text-center">
                {player.name.split(" ").slice(-1)[0]}
              </span>
              {renderRatingBadge(player.rating)}
            </button>
          );
        })}

        {/* 主队球员 (下) */}
        {homeLineup.startXI.map(({ player }) => {
          const pos = getPlayerPosition(player.grid, true);
          const active = selectedPlayer?.id === player.id;
          return (
            <button
              key={`home-player-${player.id}`}
              onClick={() => setSelectedPlayer(player)}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none z-10"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs border-2 transition-all ${
                active 
                  ? "bg-blue-600 text-white border-white scale-110 shadow-lg" 
                  : "bg-white/80 backdrop-blur-sm text-slate-800 border-blue-500 hover:border-blue-650 group-hover:scale-105"
              }`}>
                {player.number}
              </div>
              <span className="text-[10px] text-white font-bold bg-slate-900/60 backdrop-blur-[2px] px-1.5 py-0.5 rounded mt-1 shadow-sm max-w-[70px] truncate text-center">
                {player.name.split(" ").slice(-1)[0]}
              </span>
              {renderRatingBadge(player.rating)}
            </button>
          );
        })}
      </div>

      {/* 选中球员浮窗详情 */}
      {selectedPlayer ? (
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center animate-fade-in">
          <div>
            <div className="text-xs text-slate-400 font-bold mb-0.5 uppercase tracking-wide">
              {selectedPlayer.pos === "G" ? "守门员 GK" : selectedPlayer.pos === "D" ? "后卫 DF" : selectedPlayer.pos === "M" ? "中场 MF" : "前锋 FW"}
            </div>
            <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <span className="text-slate-500 font-bold">#{selectedPlayer.number}</span>
              {selectedPlayer.name}
            </h4>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-450 font-bold block mb-1">本场评分</span>
            <span className={`text-lg font-black px-2.5 py-1 rounded-lg ${
              parseFloat(selectedPlayer.rating) >= 7.5 
                ? "bg-emerald-100 text-emerald-700" 
                : parseFloat(selectedPlayer.rating) <= 6.5 
                ? "bg-rose-100 text-rose-700" 
                : "bg-slate-200 text-slate-700"
            }`}>
              {selectedPlayer.rating || "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-xs text-slate-400 font-medium">
          💡 提示：点击阵型板上的球员头像，可查看球员详细评分与场上位置。
        </div>
      )}
    </div>
  );
}
