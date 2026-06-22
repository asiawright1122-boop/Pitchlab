"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Wallet, TrendingUp, Clock, CheckCircle2, XCircle, 
  LayoutDashboard, Target, Settings, BrainCircuit, LockKeyhole,
  ChevronRight, Award, History, Activity
} from "lucide-react";
import Link from "next/link";
import TeamFlag from "@/components/TeamFlag";
import { MatteCard } from "@/components/ui/MatteCard";
import { EmeraldButton } from "@/components/ui/EmeraldButton";

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

const generateChartData = (trades: Trade[], currentBalance: number) => {
  let balance = currentBalance;
  const data = [{ name: "Now", balance }];
  const settledTrades = [...trades].filter(t => t.status !== "open").reverse();
  for (let i = settledTrades.length - 1; i >= 0; i--) {
    const t = settledTrades[i];
    balance -= (t.pnl || 0);
    data.unshift({ name: new Date(t.createdAt).toLocaleDateString(), balance });
  }
  return data;
};

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { user, wallet, trades, unlocks } = initialData;
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "tma" | "settings">("overview");
  const [tradeFilter, setTradeFilter] = useState<"all" | "open" | "settled">("all");
  
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);

  const handleConnectTelegram = async () => {
    setTgConnecting(true);
    setTgError(null);
    try {
      const res = await fetch("/api/channels/telegram-link");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link");
      if (data.url) window.open(data.url, "_blank");
    } catch (err: any) {
      setTgError(err.message);
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
    <div className="min-h-[100dvh] bg-pitch text-foreground pb-24 font-sans selection:bg-emerald-500/30">
      
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-40 bg-[#0d1114]/80 backdrop-blur-xl border-b border-[#272f35] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">{user.email.split('@')[0]}</h1>
            <div className="flex items-center gap-1">
              <Award size={12} className="text-gold-500" />
              <span className="text-[10px] text-emerald-500 font-medium uppercase">{user.planId} MEMBER</span>
            </div>
          </div>
        </div>
        <button onClick={() => setActiveTab("settings")} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Navigation Pills (Mobile optimized) */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
          {[
            { id: "overview", label: "Portfolio", icon: LayoutDashboard },
            { id: "trades", label: "Activity", icon: Activity },
            { id: "tma", label: "Insights", icon: BrainCircuit }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-[#151a1e] text-gray-400 border border-[#272f35] hover:text-gray-200'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-up">
            {/* Portfolio Overview Card */}
            <MatteCard className="p-5 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Portfolio Value</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{totalAssets.toFixed(2)}</span>
                    <span className="text-sm font-bold text-gray-400 mb-1">RU</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-500">
                    <TrendingUp size={12} />
                    <span>Active Model Tracking</span>
                  </div>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet size={20} className="text-emerald-500" />
                </div>
              </div>

              {/* Chart */}
              <div className="h-[120px] w-full -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151a1e', borderColor: '#272f35', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEmerald)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-[#272f35]">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Available</p>
                  <p className="text-sm font-bold text-white">{wallet.balance.toFixed(2)}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">In Play</p>
                  <p className="text-sm font-bold text-white">{activeStake.toFixed(2)}</p>
                </div>
              </div>
            </MatteCard>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <MatteCard className="p-4 flex flex-col justify-between h-28" onClick={() => setActiveTab("trades")}>
                <div className="text-gray-400"><History size={20} /></div>
                <div>
                  <div className="text-xl font-black text-white">{activeTrades.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Active Predictions</div>
                </div>
              </MatteCard>
              <MatteCard className="p-4 flex flex-col justify-between h-28 border-emerald-500/20 bg-gradient-to-br from-[#151a1e] to-emerald-900/10" onClick={() => setActiveTab("tma")}>
                <div className="text-emerald-500"><BrainCircuit size={20} /></div>
                <div>
                  <div className="text-xl font-black text-emerald-500">{unlocks.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Unlocked Insights</div>
                </div>
              </MatteCard>
            </div>
          </div>
        )}

        {activeTab === "trades" && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 bg-[#151a1e] p-1 rounded-lg border border-[#272f35]">
              <button onClick={() => setTradeFilter("all")} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${tradeFilter === "all" ? "bg-[#272f35] text-white shadow" : "text-gray-500"}`}>All</button>
              <button onClick={() => setTradeFilter("open")} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${tradeFilter === "open" ? "bg-[#272f35] text-emerald-500 shadow" : "text-gray-500"}`}>Active</button>
              <button onClick={() => setTradeFilter("settled")} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${tradeFilter === "settled" ? "bg-[#272f35] text-white shadow" : "text-gray-500"}`}>Settled</button>
            </div>

            <div className="space-y-3">
              {filteredTrades.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Target size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No predictions found.</p>
                </div>
              ) : (
                filteredTrades.map(trade => (
                  <MatteCard key={trade.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-[#272f35] text-gray-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{trade.market}</span>
                        <span className="text-xs font-bold text-white">{trade.selection}</span>
                      </div>
                      {trade.status === "open" && <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded uppercase">Pending</span>}
                      {trade.status === "won" && <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Won</span>}
                      {trade.status === "lost" && <span className="text-[10px] text-gray-500 font-bold bg-gray-800 px-2 py-0.5 rounded uppercase">Lost</span>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <TeamFlag teamName={trade.home} className="w-5 h-4 rounded" />
                          <TeamFlag teamName={trade.away} className="w-5 h-4 rounded" />
                        </div>
                        <div className="flex flex-col text-xs font-semibold text-gray-300">
                          <span>{trade.home}</span>
                          <span>{trade.away}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-500">{trade.odds.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Stake: {trade.stake.toFixed(2)}</div>
                      </div>
                    </div>
                  </MatteCard>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "tma" && (
          <div className="space-y-4 animate-fade-up">
            <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-5 text-center">
              <BrainCircuit size={32} className="mx-auto mb-3 text-emerald-500" />
              <h3 className="text-sm font-bold text-white mb-1">AI Tactical Insights</h3>
              <p className="text-xs text-gray-400">Unlock deep quant models and match analysis using your RU balance.</p>
            </div>

            <div className="space-y-3">
              {unlocks.map(u => (
                <MatteCard key={u.id} className="p-4 border-l-2 border-l-emerald-500">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Unlocked</span>
                    <span className="text-[10px] text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{u.home} vs {u.away}</div>
                  <Link href={`/matches/${u.fixtureId}`} className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1 mt-3">
                    View Report <ChevronRight size={12} />
                  </Link>
                </MatteCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4 animate-fade-up">
            <MatteCard className="p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#272f35] pb-2">Telegram Integration</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-5">
                Connect your Telegram account to receive real-time notifications for settled bets, value bet alerts, and model updates.
              </p>
              
              {user.telegramBound ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-500">Connected Successfully</span>
                  </div>
                  <div className="text-[10px] text-gray-500">Chat ID: {user.telegramChatId}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <EmeraldButton onClick={handleConnectTelegram} disabled={tgConnecting} className="w-full">
                    {tgConnecting ? "Connecting..." : "Connect Telegram Bot"}
                  </EmeraldButton>
                  {tgError && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-[10px] text-red-400">
                      {tgError === "token_unset" ? "Bot token not configured in .env. Please configure TELEGRAM_BOT_TOKEN." : `Error: ${tgError}`}
                    </div>
                  )}
                </div>
              )}
            </MatteCard>

            <MatteCard className="p-5">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#272f35] pb-2">Account Details</h3>
               <div className="space-y-3">
                 <div>
                   <div className="text-[10px] text-gray-500 uppercase tracking-wider">Email</div>
                   <div className="text-sm font-bold text-white">{user.email}</div>
                 </div>
                 <div>
                   <div className="text-[10px] text-gray-500 uppercase tracking-wider">Membership</div>
                   <div className="text-sm font-bold text-gold-500">{user.planId} TIER</div>
                 </div>
               </div>
            </MatteCard>
          </div>
        )}

      </div>
    </div>
  );
}
