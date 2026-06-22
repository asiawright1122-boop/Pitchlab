import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TeamFlag from "@/components/TeamFlag";

export const dynamic = "force-dynamic";

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
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-4 pb-24">
        
        {/* STATS BLOCK */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">PERFORMANCE</h2>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 flex justify-around items-center">
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Win Rate</span>
              <span className="text-gray-900 font-black text-2xl">{winRate}%</span>
            </div>
            <div className="w-px h-10 bg-gray-100"></div>
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Profit</span>
              <span className={`font-black text-2xl ${totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : 'text-gray-900'}`}>{profitStr}</span>
            </div>
          </div>
        </div>

        {/* PREDICTIONS LIST */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">RECENT PREDICTIONS</h2>
          </div>

          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden">
            {trades.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium text-sm">
                No predictions yet.
                <br/><br/>
                <Link href="/" className="text-[#007aff] font-bold">Go to Dashboard</Link> to make some predictions!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {trades.map((trade) => {
                  const isWon = trade.pnl && trade.pnl > 0;
                  const isLost = trade.pnl && trade.pnl <= 0;
                  const isPending = trade.status === "open";
                  
                  const badgeClass = isWon ? "bg-green-100 text-green-700" : isLost ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
                  const badgeText = isWon ? "WON" : isLost ? "LOST" : "PENDING";

                  return (
                    <div key={trade.id} className="p-4 bg-white flex flex-col relative">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWon ? 'bg-green-500' : isLost ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                          {badgeText}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {trade.market.toUpperCase()} - {trade.selection}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <TeamFlag teamName={trade.home} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                            <TeamFlag teamName={trade.away} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] font-bold text-gray-900 leading-tight">{trade.home}</span>
                            <span className="text-[13px] font-medium text-gray-500 leading-tight">{trade.away}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-medium text-gray-400">Odds</span>
                          <span className="text-[14px] font-black text-gray-900">{trade.odds.toFixed(2)}</span>
                          <div className="flex items-center gap-1 mt-1 text-[11px]">
                            <span className="text-gray-400 font-medium">PnL:</span>
                            <span className={`font-black ${isWon ? 'text-green-500' : isLost ? 'text-red-500' : 'text-gray-900'}`}>
                              {trade.pnl ? (trade.pnl > 0 ? `+${trade.pnl.toFixed(2)}` : trade.pnl.toFixed(2)) : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
