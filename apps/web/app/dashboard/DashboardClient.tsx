"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  LayoutDashboard,
  Target,
  Settings,
  BrainCircuit,
  LockKeyhole
} from "lucide-react";
import Link from "next/link";
import TeamFlag from "@/components/TeamFlag";

type Trade = {
  id: string;
  fixtureId: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  odds: number;
  stake: number;
  status: string;
  pnl: number | null;
  createdAt: string;
};

type Unlock = {
  id: string;
  fixtureId: string;
  home?: string;
  away?: string;
  method: string;
  amount: number | null;
  createdAt: string;
};

type DashboardData = {
  user: { 
    email: string; 
    planId: string;
    telegramBound: boolean;
    telegramChatId: string | null;
  };
  wallet: { balance: number; currency: string };
  trades: Trade[];
  unlocks: Unlock[];
};

// Generate some mock chart data based on trades
const generateChartData = (trades: Trade[], currentBalance: number) => {
  let balance = currentBalance;
  const data = [{ name: "Now", balance }];
  
  const settledTrades = [...trades].filter(t => t.status !== "open").reverse(); // Oldest first
  
  for (let i = settledTrades.length - 1; i >= 0; i--) {
    const t = settledTrades[i];
    balance -= (t.pnl || 0); // Reverse engineer the balance
    data.unshift({ name: new Date(t.createdAt).toLocaleDateString(), balance });
  }

  return data;
};

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, wallet, trades, unlocks } = initialData;
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "tma" | "settings">("overview");
  const [tradeFilter, setTradeFilter] = useState<"all" | "open" | "settled">("all");
  const [telegramBound, setTelegramBound] = useState(user.telegramBound);
  const [telegramChatId, setTelegramChatId] = useState(user.telegramChatId);
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  const handleConnectTelegram = async () => {
    setTgConnecting(true);
    setTgError(null);
    try {
      const res = await fetch("/api/channels/telegram-link");
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error && data.error.includes("configured")) {
          throw new Error("NOT_CONFIGURED");
        }
        throw new Error(data.error || "获取绑定链接失败");
      }
      
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      if (err.message === "NOT_CONFIGURED") {
        setTgError("token_unset");
      } else {
        setTgError(err.message);
      }
    } finally {
      setTgConnecting(false);
    }
  };

  const activeTrades = trades.filter(t => t.status === "open");
  const activeStake = activeTrades.reduce((acc, t) => acc + t.stake, 0);
  const totalAssets = wallet.balance + activeStake;

  const chartData = generateChartData(trades, wallet.balance);

  const filteredTrades = trades.filter(t => {
    if (tradeFilter === "open") return t.status === "open";
    if (tradeFilter === "settled") return t.status !== "open";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-800 pb-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] sticky top-24">
            
            {/* User Profile */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#e04039] to-orange-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-slate-50 text-slate-850 flex items-center justify-center font-bold text-xl border border-slate-200/30">
                    {user.email[0].toUpperCase()}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 truncate">{user.email.split('@')[0]}</p>
                  <p className="text-xs text-[#e04039] font-medium tracking-wide uppercase mt-1">
                    {user.planId} TIER
                  </p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="p-4">
              <nav className="flex flex-col gap-1">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "overview" ? "bg-[#e04039] text-white shadow-lg shadow-[#e04039]/20" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"}`}
                >
                  <LayoutDashboard size={18} /> 资产总览
                </button>
                <button 
                  onClick={() => setActiveTab("trades")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "trades" ? "bg-[#e04039] text-white shadow-lg shadow-[#e04039]/20" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"}`}
                >
                  <Target size={18} /> 交易记录
                </button>
                <button 
                  onClick={() => setActiveTab("tma")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-wrap justify-between ${activeTab === "tma" ? "bg-[#e04039] text-white shadow-lg shadow-[#e04039]/20" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"}`}
                >
                  <div className="flex items-center gap-3">
                    <BrainCircuit size={18} /> TMA 研报
                  </div>
                  {unlocks.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "tma" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{unlocks.length}</span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "settings" ? "bg-[#e04039] text-white shadow-lg shadow-[#e04039]/20" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"}`}
                >
                  <Settings size={18} /> 账户设置
                </button>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-8">
          
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Assets */}
                <div className="col-span-2 bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-8 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400">
                    <Wallet size={120} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">总资产估值 (RU)</h3>
                  <p className="text-5xl font-black text-slate-900 mb-2">{totalAssets.toFixed(2)}</p>
                  <p className="text-sm text-green-650 flex items-center gap-1 font-semibold"><TrendingUp size={14} /> 模型稳定运行中</p>
                  
                  <div className="mt-8 flex gap-8 border-t border-slate-100 pt-6">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">可用流动性</p>
                      <p className="text-2xl font-bold text-slate-850">{wallet.balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">进行中仓位</p>
                      <p className="text-2xl font-bold text-slate-850">{activeStake.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Active Bets Summary */}
                <div className="bg-gradient-to-br from-[#e04039]/5 to-slate-50/50 backdrop-blur-md border border-[#e04039]/20 rounded-2xl p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-650 mb-2">持仓合约</h3>
                    <p className="text-4xl font-black text-slate-900">{activeTrades.length}</p>
                  </div>
                  <div>
                    <button onClick={() => setActiveTab("trades")} className="text-sm text-[#e04039] font-bold flex items-center gap-2 hover:text-slate-900 transition-colors">
                      查看全部明细 &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <h3 className="text-lg font-black text-slate-900 mb-6">权益走势模型 (Equity Curve)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e04039" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#e04039" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis domain={['auto', 'auto']} stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                        itemStyle={{ color: '#e04039', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#e04039" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "trades" && (
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-900">量化交易注单簿</h3>
                <div className="flex gap-2">
                  <button onClick={() => setTradeFilter("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${tradeFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-650 hover:bg-slate-200/85"}`}>全部</button>
                  <button onClick={() => setTradeFilter("open")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${tradeFilter === "open" ? "bg-[#e04039] text-white" : "bg-slate-100 text-slate-650 hover:bg-slate-200/85"}`}>进行中</button>
                  <button onClick={() => setTradeFilter("settled")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${tradeFilter === "settled" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-650 hover:bg-slate-200/85"}`}>已结算</button>
                </div>
              </div>

              {filteredTrades.length === 0 ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                  <Target size={48} className="mb-4 opacity-40 text-slate-350" />
                  <p>无符合条件的订单</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 font-medium tracking-wider uppercase text-xs">标的赛事</th>
                        <th className="px-6 py-4 font-medium tracking-wider uppercase text-xs">下注策略</th>
                        <th className="px-6 py-4 font-medium tracking-wider uppercase text-xs text-right">投入 (Stake)</th>
                        <th className="px-6 py-4 font-medium tracking-wider uppercase text-xs text-right">赔率 (Odds)</th>
                        <th className="px-6 py-4 font-medium tracking-wider uppercase text-xs text-right">结算与盈亏</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTrades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <TeamFlag teamName={trade.home} className="w-6 h-4.5 rounded shadow-sm flex-shrink-0" />
                              <span>{trade.home}</span>
                              <span className="text-slate-400 text-xs">vs</span>
                              <TeamFlag teamName={trade.away} className="w-6 h-4.5 rounded shadow-sm flex-shrink-0" />
                              <span>{trade.away}</span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-medium">
                              <Clock size={12} /> {new Date(trade.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mr-2">{trade.market}</span>
                            <span className="font-bold text-slate-800">{trade.selection}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-700 font-semibold">{trade.stake.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-mono text-[#e04039] font-bold">{trade.odds.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            {trade.status === "open" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-550 border border-blue-100">
                                <Clock size={12} /> 待结算
                              </span>
                            )}
                            {trade.status === "won" && (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-650 border border-green-100 mb-1">
                                  <CheckCircle2 size={12} /> Win
                                </span>
                                <span className="text-green-650 font-bold font-mono">+{trade.pnl?.toFixed(2)}</span>
                              </div>
                            )}
                            {trade.status === "lost" && (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200 mb-1">
                                  <XCircle size={12} /> Loss
                                </span>
                                <span className="text-slate-450 font-bold font-mono">{trade.pnl?.toFixed(2)}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "tma" && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    <BrainCircuit className="text-[#e04039]" /> AI 研报库 (TMA Insights)
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">已解锁 {unlocks.length} 份报告</p>
               </div>

               {unlocks.length === 0 ? (
                  <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-16 text-center text-slate-450 flex flex-col items-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <LockKeyhole size={48} className="mb-4 opacity-80 text-[#e04039]" />
                    <p className="text-lg text-slate-800 font-bold mb-2">你的研报库空空如也</p>
                    <p className="text-sm text-slate-500 mb-6">前往赛事详情页，使用 RU 解锁大模型深度战术分析。</p>
                    <Link href="/odds" className="bg-[#e04039] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-sm shadow-[#e04039]/10">
                      去挑选比赛
                    </Link>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {unlocks.map((u) => (
                      <div key={u.id} className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 hover:border-[#e04039]/30 transition-colors group shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-[#e04039]/10 text-[#e04039] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                            已解锁
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#e04039] transition-colors flex items-center gap-2">
                          <TeamFlag teamName={u.home || ""} className="w-6 h-4.5 rounded shadow-sm flex-shrink-0" />
                          <span>{u.home}</span>
                          <span className="text-slate-400 text-xs">vs</span>
                          <TeamFlag teamName={u.away || ""} className="w-6 h-4.5 rounded shadow-sm flex-shrink-0" />
                          <span>{u.away}</span>
                        </h4>
                        <p className="text-sm text-slate-500 mb-6">Team Model Analysis 深度量化战术与胜率预估报告。</p>
                        <Link href={`/matches/${u.fixtureId}`} className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg transition-colors block text-center">
                          回看研报 &rarr;
                        </Link>
                      </div>
                    ))}
                  </div>
               )}
             </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Settings className="text-[#e04039]" /> 账户设置与 TG 联动中心
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 账户卡片 */}
                <div className="md:col-span-1 bg-slate-50/50 border border-slate-200/40 rounded-2xl p-6">
                  <h4 className="font-extrabold text-slate-800 mb-4 text-sm uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-1.5">
                    👤 账户基本信息
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-slate-400 font-bold block mb-0.5">登录邮箱</span>
                      <span className="text-sm font-extrabold text-slate-800 break-all">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-bold block mb-0.5">会员等级</span>
                      <span className="inline-block px-2.5 py-0.5 bg-[#e04039]/10 text-[#e04039] text-xs font-black rounded border border-[#e04039]/15 uppercase">
                        {user.planId} TIER
                      </span>
                    </div>
                  </div>
                </div>

                {/* TG 联动中心卡片 */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    {/* TG 联动卡片背景小水印 */}
                    <div className="absolute top-4 right-4 opacity-[0.05]">
                      <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.73 7.59-3.25 3.61-1.48 4.36-1.74 4.85-1.75.11 0 .35.03.5.16.13.12.17.29.19.41-.02.1-.01.27-.02.39z"/>
                      </svg>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        {telegramBound ? (
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        ) : (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </>
                        )}
                      </span>
                      Telegram 信号推送服务 (Quant Bot)
                    </h4>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">
                      开启后，我们将在每次量化数据 Pipeline 结算完成后，自动向您的 Telegram 推送今日大盘总结、自动晋升的影子模型以及量化价值发现（Value Bet）研报。
                    </p>

                    {telegramBound ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-emerald-600 font-extrabold uppercase block mb-0.5 tracking-wider">Connection Status</span>
                            <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                              ✓ 已成功安全绑定 Telegram 账号
                            </span>
                            <span className="text-xs text-slate-400 mt-1 block">TG Chat ID: {telegramChatId}</span>
                          </div>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg border border-emerald-200">
                            已就绪
                          </span>
                        </div>
                        <button
                          onClick={() => window.open(`https://t.me/${telegramChatId || 'MockPitchLabBot'}`, '_blank')}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          💬 前往 Telegram 进行模拟竞猜
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          onClick={handleConnectTelegram}
                          disabled={tgConnecting}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {tgConnecting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                              <span>正在请求安全绑定接口...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡ 立即连接 Telegram 机器人</span>
                            </>
                          )}
                        </button>

                        {tgError === "token_unset" && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h5 className="text-xs font-extrabold text-amber-700 flex items-center gap-1 mb-2">
                              ⚙️ 本地开发部署指南 (TELEGRAM_BOT_TOKEN 未配置)
                            </h5>
                            <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                              <li>在 Telegram 中向 <a href="https://t.me/BotFather" target="_blank" className="text-indigo-600 font-bold underline hover:text-indigo-850">@BotFather</a> 申请一个新的 Bot Token。</li>
                              <li>在项目根目录下的 <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-750">.env</code> 中添加配置：
                                <pre className="bg-slate-900 text-slate-100 p-2 rounded-md font-mono mt-1 text-[10px] select-all overflow-x-auto whitespace-pre">
{`TELEGRAM_BOT_TOKEN="你的_BOT_TOKEN"
TELEGRAM_BOT_USERNAME="你的_BOT_USERNAME"`}
                                </pre>
                              </li>
                              <li>在终端中运行长轮询监听脚本以处理消息：
                                <code className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold mt-1 inline-block">
                                  npm run telegram:poll
                                </code>
                              </li>
                              <li>配置后刷新当前页面，即可点击上方按钮拉起机器人完成一键绑定。</li>
                            </ol>
                          </div>
                        )}

                        {tgError && tgError !== "token_unset" && (
                          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-650 animate-in fade-in duration-300">
                            ⚠️ 绑定失败：{tgError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
