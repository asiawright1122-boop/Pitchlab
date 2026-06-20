import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PredictionsPage() {
  const slips = [
    {
      id: 1,
      home: "Liverpool",
      away: "Man City",
      league: "Premier League",
      date: "Today 16:30 BST",
      stake: 50.00,
      win: "LIVERPOOL",
      odds: 2.10,
      status: "UPCOMING",
      homeFlag: "🔴",
      awayFlag: "🔵",
    },
    {
      id: 2,
      home: "Arsenal",
      away: "Bayern Munich",
      league: "UCL - 18 APR",
      score: "2 - 1",
      stake: 25.00,
      result: "WIN",
      odds: 1.85,
      profit: "+£21.25",
      status: "COMPLETED",
      homeFlag: "🛡️",
      awayFlag: "⭐",
    },
    {
      id: 3,
      home: "Real Madrid",
      away: "Barcelona",
      league: "La Liga - 17 APR",
      score: "1 - 2",
      stake: 40.00,
      result: "LOSS",
      odds: 2.30,
      loss: "-£40.00",
      status: "COMPLETED",
      homeFlag: "👑",
      awayFlag: "🔵🔴",
    }
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <header className="bg-white px-4 pt-6 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Balance</span>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-500 text-white flex items-center justify-center font-bold text-xs">A</div>
            <button className="text-gray-800 relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </div>
        <div className="text-3xl font-black text-gray-900 tracking-tight">£1,280.50</div>
      </header>

      <div className="flex items-center justify-between px-4 py-4 bg-[#f2f2f7]">
        <h1 className="font-bold text-xl text-gray-900">PREDICTIONS</h1>
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1 cursor-pointer">
          All / Active / History
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {slips.map((slip) => (
          <div key={slip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-gray-50 px-3 py-1 rounded-bl-2xl border-l border-b border-gray-100 text-[10px] font-bold text-gray-500">
              {slip.status}
            </div>
            <div className="p-4 pt-5 border-b border-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{slip.homeFlag}</span>
                  <div className="text-sm font-bold text-gray-900">{slip.home}</div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{slip.league}</span>
                  {slip.score ? (
                    <span className="text-xl font-black text-gray-800 tracking-widest my-1">{slip.score}</span>
                  ) : (
                    <span className="text-xs text-gray-800 font-bold my-1">vs</span>
                  )}
                  {slip.date && <span className="text-[10px] font-bold text-gray-500">{slip.date}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-gray-900">{slip.away}</div>
                  <span className="text-2xl">{slip.awayFlag}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-gray-500 font-medium">Stake:</div>
                <div className="text-sm font-bold text-gray-900">£{slip.stake.toFixed(2)}</div>
              </div>
              
              {slip.status === "UPCOMING" ? (
                <>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-medium">Win:</div>
                    <div className="text-sm font-bold text-gray-900">{slip.win}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">{slip.odds.toFixed(2)}</div>
                    <div className="text-[10px] font-medium text-gray-500 mt-0.5">Potential: <span className="font-bold text-gray-900">£{(slip.stake * slip.odds).toFixed(2)}</span></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-medium">Result:</div>
                    <div className={`text-sm font-bold ${slip.result === "WIN" ? "text-green-500" : "text-red-500"}`}>{slip.result}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-medium">Odds:</div>
                    <div className="text-sm font-bold text-gray-900">{slip.odds.toFixed(2)}</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`w-8 h-6 rounded flex items-center justify-center text-white font-bold text-sm ${slip.result === "WIN" ? "bg-green-500" : "bg-red-500"}`}>
                      {slip.result === "WIN" ? "+" : "-"}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 mt-1">
                      {slip.result === "WIN" ? "Profit: " : "Loss: "}
                      <span className={`font-bold ${slip.result === "WIN" ? "text-green-500" : "text-red-500"}`}>
                        {slip.profit || slip.loss}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
