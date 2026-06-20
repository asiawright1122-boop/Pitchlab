"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Fixture } from "@prisma/client";

export function DashboardClient({ initialFixtures }: { initialFixtures: Fixture[] }) {
  // Generate date tabs starting from today
  const [activeDateIndex, setActiveDateIndex] = useState(3);
  
  const dates = [
    { day: "WED", date: "17", dateStr: "2024-04-17" },
    { day: "THU", date: "18", dateStr: "2024-04-18" },
    { day: "FRI", date: "19", dateStr: "2024-04-19" },
    { day: "TODAY", date: "20", dateStr: "2024-04-20" },
    { day: "SUN", date: "21", dateStr: "2024-04-21" },
    { day: "MON", date: "22", dateStr: "2024-04-22" },
    { day: "TUE", date: "23", dateStr: "2024-04-23" },
  ];

  const teams = [
    { name: "USA", flag: "🇺🇸" },
    { name: "Argentina", flag: "🇦🇷" },
    { name: "France", flag: "🇫🇷" },
    { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Spain", flag: "🇪🇸" },
  ];

  const [followedTeams, setFollowedTeams] = useState<Record<string, boolean>>({});

  const toggleFollow = (teamName: string) => {
    setFollowedTeams(prev => ({ ...prev, [teamName]: !prev[teamName] }));
  };

  // For this demo, we just group the initial fixtures since we don't have enough DB data across many dates
  const grouped = useMemo(() => {
    return initialFixtures.reduce((acc, fixture) => {
      if (!acc[fixture.league]) acc[fixture.league] = [];
      acc[fixture.league].push(fixture);
      return acc;
    }, {} as Record<string, typeof initialFixtures>);
  }, [initialFixtures]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      {/* Top Header */}
      <header className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <button className="text-blue-500 font-medium">关闭</button>
          <div className="text-center">
            <h1 className="font-bold text-lg leading-tight">Football Live Goals | WorldCup</h1>
            <p className="text-xs text-gray-400">小程序</p>
          </div>
          <button className="text-blue-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
        </div>

        {/* Date Picker */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
          {dates.map((d, i) => {
            const active = activeDateIndex === i;
            return (
              <div 
                key={i} 
                onClick={() => setActiveDateIndex(i)}
                className={`flex flex-col items-center justify-center min-w-[50px] px-2 py-1 rounded-xl cursor-pointer transition-colors ${active ? 'bg-[#1d4ed8] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <span className={`text-[10px] font-bold ${active ? 'text-blue-100' : 'text-gray-400'}`}>{d.day}</span>
                <span className={`text-base font-bold ${active ? 'text-white' : 'text-gray-800'}`}>{d.date}</span>
              </div>
            );
          })}
          <div className="ml-auto pl-2 border-l border-gray-200">
            <button className="p-2 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 pb-24">
        
        {/* Follow Your Teams Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <span>🏆</span> WORLD CUP 2026
            </h2>
            <button className="text-gray-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Follow your teams</h3>
          <p className="text-sm text-gray-500 mb-4">Follow national teams to get World Cup match notifications</p>

          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 mb-2">
            {teams.map((team, i) => {
              const isFollowing = followedTeams[team.name];
              return (
                <div key={i} onClick={() => toggleFollow(team.name)} className="flex flex-col items-center justify-center border border-gray-200 rounded-xl p-3 min-w-[80px] shrink-0 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="text-3xl mb-1 relative">
                    {team.flag}
                    <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-white text-white ${isFollowing ? 'bg-green-500' : 'bg-blue-500'}`}>
                      {isFollowing ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{team.name}</span>
                  <span className={`text-[10px] font-bold mt-1 ${isFollowing ? 'text-green-500' : 'text-blue-500'}`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </span>
                </div>
              );
            })}
          </div>
          <Link href="/my-teams" className="w-full py-3 mt-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 flex items-center justify-center gap-1 hover:bg-gray-50 transition">
            See all followed teams
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Link>
        </div>

        {/* Live Matches List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-xs font-bold text-gray-800 tracking-wide">LIVE - MATCHES</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Example Live Match */}
            <Link href="/matches/live-dummy" className="p-3 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer block">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-green-500 w-8">90'</span>
                <div className="flex flex-col items-end w-4 gap-2">
                  <span className="text-sm font-bold text-gray-800">1</span>
                  <span className="text-sm font-bold text-gray-800">0</span>
                </div>
                <div className="flex flex-col gap-1.5 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">H</div>
                    <span className="text-sm font-bold text-gray-900">Robina City</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">A</div>
                    <span className="text-sm font-medium text-gray-500">Logan Lightning</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </Link>

            {Object.entries(grouped).map(([league, matches]) => (
              <div key={league} className="border-t-[6px] border-gray-100">
                <div className="p-3 bg-white flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 uppercase">
                    <span>🌍</span> {league}
                  </h3>
                  <span className="text-xs text-blue-500 font-medium flex items-center gap-0.5 cursor-pointer">
                    Open <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {matches.map((match) => (
                    <Link href={`/matches/${match.id}`} key={match.id} className="p-3 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer block">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-800 w-16">{new Date(match.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                              {match.home.substring(0, 1)}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{match.home}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold text-[10px]">
                              {match.away.substring(0, 1)}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{match.away}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
