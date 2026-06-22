"use client";

import React, { useState, useMemo } from "react";
import type { OddsSnapshot, Prediction } from "@prisma/client";

type BettingMarketsProps = {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  oddsSnapshots: OddsSnapshot[];
  predictions?: Prediction[];
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

  // 1. 整理并排序赔率快照，保留每个玩法最新一条
  const latestOddsMap = new Map<string, { price: number; id: string }>();
  const sortedSnapshots = useMemo(() => {
    return [...oddsSnapshots].sort(
      (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
    );
  }, [oddsSnapshots]);

  for (const snap of sortedSnapshots) {
    const key = `${snap.market}#${snap.selection}`;
    latestOddsMap.set(key, { price: snap.price, id: snap.id });
  }

  // 📈 计算每个投注选项的赔率临场折线趋势 (Sparkline)
  const getSparklinePoints = (market: string, selection: string) => {
    const marketLower = market.toLowerCase();
    const selectionLower = selection.toLowerCase();
    
    // 匹配同种玩法的不同大小写别名
    const snaps = sortedSnapshots.filter(s => {
      const mMatch = s.market.toLowerCase() === marketLower;
      const sMatch = s.selection.toLowerCase() === selectionLower ||
                     (selectionLower === "h" && s.selection.toLowerCase() === "home") ||
                     (selectionLower === "a" && s.selection.toLowerCase() === "away") ||
                     (selectionLower === "d" && s.selection.toLowerCase() === "draw");
      return mMatch && sMatch;
    });

    if (snaps.length < 2) return null;
    return snaps.map(s => s.price);
  };

  const renderSparkline = (prices: number[] | null, isUp = true) => {
    if (!prices || prices.length < 2) return null;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min || 0.1;
    const w = 68;
    const h = 20;
    const step = w / (prices.length - 1);
    
    const path = prices.map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h * 0.7 - 4;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");

    const color = isUp ? "#34d399" : "#ef4444";

    return (
      <div className="flex flex-col items-end gap-0.5 select-none">
        <svg className="w-[68px] h-[20px]" viewBox="0 0 68 20">
          <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-[6.5px] font-black text-gray-500 uppercase tracking-widest leading-none">
          Live Trend
        </span>
      </div>
    );
  };

  const handleSelectBet = (
    key: string,
    marketName: string,
    selectionName: string,
    odds: number,
    type: "H" | "D" | "A" | "UNSUPPORTED"
  ) => {
    setSelectedBetKey(key);

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

  // 提取胜平负预测概率
  const homePred = predictions.find(p => p.market === "1X2" && (p.selection === "H" || p.selection === "Home"));
  const drawPred = predictions.find(p => p.market === "1X2" && (p.selection === "D" || p.selection === "Draw"));
  const awayPred = predictions.find(p => p.market === "1X2" && (p.selection === "A" || p.selection === "Away"));

  const probHome = homePred ? homePred.prob : 0;
  const probDraw = drawPred ? drawPred.prob : 0;
  const probAway = awayPred ? awayPred.prob : 0;

  const fairHome = probHome > 0 ? 1 / probHome : 0;
  const fairDraw = probDraw > 0 ? 1 / probDraw : 0;
  const fairAway = probAway > 0 ? 1 / probAway : 0;

  // 提取各个主流玩法数据
  const homeOdds = latestOddsMap.get("Match Winner#Home")?.price || latestOddsMap.get("Match Winner#home")?.price || latestOddsMap.get("1x2#H")?.price || latestOddsMap.get("1x2#home")?.price || 0;
  const drawOdds = latestOddsMap.get("Match Winner#Draw")?.price || latestOddsMap.get("Match Winner#draw")?.price || latestOddsMap.get("1x2#D")?.price || latestOddsMap.get("1x2#draw")?.price || 0;
  const awayOdds = latestOddsMap.get("Match Winner#Away")?.price || latestOddsMap.get("Match Winner#away")?.price || latestOddsMap.get("1x2#A")?.price || latestOddsMap.get("1x2#away")?.price || 0;

  const edgeHome = homeOdds > 0 && probHome > 0 ? (homeOdds * probHome - 1) * 100 : -100;
  const edgeDraw = drawOdds > 0 && probDraw > 0 ? (drawOdds * probDraw - 1) * 100 : -100;
  const edgeAway = awayOdds > 0 && probAway > 0 ? (awayOdds * probAway - 1) * 100 : -100;

  // 让球盘
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

  // 大小球
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

  // 进球球员
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

  // 角球大小
  const cornerSelections: { selection: string; price: number; type: "Over" | "Under"; threshold: number; key: string }[] = [];
  latestOddsMap.forEach((val, key) => {
    const [market, selection] = key.split("#");
    if (market === "Corners Over Under" || market === "Corners Over/Under" || market === "Total Corners") {
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

  // 双方进球
  const btsYesOdds = latestOddsMap.get("Both Teams Score#Yes")?.price || latestOddsMap.get("Both Teams Score#yes")?.price || 0;
  const btsNoOdds = latestOddsMap.get("Both Teams Score#No")?.price || latestOddsMap.get("Both Teams Score#no")?.price || 0;
  const btsKey = "both-teams-score";

  // 精确波胆
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
    <div className="bg-[#0f1416]/80 backdrop-blur-xl border border-[#202b30] rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition-all relative overflow-hidden select-none">
      
      {/* 🧭 Tab Switcher */}
      <div className="flex border-b border-[#202b30]/70 pb-2 mb-5 overflow-x-auto gap-2.5 custom-scrollbar">
        {[
          { id: "popular", label: "Popular Markets" },
          { id: "handicaps", label: "Handicaps / Totals" },
          { id: "correct_score", label: "Correct Score" },
          { id: "players", label: "Goalscorers" },
          { id: "specials", label: "Corners / BTS" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-2.5 font-black text-[10.5px] uppercase tracking-widest transition-all relative whitespace-nowrap ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📊 TAB CONTENT 1: POPULAR */}
      {activeTab === "popular" && (
        <div className="flex flex-col gap-6">
          {/* Dixon-Coles Predictor Panel */}
          {probHome > 0 && (
            <div className="bg-quant-mesh border border-[#202b30] rounded-2xl p-4.5 relative overflow-hidden flex flex-col gap-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase tracking-wider">
                    Dixon-Coles Model
                  </span>
                  <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Model Forecast</h3>
                </div>
                <div className="flex items-center gap-1 bg-[#070a0b]/80 px-2 py-0.5 rounded border border-[#202b30]/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[7.5px] font-black text-gray-500 tracking-wider">QUANT LIVE</span>
                </div>
              </div>

              {/* Three-Color Progress Bar */}
              <div className="w-full h-2.5 bg-[#070a0b] rounded-full overflow-hidden flex border border-[#202b30]/50 shadow-inner">
                <div style={{ width: `${probHome * 100}%` }} className="bg-emerald-500 h-full relative" />
                <div style={{ width: `${probDraw * 100}%` }} className="bg-gray-600 h-full relative" />
                <div style={{ width: `${probAway * 100}%` }} className="bg-emerald-800 h-full relative" />
              </div>

              {/* Detailed Odds Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Home */}
                <div className="bg-[#0f1416]/50 border border-[#202b30] rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest truncate w-full">{homeTeam.substring(0, 3)} Win</span>
                  <span className="text-sm font-black text-white mt-0.5">{(probHome * 100).toFixed(0)}%</span>
                  <div className="text-[7.5px] text-gray-500 mt-1 flex flex-col leading-tight">
                    <span>Fair: {fairHome.toFixed(2)}</span>
                    <span className="text-gray-400 font-bold mt-0.5">Market: {homeOdds > 0 ? homeOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeHome > 0 ? (
                    <span className="mt-2 text-[7.5px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      +{edgeHome.toFixed(0)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[7.5px] font-bold text-gray-600 bg-[#161e22]/50 px-1.5 py-0.5 rounded">
                      No Value
                    </span>
                  )}
                </div>

                {/* Draw */}
                <div className="bg-[#0f1416]/50 border border-[#202b30] rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest truncate w-full">Draw</span>
                  <span className="text-sm font-black text-white mt-0.5">{(probDraw * 100).toFixed(0)}%</span>
                  <div className="text-[7.5px] text-gray-500 mt-1 flex flex-col leading-tight">
                    <span>Fair: {fairDraw.toFixed(2)}</span>
                    <span className="text-gray-400 font-bold mt-0.5">Market: {drawOdds > 0 ? drawOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeDraw > 0 ? (
                    <span className="mt-2 text-[7.5px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      +{edgeDraw.toFixed(0)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[7.5px] font-bold text-gray-600 bg-[#161e22]/50 px-1.5 py-0.5 rounded">
                      No Value
                    </span>
                  )}
                </div>

                {/* Away */}
                <div className="bg-[#0f1416]/50 border border-[#202b30] rounded-xl p-2.5 flex flex-col items-center">
                  <span className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest truncate w-full">{awayTeam.substring(0, 3)} Win</span>
                  <span className="text-sm font-black text-white mt-0.5">{(probAway * 100).toFixed(0)}%</span>
                  <div className="text-[7.5px] text-gray-500 mt-1 flex flex-col leading-tight">
                    <span>Fair: {fairAway.toFixed(2)}</span>
                    <span className="text-gray-400 font-bold mt-0.5">Market: {awayOdds > 0 ? awayOdds.toFixed(2) : "-"}</span>
                  </div>
                  {edgeAway > 0 ? (
                    <span className="mt-2 text-[7.5px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      +{edgeAway.toFixed(0)}% Edge
                    </span>
                  ) : (
                    <span className="mt-2 text-[7.5px] font-bold text-gray-600 bg-[#161e22]/50 px-1.5 py-0.5 rounded">
                      No Value
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. 1X2 Full Time */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> 
              Match Winner (1X2)
            </h3>
            {homeOdds > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {/* Home Button */}
                <button
                  onClick={() => handleSelectBet("1x2-h", "1x2", "H", homeOdds, "H")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-300 flex flex-col justify-center items-center gap-2 ${
                    isSelected("1x2-h")
                      ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : edgeHome > 0 
                        ? "border-emerald-500/25 bg-[#161e22] hover:border-emerald-500/40 text-gray-200" 
                        : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                  }`}
                >
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest truncate w-full">{homeTeam.substring(0, 3)}</span>
                  <span className="text-base font-black leading-none">{homeOdds.toFixed(2)}</span>
                  {renderSparkline(getSparklinePoints("1x2", "home"), edgeHome > -10)}
                </button>
                
                {/* Draw Button */}
                <button
                  onClick={() => handleSelectBet("1x2-d", "1x2", "D", drawOdds, "D")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-300 flex flex-col justify-center items-center gap-2 ${
                    isSelected("1x2-d")
                      ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : edgeDraw > 0 
                        ? "border-emerald-500/25 bg-[#161e22] hover:border-emerald-500/40 text-gray-200"
                        : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                  }`}
                >
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">DRAW</span>
                  <span className="text-base font-black leading-none">{drawOdds.toFixed(2)}</span>
                  {renderSparkline(getSparklinePoints("1x2", "draw"), edgeDraw > -10)}
                </button>
                
                {/* Away Button */}
                <button
                  onClick={() => handleSelectBet("1x2-a", "1x2", "A", awayOdds, "A")}
                  className={`py-3 px-2 rounded-xl border transition-all duration-300 flex flex-col justify-center items-center gap-2 ${
                    isSelected("1x2-a")
                      ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : edgeAway > 0 
                        ? "border-emerald-500/25 bg-[#161e22] hover:border-emerald-500/40 text-gray-200"
                        : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                  }`}
                >
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest truncate w-full">{awayTeam.substring(0, 3)}</span>
                  <span className="text-base font-black leading-none">{awayOdds.toFixed(2)}</span>
                  {renderSparkline(getSparklinePoints("1x2", "away"), edgeAway > -10)}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No odds available</p>
            )}
          </div>

          {/* 2. Goals Over/Under 2.5 */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> 
              Goal Total (Over/Under 2.5)
            </h3>
            {thresholds.includes(2.5) ? (
              <div className="grid grid-cols-2 gap-3.5">
                {ouSelections
                  .filter((o) => o.threshold === 2.5)
                  .map((o) => (
                    <button
                      key={o.key}
                      onClick={() => handleSelectBet(o.key, "Goals Over/Under", o.selection, o.price, "UNSUPPORTED")}
                      className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center ${
                        isSelected(o.key)
                          ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider">{o.type === "Over" ? "Over 2.5" : "Under 2.5"}</span>
                      <span className="text-base font-black">{o.price.toFixed(2)}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No O/U odds available</p>
            )}
          </div>
        </div>
      )}

      {/* 📊 TAB CONTENT 2: HANDICAPS & OVER/UNDER */}
      {activeTab === "handicaps" && (
        <div className="flex flex-col gap-6">
          {/* 让球多档位 */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
              Asian Handicap对照表
            </h3>
            {spreads.length > 0 ? (
              <div className="flex flex-col gap-3">
                {spreads.slice(0, 4).map((spreadVal) => {
                  const homeItem = handicapSelections.find((h) => Math.abs(h.spread) === spreadVal && h.type === "Home");
                  const awayItem = handicapSelections.find((h) => Math.abs(h.spread) === spreadVal && h.type === "Away");
                  return (
                    <div key={`spread-row-${spreadVal}`} className="grid grid-cols-2 gap-3.5">
                      {homeItem ? (
                        <button
                          onClick={() => handleSelectBet(homeItem.key, "Asian Handicap", homeItem.selection, homeItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(homeItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">{homeTeam.substring(0, 3)} {homeItem.spread > 0 ? `+${homeItem.spread}` : homeItem.spread}</span>
                          <span className="font-black text-emerald-400">{homeItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {awayItem ? (
                        <button
                          onClick={() => handleSelectBet(awayItem.key, "Asian Handicap", awayItem.selection, awayItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(awayItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">{awayTeam.substring(0, 3)} {awayItem.spread > 0 ? `+${awayItem.spread}` : awayItem.spread}</span>
                          <span className="font-black text-emerald-400">{awayItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No handicap odds available</p>
            )}
          </div>

          {/* 大小球对照表 */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
              Goal Total对照表
            </h3>
            {thresholds.length > 0 ? (
              <div className="flex flex-col gap-3">
                {thresholds.slice(0, 4).map((thresholdVal) => {
                  const overItem = ouSelections.find((o) => o.threshold === thresholdVal && o.type === "Over");
                  const underItem = ouSelections.find((o) => o.threshold === thresholdVal && o.type === "Under");
                  return (
                    <div key={`ou-row-${thresholdVal}`} className="grid grid-cols-2 gap-3.5">
                      {overItem ? (
                        <button
                          onClick={() => handleSelectBet(overItem.key, "Goals Over/Under", overItem.selection, overItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(overItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">Over {thresholdVal}</span>
                          <span className="font-black text-emerald-400">{overItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {underItem ? (
                        <button
                          onClick={() => handleSelectBet(underItem.key, "Goals Over/Under", underItem.selection, underItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(underItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">Under {thresholdVal}</span>
                          <span className="font-black text-emerald-400">{underItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No O/U odds available</p>
            )}
          </div>
        </div>
      )}

      {/* 📊 TAB CONTENT 3: CORRECT SCORE */}
      {activeTab === "correct_score" && (
        <div className="flex flex-col gap-5">
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> Correct Score Board
            </h3>
            
            {correctScoreSelections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Home Wins */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 pb-1 border-b border-[#202b30] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {homeTeam.substring(0, 3)} Win
                  </h4>
                  {homeWins.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {homeWins.slice(0, 8).map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2 px-3 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(cs.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">{cs.selection}</span>
                          <span className="font-black text-emerald-400">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-gray-600 py-2 uppercase font-bold tracking-wider">No odds</p>
                  )}
                </div>

                {/* Draws */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 pb-1 border-b border-[#202b30] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                    Draw
                  </h4>
                  {draws.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {draws.slice(0, 8).map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2 px-3 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(cs.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">{cs.selection}</span>
                          <span className="font-black text-emerald-400">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-gray-600 py-2 uppercase font-bold tracking-wider">No odds</p>
                  )}
                </div>

                {/* Away Wins */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 pb-1 border-b border-[#202b30] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-800"></span>
                    {awayTeam.substring(0, 3)} Win
                  </h4>
                  {awayWins.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {awayWins.slice(0, 8).map((cs) => (
                        <button
                          key={cs.key}
                          onClick={() => handleSelectBet(cs.key, "Correct Score", cs.selection, cs.price, "UNSUPPORTED")}
                          className={`py-2 px-3 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(cs.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">{cs.selection}</span>
                          <span className="font-black text-emerald-400">{cs.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-gray-600 py-2 uppercase font-bold tracking-wider">No odds</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-4 uppercase font-black tracking-widest">No correct score odds available</p>
            )}
          </div>
        </div>
      )}

      {/* 📊 TAB CONTENT 4: PLAYERS */}
      {activeTab === "players" && (
        <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> Anytime Goalscorer
          </h3>
          {displayPlayers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {displayPlayers.map((p) => {
                const selectionNameWithSuffix = `${p.playerName} (${p.isHome ? "Home" : "Away"})`;
                return (
                  <div
                    key={p.key}
                    className="flex items-center justify-between p-3 bg-[#161e22] border border-[#202b30] rounded-xl hover:border-emerald-500/35 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-200 text-xs">{p.playerName}</div>
                      <span className="text-[8px] bg-[#0f1416] border border-[#202b30]/50 text-gray-500 font-extrabold px-2 py-0.5 rounded-full mt-1.5 inline-block uppercase tracking-wider">
                        {p.isHome ? `${homeTeam.substring(0, 3)} (HOME)` : `${awayTeam.substring(0, 3)} (AWAY)`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelectBet(p.key, "Anytime Goal Scorer", selectionNameWithSuffix, p.price, "UNSUPPORTED")}
                      className={`py-2 px-4 rounded-xl border font-black text-xs transition-all duration-300 ${
                        isSelected(p.key)
                          ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                          : "border-[#202b30] bg-[#0f1416] hover:border-emerald-500/40 text-gray-300"
                      }`}
                    >
                      {p.price.toFixed(2)}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 text-center py-4 uppercase font-black tracking-widest">No scorer odds available</p>
          )}
        </div>
      )}

      {/* 📊 TAB CONTENT 5: SPECIALS */}
      {activeTab === "specials" && (
        <div className="flex flex-col gap-6">
          {/* Total Corners */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> Total Corners (O/U)
            </h3>
            {cornerThresholds.length > 0 ? (
              <div className="flex flex-col gap-3">
                {cornerThresholds.slice(0, 3).map((thresholdVal) => {
                  const overItem = cornerSelections.find((c) => c.threshold === thresholdVal && c.type === "Over");
                  const underItem = cornerSelections.find((c) => c.threshold === thresholdVal && c.type === "Under");
                  return (
                    <div key={`corner-row-${thresholdVal}`} className="grid grid-cols-2 gap-3.5">
                      {overItem ? (
                        <button
                          onClick={() => handleSelectBet(overItem.key, "Corners Over Under", overItem.selection, overItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(overItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">Over {thresholdVal}</span>
                          <span className="font-black text-emerald-400">{overItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                      {underItem ? (
                        <button
                          onClick={() => handleSelectBet(underItem.key, "Corners Over Under", underItem.selection, underItem.price, "UNSUPPORTED")}
                          className={`py-3 px-4 rounded-xl border transition-all duration-300 flex justify-between items-center text-xs ${
                            isSelected(underItem.key)
                              ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                          }`}
                        >
                          <span className="font-bold">Under {thresholdVal}</span>
                          <span className="font-black text-emerald-400">{underItem.price.toFixed(2)}</span>
                        </button>
                      ) : <div />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No corner odds available</p>
            )}
          </div>

          {/* Both Teams to Score */}
          <div className="border border-[#202b30] bg-[#0f1416]/40 rounded-2xl p-4.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span> Both Teams to Score (BTS)
            </h3>
            {btsYesOdds > 0 ? (
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => handleSelectBet(`${btsKey}-yes`, "Both Teams Score", "Yes", btsYesOdds, "UNSUPPORTED")}
                  className={`py-3 px-4 rounded-xl border transition-all duration-300 flex flex-col justify-center items-center ${
                    isSelected(`${btsKey}-yes`)
                      ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                  }`}
                >
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">YES</span>
                  <span className="text-base font-black">{btsYesOdds.toFixed(2)}</span>
                </button>
                
                <button
                  onClick={() => handleSelectBet(`${btsKey}-no`, "Both Teams Score", "No", btsNoOdds, "UNSUPPORTED")}
                  className={`py-3 px-4 rounded-xl border transition-all duration-300 flex flex-col justify-center items-center ${
                    isSelected(`${btsKey}-no`)
                      ? "border-emerald-500 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "border-[#202b30] bg-[#161e22] hover:border-emerald-500/40 text-gray-300"
                  }`}
                >
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">NO</span>
                  <span className="text-base font-black">{btsNoOdds.toFixed(2)}</span>
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2 uppercase font-black tracking-widest">No BTS odds available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
