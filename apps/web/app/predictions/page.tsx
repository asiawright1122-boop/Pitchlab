import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TeamFlag from "@/components/TeamFlag";

export default async function PredictionsPage() {
  // Fetch real trades from database
  const trades = await prisma.paperTrade.findMany({
    orderBy: { createdAt: "desc" },
    include: { fixture: true },
    take: 20
  });

  // Calculate aggregated stats
  const settledTrades = trades.filter(t => t.status === "settled");
  const winCount = settledTrades.filter(t => t.pnl && t.pnl > 0).length;
  const winRate = settledTrades.length > 0 ? Math.round((winCount / settledTrades.length) * 100) : 0;
  
  const totalProfit = settledTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const profitStr = totalProfit >= 0 ? `+${totalProfit.toFixed(2)}` : totalProfit.toFixed(2);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <header className="bg-gradient-to-b from-blue-600 to-blue-500 px-4 pt-8 pb-10 shadow-sm relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-blue-400 rounded-full blur-2xl opacity-50"></div>
        <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-blue-300 rounded-full blur-xl opacity-30"></div>

        <h1 className="font-bold text-2xl tracking-tight text-white mb-6 relative z-10">Predictions</h1>
        
        <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md relative z-10">
          <div className="flex flex-col">
            <span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Win Rate</span>
            <span className="text-white font-black text-2xl">{winRate}%</span>
          </div>
          <div className="w-px h-10 bg-white/20"></div>
          <div className="flex flex-col text-right">
            <span className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Total Profit</span>
            <span className="text-white font-black text-2xl">{profitStr}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24 -mt-4 relative z-20">
        <h2 className="font-bold text-lg text-gray-900 ml-1">Recent Activity</h2>
        
        {trades.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
            <span className="text-3xl block mb-2">📊</span>
            <p className="text-sm font-bold text-gray-800">No predictions yet</p>
            <p className="text-xs text-gray-400 mt-1">Make some predictions to see your history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => {
              const isWon = trade.pnl && trade.pnl > 0;
              const isLost = trade.pnl && trade.pnl <= 0;
              const isPending = trade.status === "open";
              
              const badgeClass = isWon ? "bg-green-100 text-green-700" : isLost ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
              const badgeText = isWon ? "WON" : isLost ? "LOST" : "PENDING";

              return (
                <div key={trade.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWon ? 'bg-green-500' : isLost ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  
                  <div className="p-3.5 pl-4 border-b border-gray-50 flex justify-between items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                      {badgeText}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {trade.market.toUpperCase()} - {trade.selection}
                    </span>
                  </div>

                  <div className="p-3.5 pl-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center p-0.5 shrink-0">
                         <TeamFlag teamName={trade.home} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900 leading-tight">{trade.home}</span>
                        <span className="text-[10px] text-gray-400 font-medium">vs {trade.away}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-500">Odds</span>
                      <span className="text-sm font-black text-gray-900">{trade.odds.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 pl-4 flex items-center justify-between">
                     <span className="text-[10px] font-medium text-gray-500">{new Date(trade.kickoffUtc).toLocaleDateString()}</span>
                     <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 font-medium">PnL:</span>
                        <span className={`font-black ${isWon ? 'text-green-600' : isLost ? 'text-red-600' : 'text-gray-800'}`}>
                           {trade.pnl ? (trade.pnl > 0 ? `+${trade.pnl.toFixed(2)}` : trade.pnl.toFixed(2)) : '--'}
                        </span>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
