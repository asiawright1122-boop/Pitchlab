"use client";

import React, { useState } from "react";

type BettingMarketsProps = {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  oddsSnapshots: any[];
  predictions?: any[];
};

export default function BettingMarkets({
  fixtureId,
  homeTeam,
  awayTeam,
  oddsSnapshots = [],
  predictions = [],
}: BettingMarketsProps) {
  const [activeTab, setActiveTab] = useState<"popular" | "handicaps" | "correct_score" | "players" | "specials">("popular");
  const [selectedBetKey, setSelectedBetKey] = useState<string | null>(null);

  // 1. 整理并排序赔率快照，只保留每个玩法选项最新的一条记录
  const latestOddsMap = new Map<string, { price: number; id: string }>();
  const sortedSnapshots = [...oddsSnapshots].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  );

  for (const snap of sortedSnapshots) {
    const key = `${snap.market}#${snap.selection}`;
    latestOddsMap.set(key, { price: snap.price, id: snap.id });
  }

  // 2. 选项点击与 BetSlip 联动处理
  const handleSelectBet = (
    key: string,
    marketName: string,
    selectionName: string,
    odds: number,
    type: "H" | "D" | "A" | "UNSUPPORTED"
  ) => {
    setSelectedBetKey(key);

    // 分发自定义事件与 BetSlip 组件进行数据交互
    const event = new CustomEvent("select-bet-slip", {
      detail: {
        fixtureId,
        type,
        selectionName,
        marketName,
        odds,
      },
    });
    window.dispatchEvent(event);
  };

  const isSelected = (key: string) => selectedBetKey === key;

  // 提取胜平负的预测概率
  const homePred = predictions.find(p => p.market === "1X2" && (p.selection === "H" || p.selection === "Home"));
  const drawPred = predictions.find(p => p.market === "1X2" && (p.selection === "D" || p.selection === "Draw"));
  const awayPred = predictions.find(p => p.market === "1X2" && (p.selection === "A" || p.selection === "Away"));

  const probHome = homePred ? homePred.prob : 0;
  const probDraw = drawPred ? drawPred.prob : 0;
  const probAway = awayPred ? awayPred.prob : 0;

  const fairHome = probHome > 0 ? 1 / probHome : 0;
  const fairDraw = probDraw > 0 ? 1 / probDraw : 0;
  const fairAway = probAway > 0 ? 1 / probAway : 0;

  // 3. 提取各个主流玩法的数据
  // A. 全场独赢 Match Winner
  const homeOdds = latestOddsMap.get("Match Winner#Home")?.price || latestOddsMap.get("Match Winner#home")?.price || latestOddsMap.get("1x2#H")?.price || latestOddsMap.get("1x2#home")?.price || 0;
  const drawOdds = latestOddsMap.get("Match Winner#Draw")?.price || latestOddsMap.get("Match Winner#draw")?.price || latestOddsMap.get("1x2#D")?.price || latestOddsMap.get("1x2#draw")?.price || 0;
  const awayOdds = latestOddsMap.get("Match Winner#Away")?.price || latestOddsMap.get("Match Winner#away")?.price || latestOddsMap.get("1x2#A")?.price || latestOddsMap.get("1x2#away")?.price || 0;

  const edgeHome = homeOdds > 0 && probHome > 0 ? (homeOdds * probHome - 1) * 100 : -100;
  const edgeDraw = drawOdds > 0 && probDraw > 0 ? (drawOdds * probDraw - 1) * 100 : -100;
  const edgeAway = awayOdds > 0 && probAway > 0 ? (awayOdds * probAway - 1) * 100 : -100;

  // B. 亚洲让球盘 Asian Handicap
  const handicapSelections: { selection: string; price: number; type: "Home" | "Away"; spread: number; key: string }[] = [];
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Asian Handicap") {
      const match = selection.match(/^(Home|Away)\s*([-+]?[0-9.]+)/i);
      if (match) {
        const type = match[1] === "Home" ? "Home" : "Away";
        const spread = parseFloat(match[2]);
        handicapSelections.push({
          selection,
          price: val.price,
          type,
          spread,
          key: `ah-${val.id}`,
        });
      }
    }
  });
  const spreads = Array.from(new Set(handicapSelections.map((h) => Math.abs(h.spread)))).sort((a, b) => a - b);

  // C. 大小球 Goals Over/Under
  const ouSelections: { selection: string; price: number; type: "Over" | "Under"; threshold: number; key: string }[] = [];
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Goals Over/Under") {
      const match = selection.match(/^(Over|Under)\s*([0-9.]+)/i);
      if (match) {
        const type = match[1] === "Over" ? "Over" : "Under";
        const threshold = parseFloat(match[2]);
        ouSelections.push({
          selection,
          price: val.price,
          type,
          threshold,
          key: `ou-${val.id}`,
        });
      }
    }
  });
  const thresholds = Array.from(new Set(ouSelections.map((o) => o.threshold))).sort((a, b) => a - b);

  // D. 进球球员 Anytime Goal Scorer
  const playerSelections: { playerName: string; price: number; key: string; isHome: boolean }[] = [];
  let hasSplitPlayers = false;
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Home Anytime Goal Scorer" || market === "Away Anytime Goal Scorer") {
      hasSplitPlayers = true;
      playerSelections.push({
        playerName: selection,
        price: val.price,
        key: `player-${val.id}`,
        isHome: market === "Home Anytime Goal Scorer",
      });
    }
  });
  if (!hasSplitPlayers) {
    let index = 0;
    latestOddsMap.forEach((val, key) => {
      const [market, selection] = key.split("#");
      if (market === "Anytime Goal Scorer" || market === "Anytime Goalscorer") {
        playerSelections.push({
          playerName: selection,
          price: val.price,
          key: `player-${val.id}`,
          isHome: index % 2 === 0,
        });
        index++;
      }
    });
  }
  playerSelections.sort((a, b) => a.price - b.price);
  const displayPlayers = playerSelections.slice(0, 10);

  // E. 角球大小 Corners Over Under
  const cornerSelections: { selection: string; price: number; type: "Over" | "Under"; threshold: number; key: string }[] = [];
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Corners Over Under" || market === "Corners Over/Under" || market === "Total Corners" || market === "Corners Over Under") {
      const match = selection.match(/^(Over|Under)\s*([0-9.]+)/i);
      if (match) {
        const type = match[1] === "Over" ? "Over" : "Under";
        const threshold = parseFloat(match[2]);
        cornerSelections.push({
          selection,
          price: val.price,
          type,
          threshold,
          key: `corner-${val.id}`,
        });
      }
    }
  });
  const cornerThresholds = Array.from(new Set(cornerSelections.map((c) => c.threshold))).sort((a, b) => a - b);

  // F. 双方是否进球 Both Teams Score
  const btsYesOdds = latestOddsMap.get("Both Teams Score#Yes")?.price || latestOddsMap.get("Both Teams Score#yes")?.price || 0;
  const btsNoOdds = latestOddsMap.get("Both Teams Score#No")?.price || latestOddsMap.get("Both Teams Score#no")?.price || 0;
  const btsKey = "both-teams-score";

  // G. 精确波胆 Correct Score
  const correctScoreSelections: { selection: string; price: number; homeScore: number; awayScore: number; key: string }[] = [];
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Correct Score") {
      const match = selection.match(/(\d+)\s*[:-\s]\s*(\d+)/);
      if (match) {
        correctScoreSelections.push({
          selection,
          price: val.price,
          homeScore: parseInt(match[1]),
          awayScore: parseInt(match[2]),
          key: `cs-${val.id}`,
        });
      }
    }
  });

  const homeWins = correctScoreSelections.filter(c => c.homeScore > c.awayScore).sort((a, b) => (a.homeScore * 10 + a.awayScore) - (b.homeScore * 10 + b.awayScore));
  const draws = correctScoreSelections.filter(c => c.homeScore === c.awayScore).sort((a, b) => a.homeScore - b.homeScore);
  const awayWins = correctScoreSelections.filter(c => c.homeScore < c.awayScore).sort((a, b) => (a.awayScore * 10 + a.homeScore) - (b.awayScore * 10 + b.homeScore));

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-md transition-all">
      <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-6 bg-[#e04039] rounded-full inline-block"></span>
        赛事竞猜中心 (Markets)
      </h2>

      {/* Light Mode Premium Tab Switcher */}
      <div className="flex border-b border-slate-200/60 mb-6 overflow-x-auto gap-2">
        {[
          { id: "popular", label: "常用玩法" },
          { id: "handicaps", label: "让球 / 大小" },
          { id: "correct_score", label: "精确波胆" },
          { id: "players", label: "进球球员" },
          { id: "specials", label: "角球 / 双方得分" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 font-bold text-sm transition-all relative border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "text-[#e04039] border-[#e04039] bg-red-50/20"
                : "text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: POPULAR */}
      {activeTab === "popular" && (
        <div className="flex flex-col gap-6">
          {/* PitchLab 量化概率分析面板 */}
          {probHome > 0 && (
            <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50/30 to-blue-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden">
              {/* 闪烁状态灯 */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LIVE QUANT ACTIVE</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-black px-2.5 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg border border-indigo-500/15">
                  🔬 Dixon-Coles 泊松模型
                </span>
                <h3 className="text-sm font-black text-slate-700">PitchLab 概率预测与期望值</h3>
              </div>

              {/* 三色百分比条 */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${probHome * 100}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`主胜 ${Math.round(probHome * 100)}%`} />
                <div style={{ width: `${probDraw * 100}%` }} className="bg-slate-300 h-full transition-all duration-500" title={`平局 ${Math.round(probDraw * 100)}%`} />
                <div style={{ width: `${probAway * 100}%` }} className="bg-red-500 h-full transition-all duration-500" title={`客胜 ${Math.round(probAway * 100)}%`} />
              </div>

              {/* 详细对比表格 */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* 主胜 */}
                <div className="bg-white/80 border border-slate-200/50 rounded-xl p-3 flex flex-col items-center">
                  <span className="text-[11px] font-extrabold text-slate-500 mb-1 truncate w-full">{homeTeam} 胜</span>
                  <span className="text-lg font-black text-slate-800">{(probHome * 100).toFixed(1)}%</span>
                  <div className="text-[10px] text-slate-450 mt-1 flex flex-col">
                    <span>公平赔率: {fairHome.toFixed(2)}</span>
                    <span className="font-semibold text-slate-650 mt-0.5">实盘赔率: {homeOdds > 0 ? homeOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeHome > 0 ? (
                    <span className="mt-2 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +{edgeHome.toFixed(1)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      无价值
                    </span>
                  )}
                </div>

                {/* 平局 */}
                <div className="bg-white/80 border border-slate-200/50 rounded-xl p-3 flex flex-col items-center">
                  <span className="text-[11px] font-extrabold text-slate-500 mb-1">平局 Draw</span>
                  <span className="text-lg font-black text-slate-800">{(probDraw * 100).toFixed(1)}%</span>
                  <div className="text-[10px] text-slate-450 mt-1 flex flex-col">
                    <span>公平赔率: {fairDraw.toFixed(2)}</span>
                    <span className="font-semibold text-slate-650 mt-0.5">实盘赔率: {drawOdds > 0 ? drawOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeDraw > 0 ? (
                    <span className="mt-2 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +{edgeDraw.toFixed(1)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      无价值
                    </span>
                  )}
                </div>

                {/* 客胜 */}
                <div className="bg-white/80 border border-slate-200/50 rounded-xl p-3 flex flex-col items-center">
                  <span className="text-[11px] font-extrabold text-slate-500 mb-1 truncate w-full">{awayTeam} 胜</span>
                  <span className="text-lg font-black text-slate-800">{(probAway * 100).toFixed(1)}%</span>
                  <div className="text-[10px] text-slate-450 mt-1 flex flex-col">
                    <span>公平赔率: {fairAway.toFixed(2)}</span>
                    <span className="font-semibold text-slate-650 mt-0.5">实盘赔率: {awayOdds > 0 ? awayOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeAway > 0 ? (
                    <span className="mt-2 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +{edgeAway.toFixed(1)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      无价值
                    </span>
                  )}
                </div>
              </div>

              {/* 最佳投注提示 */}
              {Math.max(edgeHome, edgeDraw, edgeAway) > 0 && (
                <div className="mt-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm flex items-center">🎯</span>
                    <span className="text-[11px] font-extrabold text-slate-600">
                      最佳量化推荐: 买入{" "}
                      <span className="text-indigo-600 font-black">
                        {(() => {
                          const maxE = Math.max(edgeHome, edgeDraw, edgeAway);
                          if (edgeHome === maxE) return `${homeTeam} 胜`;
                          if (edgeDraw === maxE) return "平局";
                          return `${awayTeam} 胜`;
                        })()}
                      </span>{" "}
                      (期望优势最高)
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Value Bet
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 1. 独赢盘 (1X2) */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">全场独赢 (Match Winner)</h3>
            {homeOdds > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleSelectBet("1x2-h", "1x2", "H", homeOdds, "H")}
                  className={`py-3 px-4 rounded-xl border font-bold transition-all text-center flex flex-col justify-center items-center ${
                    isSelected("1x2-h")
                      ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                      : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-[11px] text-slate-450 font-bold mb-1 truncate w-full">{homeTeam} 胜</span>
                  <span className="text-base font-extrabold">{homeOdds.toFixed(2)}</span>
                  {edgeHome > 0 && (
                    <span className="mt-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      +{edgeHome.toFixed(0)}% Edge
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSelectBet("1x2-d", "1x2", "D", drawOdds, "D")}
                  className={`py-3 px-4 rounded-xl border font-bold transition-all text-center flex flex-col justify-center items-center ${
                    isSelected("1x2-d")
                      ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                      : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-[11px] text-slate-450 font-bold mb-1">平局 Draw</span>
                  <span className="text-base font-extrabold">{drawOdds.toFixed(2)}</span>
                  {edgeDraw > 0 && (
                    <span className="mt-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      +{edgeDraw.toFixed(0)}% Edge
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSelectBet("1x2-a", "1x2", "A", awayOdds, "A")}
                  className={`py-3 px-4 rounded-xl border font-bold transition-all text-center flex flex-col justify-center items-center ${
                    isSelected("1x2-a")
                      ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                      : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                  }`}
                >
                  <span className="text-[11px] text-slate-450 font-bold mb-1 truncate w-full">{awayTeam} 胜</span>
                  <span className="text-base font-extrabold">{awayOdds.toFixed(2)}</span>
                  {edgeAway > 0 && (
                    <span className="mt-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      +{edgeAway.toFixed(0)}% Edge
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无实时独赢盘赔率</p>
            )}
          </div>

          {/* 2. 常用大小球 (2.5) */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">全场总进球大小 (Goals Over/Under 2.5)</h3>
            {thresholds.includes(2.5) ? (
              <div className="grid grid-cols-2 gap-3">
                {ouSelections
                  .filter((o) => o.threshold === 2.5)
                  .map((o) => (
                    <button
                      key={o.key}
                      onClick={() => handleSelectBet(o.key, "Goals Over/Under", o.selection, o.price, "UNSUPPORTED")}
                      className={`py-3 px-4 rounded-xl border font-bold transition-all flex justify-between items-center px-6 ${
                        isSelected(o.key)
                          ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm"
                          : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800"
                      }`}
                    >
                      <span className="text-sm font-bold">{o.type === "Over" ? "大 (Over) 2.5" : "小 (Under) 2.5"}</span>
                      <span className="text-base font-extrabold">{o.price.toFixed(2)}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无 2.5 档位大小球赔率</p>
            )}
          </div>

          {/* 3. 常用亚洲让球盘 */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">亚洲让球盘 (Asian Handicap)</h3>
            {spreads.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {handicapSelections
                  .filter((h) => Math.abs(h.spread) === spreads[0])
                  .map((h) => (
                    <button
                      key={h.key}
                      onClick={() => handleSelectBet(h.key, "Asian Handicap", h.selection, h.price, "UNSUPPORTED")}
                      className={`py-3 px-4 rounded-xl border font-bold transition-all flex flex-col justify-center items-center ${
                        isSelected(h.key)
                          ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm"
                          : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800"
                      }`}
                    >
                      <span className="text-[11px] text-slate-450 font-bold mb-1 truncate w-full text-center">
                        {h.type === "Home" ? homeTeam : awayTeam} {h.spread > 0 ? `+${h.spread}` : h.spread}
                      </span>
                      <span className="text-base font-extrabold">{h.price.toFixed(2)}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无实时让球盘赔率</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: HANDICAPS & OVER/UNDER */}
      {activeTab === "handicaps" && (
        <div className="flex flex-col gap-6">
          {/* 让球多档位 */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">亚洲让球盘多档位对照</h3>
            {spreads.length > 0 ? (
              <div className="flex flex-col gap-2">
                {spreads.slice(0, 4).map((spreadVal) => {
                  const homeItem = handicapSelections.find((h) => Math.abs(h.spread) === spreadVal && h.type === "Home");
                  const awayItem = handicapSelections.find((h) => Math.abs(h.spread) === spreadVal && h.type === "Away");
                  return (
                    <div key={`spread-row-${spreadVal}`} className="grid grid-cols-2 gap-3">
                      {homeItem ? (
                        <button
                          onClick={() => handleSelectBet(homeItem.key, "Asian Handicap", homeItem.selection, homeItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(homeItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>{homeTeam} {homeItem.spread > 0 ? `+${homeItem.spread}` : homeItem.spread}</span>
                          <span className="font-extrabold">{homeItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {awayItem ? (
                        <button
                          onClick={() => handleSelectBet(awayItem.key, "Asian Handicap", awayItem.selection, awayItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(awayItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>{awayTeam} {awayItem.spread > 0 ? `+${awayItem.spread}` : awayItem.spread}</span>
                          <span className="font-extrabold">{awayItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无多档位让球盘赔率</p>
            )}
          </div>

          {/* 大小球多档位 */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">总进球数大小多档位对照</h3>
            {thresholds.length > 0 ? (
              <div className="flex flex-col gap-2">
                {thresholds.slice(0, 4).map((thresholdVal) => {
                  const overItem = ouSelections.find((o) => o.threshold === thresholdVal && o.type === "Over");
                  const underItem = ouSelections.find((o) => o.threshold === thresholdVal && o.type === "Under");
                  return (
                    <div key={`ou-row-${thresholdVal}`} className="grid grid-cols-2 gap-3">
                      {overItem ? (
                        <button
                          onClick={() => handleSelectBet(overItem.key, "Goals Over/Under", overItem.selection, overItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(overItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>大 {thresholdVal}</span>
                          <span className="font-extrabold">{overItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {underItem ? (
                        <button
                          onClick={() => handleSelectBet(underItem.key, "Goals Over/Under", underItem.selection, underItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(underItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>小 {thresholdVal}</span>
                          <span className="font-extrabold">{underItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无多档位大小球赔率</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CORRECT SCORE */}
      {activeTab === "correct_score" && (
        <div className="flex flex-col gap-6">
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-6">
            <h3 className="text-sm font-extrabold text-slate-700 mb-4">全场精确比分波胆 (Correct Score)</h3>
            
            {correctScoreSelections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Home Wins */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    主队胜 ({homeTeam})
                  </h4>
                  {homeWins.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {homeWins.map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2.5 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(cs.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                              : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                          }`}
                        >
                          <span className="font-semibold">{cs.selection}</span>
                          <span className="font-extrabold">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">暂无该盘口数据</p>
                  )}
                </div>

                {/* Draws */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    平局 (Draw)
                  </h4>
                  {draws.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {draws.map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2.5 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(cs.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                              : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                          }`}
                        >
                          <span className="font-semibold">{cs.selection}</span>
                          <span className="font-extrabold">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">暂无该盘口 data</p>
                  )}
                </div>

                {/* Away Wins */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    客队胜 ({awayTeam})
                  </h4>
                  {awayWins.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {awayWins.map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2.5 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(cs.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039] shadow-sm shadow-[#e04039]/10"
                              : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800 hover:bg-slate-50/50"
                          }`}
                        >
                          <span className="font-semibold">{cs.selection}</span>
                          <span className="font-extrabold">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">暂无该盘口数据</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无本场赛事的波胆赔率</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PLAYERS */}
      {activeTab === "players" && (
        <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4">球员任意时间进球 (Anytime Goalscorer)</h3>
          {displayPlayers.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {displayPlayers.map((p) => {
                // selection 隐含写入 (Home) 或是 (Away) 用于结算引擎精准定位
                const selectionNameWithSuffix = `${p.playerName} (${p.isHome ? "Home" : "Away"})`;
                return (
                  <div
                    key={p.key}
                    className="flex items-center justify-between p-3.5 bg-white border border-slate-200/60 rounded-xl hover:border-slate-350 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{p.playerName}</div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                        {p.isHome ? `${homeTeam} (主队)` : `${awayTeam} (客队)`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelectBet(p.key, "Anytime Goal Scorer", selectionNameWithSuffix, p.price, "UNSUPPORTED")}
                      className={`py-2 px-5 rounded-lg border font-extrabold text-sm transition-all ${
                        isSelected(p.key)
                          ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.price.toFixed(2)}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">暂无本场赛事的实时球员进球赔率</p>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: SPECIALS */}
      {activeTab === "specials" && (
        <div className="flex flex-col gap-6">
          {/* 总角球数大小 */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">全场总角球数大小 (Corners Over Under)</h3>
            {cornerThresholds.length > 0 ? (
              <div className="flex flex-col gap-2">
                {cornerThresholds.slice(0, 3).map((thresholdVal) => {
                  const overItem = cornerSelections.find((c) => c.threshold === thresholdVal && c.type === "Over");
                  const underItem = cornerSelections.find((c) => c.threshold === thresholdVal && c.type === "Under");
                  return (
                    <div key={`corner-row-${thresholdVal}`} className="grid grid-cols-2 gap-3">
                      {overItem ? (
                        <button
                          onClick={() => handleSelectBet(overItem.key, "Corners Over Under", overItem.selection, overItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(overItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>角球 大 {thresholdVal}</span>
                          <span className="font-extrabold">{overItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {underItem ? (
                        <button
                          onClick={() => handleSelectBet(underItem.key, "Corners Over Under", underItem.selection, underItem.price, "UNSUPPORTED")}
                          className={`py-2 px-4 rounded-xl border font-bold transition-all flex justify-between items-center text-sm ${
                            isSelected(underItem.key)
                              ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                              : "border-slate-200/60 bg-white hover:border-slate-300 text-slate-750"
                          }`}
                        >
                          <span>角球 小 {thresholdVal}</span>
                          <span className="font-extrabold">{underItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无实时角球盘赔率</p>
            )}
          </div>

          {/* 双方是否进球 (Both Teams Score) */}
          <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-4">
            <h3 className="text-sm font-extrabold text-slate-700 mb-3">双方是否均有进球 (Both Teams Score)</h3>
            {btsYesOdds > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectBet(`${btsKey}-yes`, "Both Teams Score", "Yes", btsYesOdds, "UNSUPPORTED")}
                  className={`py-3 px-4 rounded-xl border font-bold transition-all flex flex-col justify-center items-center ${
                    isSelected(`${btsKey}-yes`)
                      ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                      : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800"
                  }`}
                >
                  <span className="text-[11px] text-slate-450 font-bold mb-1">是 (Yes)</span>
                  <span className="text-base font-extrabold">{btsYesOdds.toFixed(2)}</span>
                </button>
                <button
                  onClick={() => handleSelectBet(`${btsKey}-no`, "Both Teams Score", "No", btsNoOdds, "UNSUPPORTED")}
                  className={`py-3 px-4 rounded-xl border font-bold transition-all flex flex-col justify-center items-center ${
                    isSelected(`${btsKey}-no`)
                      ? "border-[#e04039] bg-[#e04039]/5 text-[#e04039]"
                      : "border-slate-200/80 bg-white hover:border-slate-350 text-slate-800"
                  }`}
                >
                  <span className="text-[11px] text-slate-450 font-bold mb-1">否 (No)</span>
                  <span className="text-base font-extrabold">{btsNoOdds.toFixed(2)}</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-2">暂无实时双方得分赔率</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
