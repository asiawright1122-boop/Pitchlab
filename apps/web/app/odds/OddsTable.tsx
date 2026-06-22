"use client";

import React, { useState, useEffect } from "react";
import TeamFlag from "@/components/TeamFlag";
import "./odds.css";

type FixtureRecord = {
  id: string;
  home: string;
  away: string;
  kickoffUtc: Date;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  stage: string | null;
  group: string | null;
  oddsSnapshots: any[];
};

type TradeRecord = {
  id: string;
  home: string;
  away: string;
  selection: string;
  odds: number;
  stake: number;
  status: string;
  pnl: number | null;
  createdAt: string;
};

type OddsTableProps = {
  fixtures: FixtureRecord[];
  userWallet: { balance: number; currency: string } | null;
  userTrades: TradeRecord[];
  isLoggedIn: boolean;
};

export default function OddsTable({ fixtures, userWallet, userTrades, isLoggedIn }: OddsTableProps) {
  const [foldedDates, setFoldedDates] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // Interactive control center states
  const [activeTab, setActiveTab] = useState<"matches" | "outrights">("matches");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<"open" | "settled">("open");

  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  const formatDateLabel = (utcDate?: Date | null) => {
    if (!utcDate) return "未定日期";
    const d = new Date(utcDate);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatTimeLabel = (utcDate?: Date | null) => {
    if (!utcDate) return "--:--";
    const d = new Date(utcDate);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const toggleFolded = (key: string) => {
    setFoldedDates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Extract group name from match ID (e.g., wc-a-1-czechia-mexico -> A)
  const getMatchGroup = (id: string) => {
    const parts = id.split("-");
    if (parts.length >= 3 && parts[1].length === 1) {
      return parts[1].toUpperCase();
    }
    return "OTHER";
  };

  const renderOddsCell = (oddsList: any[] | undefined, sel: "home" | "draw" | "away") => {
    if (!oddsList || oddsList.length === 0) return <span className="wc-match-odds-tbd">-</span>;
    const snaps = oddsList.filter((s) => s.selection === sel);
    if (snaps.length === 0) return <span className="wc-match-odds-tbd">-</span>;

    const latest = snaps[snaps.length - 1];
    
    let pill: React.ReactNode = null;
    if (snaps.length > 1) {
      const prev = snaps[snaps.length - 2];
      const diff = latest.price - prev.price;
      if (diff < -0.01) {
        pill = <span className="wc-odds-pill wc-pill-mini wc-pill-up">↓</span>;
      } else if (diff > 0.01) {
        pill = <span className="wc-odds-pill wc-pill-mini wc-pill-down">↑</span>;
      }
    }

    return (
      <div className="wc-match-odds-cell">
        <span className="wc-match-odds-value">{latest.price.toFixed(2)}</span>
        {pill}
      </div>
    );
  };

  const FINISHED_STATUSES = ["FINISHED", "FT", "AET", "PEN"];
  const isMatchFinished = (status: string | null | undefined) => {
    if (!status) return false;
    return FINISHED_STATUSES.includes(status.toUpperCase());
  };

  // Apply filters on fixtures
  const filteredFixtures = fixtures.filter((f) => {
    if (groupFilter === "ALL") return true;
    return getMatchGroup(f.id) === groupFilter;
  });

  const finished = filteredFixtures.filter((f) => isMatchFinished(f.status));
  const upcoming = filteredFixtures.filter((f) => {
    if (isMatchFinished(f.status)) return false;
    const kickTime = new Date(f.kickoffUtc);
    if (currentTime && kickTime <= currentTime) return false;
    return true;
  });

  const finishedGrouped: Record<string, FixtureRecord[]> = {};
  finished.forEach((f) => {
    const key = formatDateLabel(f.kickoffUtc);
    if (!finishedGrouped[key]) finishedGrouped[key] = [];
    finishedGrouped[key].push(f);
  });
  const sortedFinDates = Object.keys(finishedGrouped).sort((a, b) => b.localeCompare(a));

  const renderRow = (f: FixtureRecord, fin: boolean) => {
    const stageLabel = f.group ? `${f.group}组` : "小组赛";

    if (fin) {
      return (
        <tr key={f.id} className="wc-match-row-finished wc-finished-child">
          <td className="wc-match-date">
            <div className="wc-date-day">{formatDateLabel(f.kickoffUtc)}</div>
            <div className="wc-date-time">{formatTimeLabel(f.kickoffUtc)}</div>
          </td>
          <td className="wc-match-teams-cell">
            <div className="wc-match-teams">
              <div className="wc-match-team-block home">
                <TeamFlag teamName={f.home} className="wc-match-flag" />
                <span className="wc-match-team-name">{f.home}</span>
              </div>
              <div className="wc-match-score-pill">
                <span>{f.homeGoals ?? '-'}</span>
                <span className="wc-score-sep">:</span>
                <span>{f.awayGoals ?? '-'}</span>
              </div>
              <div className="wc-match-team-block away">
                <TeamFlag teamName={f.away} className="wc-match-flag" />
                <span className="wc-match-team-name">{f.away}</span>
              </div>
              <span className="wc-match-finished-badge">已完赛</span>
            </div>
          </td>
          <td><span className="wc-match-finished-dash">-</span></td>
          <td><span className="wc-match-finished-dash">-</span></td>
          <td><span className="wc-match-finished-dash">-</span></td>
          <td><span className="wc-match-finished-dash">-</span></td>
          <td>
            <a href={`/matches/${f.id}`} className="wc-match-detail-link" title="查看详情">
              <svg className="wc-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", display: "inline-block" }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </td>
          <td className="wc-match-stage">
            <span className="wc-match-stage-link">{stageLabel}</span>
          </td>
        </tr>
      );
    }

    return (
      <tr key={f.id} className="wc-match-row-upcoming">
        <td className="wc-match-date">
          <div className="wc-date-day">{formatDateLabel(f.kickoffUtc)}</div>
          <div className="wc-date-time">{formatTimeLabel(f.kickoffUtc)}</div>
        </td>
        <td className="wc-match-teams-cell">
          <div className="wc-match-teams">
            <div className="wc-match-team-block home">
              <TeamFlag teamName={f.home} className="wc-match-flag" />
              <span className="wc-match-team-name">{f.home}</span>
            </div>
            <span className="wc-match-vs">VS</span>
            <div className="wc-match-team-block away">
              <TeamFlag teamName={f.away} className="wc-match-flag" />
              <span className="wc-match-team-name">{f.away}</span>
            </div>
          </div>
        </td>
        <td>{renderOddsCell(f.oddsSnapshots, "home")}</td>
        <td>{renderOddsCell(f.oddsSnapshots, "draw")}</td>
        <td>{renderOddsCell(f.oddsSnapshots, "away")}</td>
        <td>
          <a href={`/matches/${f.id}`} className="wc-odds-cta">立即投注</a>
        </td>
        <td>
          <a href={`/matches/${f.id}`} className="wc-match-detail-link" title="查看详情">
            <svg className="wc-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", display: "inline-block" }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </td>
        <td className="wc-match-stage">
          <span className="wc-match-stage-link">{stageLabel}</span>
        </td>
      </tr>
    );
  };

  const renderMobileCard = (f: FixtureRecord, fin: boolean) => {
    const stageLabel = f.group ? `${f.group}组` : "小组赛";
    
    if (fin) {
      return (
        <div key={f.id} className="wc-mobile-card wc-finished-card">
          <div className="wc-mobile-card-header">
            <div className="wc-mobile-card-date">
              <span className="wc-dot"></span>
              {formatDateLabel(f.kickoffUtc)} {formatTimeLabel(f.kickoffUtc)}
            </div>
            <span className="wc-mobile-card-badge wc-badge-finished">已完赛</span>
          </div>

          <div className="wc-mobile-card-matchup">
            <div className="wc-mobile-team home">
              <TeamFlag teamName={f.home} className="wc-mobile-flag" />
              <span className="wc-mobile-team-name">{f.home}</span>
            </div>
            <div className="wc-mobile-score-box">
              <span>{f.homeGoals ?? '-'}</span>
              <span className="wc-score-divider">:</span>
              <span>{f.awayGoals ?? '-'}</span>
            </div>
            <div className="wc-mobile-team away">
              <span className="wc-mobile-team-name">{f.away}</span>
              <TeamFlag teamName={f.away} className="wc-mobile-flag" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={f.id} className="wc-mobile-card">
        <div className="wc-mobile-card-header">
          <div className="wc-mobile-card-date">
            <span className="wc-dot live"></span>
            {formatDateLabel(f.kickoffUtc)} {formatTimeLabel(f.kickoffUtc)}
          </div>
          <span className="wc-mobile-card-badge">{stageLabel}</span>
        </div>

        <div className="wc-mobile-card-matchup">
          <div className="wc-mobile-team home">
            <TeamFlag teamName={f.home} className="wc-mobile-flag" />
            <span className="wc-mobile-team-name">{f.home}</span>
          </div>
          <span className="wc-mobile-vs">VS</span>
          <div className="wc-mobile-team away">
            <span className="wc-mobile-team-name">{f.away}</span>
            <TeamFlag teamName={f.away} className="wc-mobile-flag" />
          </div>
        </div>

        <div className="wc-mobile-card-odds">
          <div className="wc-mobile-odd-item">
            <span className="wc-mobile-odd-label">主胜 (1)</span>
            <div className="wc-mobile-odd-wrapper">
              {renderOddsCell(f.oddsSnapshots, "home")}
            </div>
          </div>
          <div className="wc-mobile-odd-item">
            <span className="wc-mobile-odd-label">平局 (X)</span>
            <div className="wc-mobile-odd-wrapper">
              {renderOddsCell(f.oddsSnapshots, "draw")}
            </div>
          </div>
          <div className="wc-mobile-odd-item">
            <span className="wc-mobile-odd-label">客胜 (2)</span>
            <div className="wc-mobile-odd-wrapper">
              {renderOddsCell(f.oddsSnapshots, "away")}
            </div>
          </div>
        </div>

        <div className="wc-mobile-card-actions">
          <a href={`/matches/${f.id}`} className="wc-mobile-cta-btn">
            立即下注
          </a>
          <a href={`/matches/${f.id}`} className="wc-mobile-detail-btn">
            详情
          </a>
        </div>
      </div>
    );
  };

  // Extract unique groups available in fixtures for the group filter bar
  const availableGroups = ["ALL", ...Array.from(new Set(fixtures.map(f => getMatchGroup(f.id)).filter(g => g !== "OTHER"))).sort()];

  // Calculate wallet info
  const displayBalance = userWallet ? userWallet.balance : 1000.00;
  const walletType = isLoggedIn ? "云端模拟账户" : "游客体验账户";
  const openTrades = userTrades.filter(t => t.status === "open");
  const settledTrades = userTrades.filter(t => t.status !== "open");
  
  return (
    <div className="wc-single-match-wrapper">
      
      {/* 1. Decision Control Center Panel (Glassmorphic Bar) */}
      <div className="wc-control-center">
        {/* Tab Selection */}
        <div className="wc-control-cabinet flex items-center gap-1">
          <button 
            onClick={() => setActiveTab("matches")}
            className={`wc-tab-pill ${activeTab === "matches" ? "active" : ""}`}
          >
            赛程赔率
          </button>
          <button 
            onClick={() => setActiveTab("outrights")}
            className={`wc-tab-pill ${activeTab === "outrights" ? "active" : ""}`}
          >
            冠军预测
          </button>
        </div>
        
        {/* Wallet & Bet Slip Controller */}
        <div className="wc-control-cabinet wallet-cabinet">
          <div className="wc-wallet-info">
            <span className="wc-wallet-label">{walletType}</span>
            <span className="wc-wallet-value">${displayBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="wc-bet-history-btn"
          >
            我的投注单
            {openTrades.length > 0 && <span className="wc-badge-dot">{openTrades.length}</span>}
          </button>
        </div>

        {/* Quant Model Indicator */}
        <div className="wc-control-cabinet status-cabinet hidden md:flex">
          <span className="wc-model-indicator">
            <span className="wc-pulse-dot"></span> 
            Dixon-Coles 预测模型已就绪
          </span>
        </div>
      </div>

      {/* 2. My Bets Sliding Drawer */}
      {isDrawerOpen && (
        <div className="wc-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="wc-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="wc-drawer-header">
              <h3 className="wc-drawer-title">模拟投注管理</h3>
              <button className="wc-drawer-close" onClick={() => setIsDrawerOpen(false)}>关闭</button>
            </div>
            
            <div className="wc-drawer-tabs">
              <button 
                onClick={() => setDrawerTab("open")}
                className={`wc-drawer-tab-btn ${drawerTab === "open" ? "active" : ""}`}
              >
                未结算 ({openTrades.length})
              </button>
              <button 
                onClick={() => setDrawerTab("settled")}
                className={`wc-drawer-tab-btn ${drawerTab === "settled" ? "active" : ""}`}
              >
                已结算 ({settledTrades.length})
              </button>
            </div>

            <div className="wc-drawer-content">
              {drawerTab === "open" ? (
                openTrades.length === 0 ? (
                  <div className="wc-drawer-empty">暂无未结算的投注单</div>
                ) : (
                  <div className="wc-drawer-list">
                    {openTrades.map(t => (
                      <div key={t.id} className="wc-drawer-card">
                        <div className="wc-drawer-card-header">
                          <span className="wc-drawer-card-stage">小组赛</span>
                          <span className="wc-drawer-card-status open">进行中</span>
                        </div>
                        <div className="wc-drawer-card-match">{t.home} vs {t.away}</div>
                        <div className="wc-drawer-card-detail">
                          <div>预测: <strong className="text-slate-800">{t.selection === "H" ? "主胜" : t.selection === "D" ? "平局" : "客胜"}</strong></div>
                          <div>赔率: <strong className="text-slate-800">{t.odds.toFixed(2)}</strong></div>
                          <div>本金: <strong className="text-slate-850">${t.stake}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                settledTrades.length === 0 ? (
                  <div className="wc-drawer-empty">暂无已结算的历史记录</div>
                ) : (
                  <div className="wc-drawer-list">
                    {settledTrades.map(t => {
                      const isWon = t.status === "won";
                      return (
                        <div key={t.id} className={`wc-drawer-card ${isWon ? "won" : "lost"}`}>
                          <div className="wc-drawer-card-header">
                            <span className="wc-drawer-card-stage">小组赛</span>
                            <span className={`wc-drawer-card-status ${t.status}`}>
                              {isWon ? "赢" : t.status === "refunded" ? "退款" : "输"}
                            </span>
                          </div>
                          <div className="wc-drawer-card-match">{t.home} vs {t.away}</div>
                          <div className="wc-drawer-card-detail">
                            <div>选项: <strong>{t.selection === "H" ? "主胜" : t.selection === "D" ? "平局" : "客胜"}</strong></div>
                            <div>赔率: <strong>{t.odds.toFixed(2)}</strong></div>
                            <div>本金: <strong>${t.stake}</strong></div>
                          </div>
                          <div className="wc-drawer-card-pnl">
                            <span>盈亏:</span>
                            <span className={isWon ? "text-emerald-500 font-extrabold" : "text-rose-500 font-extrabold"}>
                              {isWon ? `+$${t.pnl?.toFixed(2)}` : `-$${t.stake}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Outrights Tab */}
      {activeTab === "outrights" && (
        <div id="outrights" className="wc-outrights-section mt-4">
          <div className="wc-outrights-card">
            <h2 className="wc-outrights-title text-2xl font-black text-slate-900 mb-2 text-center">冠军赔率及预测 (Outrights)</h2>
            <p className="wc-outrights-subtitle text-slate-500 mb-8 font-medium text-center">PitchLab Dixon-Coles 深度量化模型夺冠预测概率与实时赔率对照</p>
            
            <div className="wc-outrights-grid grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="wc-outright-item gold p-6 flex flex-col justify-between">
                <div className="wc-outright-top flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="wc-outright-rank flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-yellow-950 font-black text-xs">1</div>
                    <span className="wc-outright-name font-extrabold text-slate-800 text-base">巴西 (Brazil)</span>
                  </div>
                  <TeamFlag teamName="Brazil" className="wc-outright-flag w-8 h-5 rounded shadow-sm" />
                </div>
                <div className="wc-outright-info">
                  <div className="wc-outright-metrics grid grid-cols-2 gap-4 mb-4">
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">夺冠概率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-[#e04039]">22.2%</span>
                    </div>
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">参考赔率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-slate-800">4.50</span>
                    </div>
                  </div>
                  <div className="wc-prob-bar-container w-full h-1.5 rounded-full overflow-hidden">
                    <div className="wc-prob-bar h-full bg-gradient-to-r from-yellow-400 to-[#e04039] rounded-full" style={{ width: "22.2%" }}></div>
                  </div>
                </div>
              </div>

              <div className="wc-outright-item silver p-6 flex flex-col justify-between">
                <div className="wc-outright-top flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="wc-outright-rank flex items-center justify-center w-6 h-6 rounded-full bg-slate-350 text-slate-900 font-black text-xs">2</div>
                    <span className="wc-outright-name font-extrabold text-slate-800 text-base">法国 (France)</span>
                  </div>
                  <TeamFlag teamName="France" className="wc-outright-flag w-8 h-5 rounded shadow-sm" />
                </div>
                <div className="wc-outright-info">
                  <div className="wc-outright-metrics grid grid-cols-2 gap-4 mb-4">
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">夺冠概率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-[#e04039]">20.0%</span>
                    </div>
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">参考赔率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-slate-800">5.00</span>
                    </div>
                  </div>
                  <div className="wc-prob-bar-container w-full h-1.5 rounded-full overflow-hidden">
                    <div className="wc-prob-bar h-full bg-gradient-to-r from-slate-400 to-[#e04039] rounded-full" style={{ width: "20.0%" }}></div>
                  </div>
                </div>
              </div>

              <div className="wc-outright-item bronze p-6 flex flex-col justify-between">
                <div className="wc-outright-top flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="wc-outright-rank flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs">3</div>
                    <span className="wc-outright-name font-extrabold text-slate-800 text-base">英格兰 (England)</span>
                  </div>
                  <TeamFlag teamName="England" className="wc-outright-flag w-8 h-5 rounded shadow-sm" />
                </div>
                <div className="wc-outright-info">
                  <div className="wc-outright-metrics grid grid-cols-2 gap-4 mb-4">
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">夺冠概率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-[#e04039]">15.4%</span>
                    </div>
                    <div className="wc-metric">
                      <span className="wc-metric-label block text-[10px] text-slate-400 font-bold uppercase mb-0.5">参考赔率</span>
                      <span className="wc-metric-value text-lg font-extrabold text-slate-800">6.50</span>
                    </div>
                  </div>
                  <div className="wc-prob-bar-container w-full h-1.5 rounded-full overflow-hidden">
                    <div className="wc-prob-bar h-full bg-gradient-to-r from-amber-600 to-[#e04039] rounded-full" style={{ width: "15.4%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Render Matches Tab */}
      {activeTab === "matches" && (
        <div className="mt-4">
          {/* Group Filter Bar (Desktop only, for quick navigation) */}
          <div className="wc-group-filter-scroll hidden md:flex">
            <div className="wc-group-filter-bar">
              {availableGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`wc-group-filter-pill ${groupFilter === g ? "active" : ""}`}
                >
                  {g === "ALL" ? "全部" : `${g}组`}
                </button>
              ))}
            </div>
          </div>

          {fixtures.length === 0 ? (
            <div className="wc-empty-state">
              <p>暂无赛程赔率数据</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="wc-desktop-view">
                <div className="wc-match-odds-wrapper">
                  <div className="wc-match-odds-scroll">
                    <table className="wc-match-odds-table">
                      <thead>
                        <tr>
                          <th style={{ width: "90px" }}>时间</th>
                          <th style={{ minWidth: "240px" }}>对阵</th>
                          <th style={{ width: "80px" }}>1</th>
                          <th style={{ width: "80px" }}>X</th>
                          <th style={{ width: "80px" }}>2</th>
                          <th style={{ width: "110px" }}>投注</th>
                          <th style={{ width: "70px" }}>详情</th>
                          <th style={{ width: "90px" }}>阶段</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcoming.length === 0 && sortedFinDates.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="wc-match-odds-tbd py-12">该分组暂无匹配的赛程数据</td>
                          </tr>
                        ) : (
                          <>
                            {upcoming
                              .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
                              .map((f) => renderRow(f, false))}

                            {sortedFinDates.map((dateKey) => {
                              const rows = finishedGrouped[dateKey];
                              const folded = foldedDates[dateKey] ?? true;
                              return (
                                <React.Fragment key={dateKey}>
                                  <tr
                                    className={`wc-finished-toggle-row ${folded ? "" : "open"}`}
                                    onClick={() => toggleFolded(dateKey)}
                                  >
                                    <td colSpan={8}>
                                      <span className="wc-finished-toggle-icon">{folded ? "＋" : "－"}</span> 
                                      已完赛 · {dateKey} · {rows.length}场
                                    </td>
                                  </tr>
                                  {!folded && rows.map((f) => renderRow(f, true))}
                                </React.Fragment>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mobile View */}
              <div className="wc-mobile-view">
                <div className="wc-mobile-matches-list">
                  <h3 className="wc-section-subtitle">焦点赛程</h3>
                  <div className="wc-mobile-cards-container">
                    {upcoming.length === 0 ? (
                      <div className="wc-empty-state py-8">暂无进行的赛程</div>
                    ) : (
                      upcoming
                        .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
                        .map((f) => renderMobileCard(f, false))
                    )}
                  </div>

                  {sortedFinDates.length > 0 && (
                    <div className="wc-mobile-finished-section">
                      <h3 className="wc-section-subtitle">已完赛赛事</h3>
                      <div className="wc-mobile-finished-toggles">
                        {sortedFinDates.map((dateKey) => {
                          const rows = finishedGrouped[dateKey];
                          const folded = foldedDates[dateKey] ?? true;
                          return (
                            <div key={dateKey} className="wc-mobile-finished-group">
                              <button
                                onClick={() => toggleFolded(dateKey)}
                                className="wc-mobile-toggle-btn"
                              >
                                <span className="wc-mobile-toggle-icon">{folded ? "＋" : "－"}</span>
                                <span>{dateKey} ({rows.length}场比赛)</span>
                              </button>
                              {!folded && (
                                <div className="wc-mobile-finished-cards">
                                  {rows.map((f) => renderMobileCard(f, true))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
