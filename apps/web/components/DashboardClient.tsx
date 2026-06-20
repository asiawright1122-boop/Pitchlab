"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Fixture } from "@prisma/client";
import TeamFlag from "./TeamFlag";

export function DashboardClient({ initialFixtures }: { initialFixtures: Fixture[] }) {
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  
  const dates = useMemo(() => {
    const uniqueDatesMap = new Map<string, Date>();
    initialFixtures.forEach(f => {
      const d = new Date(f.kickoffUtc);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!uniqueDatesMap.has(key)) {
        uniqueDatesMap.set(key, d);
      }
    });
    
    let uniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => a.getTime() - b.getTime());
    if (uniqueDates.length === 0) {
      uniqueDates = [new Date()];
    }

    return uniqueDates.map((d) => {
      return {
        day: d.toLocaleDateString("en-US", { weekday: 'short' }).toUpperCase(),
        date: d.getDate().toString(),
        dateObj: d
      };
    });
  }, [initialFixtures]);

  const teams = useMemo(() => {
    const teamSet = new Set<string>();
    initialFixtures.forEach(f => {
      teamSet.add(f.home);
      teamSet.add(f.away);
    });
    return Array.from(teamSet).map(name => ({ name }));
  }, [initialFixtures]);

  const [followedTeams, setFollowedTeams] = useState<Record<string, boolean>>({});

  const filteredFixtures = useMemo(() => {
    if (dates.length === 0) return [];
    const selectedDate = dates[activeDateIndex]?.dateObj || dates[0].dateObj;
    return initialFixtures.filter(f => {
      const d = new Date(f.kickoffUtc);
      return d.getDate() === selectedDate.getDate() && 
             d.getMonth() === selectedDate.getMonth() && 
             d.getFullYear() === selectedDate.getFullYear();
    });
  }, [initialFixtures, activeDateIndex, dates]);

  const grouped = useMemo(() => {
    return filteredFixtures.reduce((acc, fixture) => {
      if (!acc[fixture.league]) acc[fixture.league] = [];
      acc[fixture.league].push(fixture);
      return acc;
    }, {} as Record<string, typeof filteredFixtures>);
  }, [filteredFixtures]);

  const toggleFollow = (teamName: string) => {
    setFollowedTeams(prev => {
      const next = { ...prev, [teamName]: !prev[teamName] };
      if (typeof window !== "undefined") {
        localStorage.setItem("pitchlab_followed_teams", JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pitchlab_followed_teams");
      if (saved) {
        setFollowedTeams(JSON.parse(saved));
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <header className="bg-white px-4 pt-2 pb-2 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar flex-1">
          {dates.map((d, i) => {
            const active = activeDateIndex === i;
            return (
              <div 
                key={i} 
                onClick={() => setActiveDateIndex(i)}
                className={`flex flex-col items-center justify-center min-w-[50px] px-2 py-1.5 rounded-2xl cursor-pointer transition-colors ${active ? 'bg-[#007aff] text-white' : 'text-gray-500'}`}
              >
                <span className={`text-[10px] font-bold ${active ? 'text-blue-100' : 'text-gray-400'}`}>{active && d.dateObj.toDateString() === new Date().toDateString() ? 'TODAY' : d.day}</span>
                <span className={`text-[17px] font-bold ${active ? 'text-white' : 'text-black'}`}>{d.date}</span>
              </div>
            );
          })}
        </div>
        <button className="ml-4 w-10 h-10 border border-gray-200 rounded-2xl flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 pb-24">
        
        {/* AVAILABLE TEAMS BLOCK */}
        <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 relative">
          <button className="absolute top-4 right-4 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
              <span>🏆</span> WORLD CUP 2026
            </h2>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Follow your teams</h3>
          <p className="text-[13px] text-gray-500 mb-4 leading-tight">Follow national teams to get World Cup match notifications</p>

          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 mb-2">
            {teams.slice(0, 10).map((team, i) => {
              const isFollowing = followedTeams[team.name];
              return (
                <div key={i} onClick={() => toggleFollow(team.name)} className="flex flex-col items-center justify-center border border-gray-200 rounded-2xl p-3 min-w-[85px] shrink-0 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-8 mb-2 relative flex items-center justify-center">
                    <TeamFlag teamName={team.name} className="w-10 h-7 object-cover shadow-sm rounded-sm" />
                    <div className="absolute -bottom-2 -right-1 bg-[#007aff] rounded-full p-0.5 border-2 border-white text-white">
                      {isFollowing ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-gray-900 text-center truncate w-full mb-1">{team.name}</span>
                  <span className={`text-[11px] font-medium ${isFollowing ? 'text-gray-400' : 'text-[#007aff]'}`}>{isFollowing ? 'Following' : 'Follow'}</span>
                </div>
              );
            })}
          </div>
          <Link href="/my-teams" className="w-full py-3.5 mt-1 border border-gray-200 rounded-2xl text-[13px] font-bold text-gray-900 flex items-center justify-center gap-1 hover:bg-gray-50 transition">
            See all World Cup teams <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Link>
        </div>

        {/* MATCHES BLOCK */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="w-3.5 h-3.5 rounded-full bg-green-500"></div>
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">LIVE - MATCHES</h2>
          </div>

          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden">
            {Object.keys(grouped).length === 0 && (
              <div className="p-8 text-center text-gray-400 font-medium text-sm">
                No fixtures scheduled for this date.
              </div>
            )}
            
            {Object.entries(grouped).map(([league, matches], index) => (
              <div key={league} className={index > 0 ? "border-t-[8px] border-[#f2f2f7]" : ""}>
                <div className="px-4 py-3 bg-white flex justify-between items-center border-b border-gray-50">
                  <h3 className="text-[12px] font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                    <span>🌍</span> {league}
                  </h3>
                  <span className="text-[13px] text-[#007aff] font-medium flex items-center gap-0.5 cursor-pointer">
                    Open <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {matches.map((match) => (
                    <Link href={`/matches/${match.id}`} key={match.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer block">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center justify-center w-[60px] shrink-0">
                          {match.status === 'finished' ? (
                            <span className="text-[13px] font-bold text-gray-500">FT</span>
                          ) : (
                            <span className="text-[13px] font-bold text-gray-900">{new Date(match.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <TeamFlag teamName={match.home} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                              <span className="text-[15px] font-bold text-gray-900">{match.home}</span>
                            </div>
                            <span className="text-[15px] font-bold text-gray-900">{match.status === 'finished' ? match.homeGoals : ''}</span>
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <TeamFlag teamName={match.away} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                              <span className="text-[15px] text-gray-500">{match.away}</span>
                            </div>
                            <span className="text-[15px] font-bold text-gray-900">{match.status === 'finished' ? match.awayGoals : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-4 shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
