"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Fixture } from "@prisma/client";
import TeamFlag from "./TeamFlag";

export function MyTeamsClient({ allFixtures }: { allFixtures: Fixture[] }) {
  const [followedTeams, setFollowedTeams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pitchlab_followed_teams");
      if (saved) {
        setFollowedTeams(JSON.parse(saved));
      }
    }
  }, []);

  const teamsList = useMemo(() => {
    return Object.keys(followedTeams).filter(team => followedTeams[team]);
  }, [followedTeams]);

  // Filter fixtures to only show upcoming fixtures for the followed teams
  const teamFixtures = useMemo(() => {
    if (teamsList.length === 0) return [];
    return allFixtures.filter(f => 
      teamsList.includes(f.home) || teamsList.includes(f.away)
    ).slice(0, 10); // Show max 10 upcoming for followed
  }, [allFixtures, teamsList]);

  const removeTeam = (teamName: string) => {
    const next = { ...followedTeams, [teamName]: false };
    setFollowedTeams(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("pitchlab_followed_teams", JSON.stringify(next));
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-4 pb-24">
        
        {/* Teams List */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">FOLLOWED TEAMS</h2>
          </div>

          <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50">
            {teamsList.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                You haven't followed any teams yet. <br/><br/>
                <Link href="/" className="text-[#007aff] font-bold">Go to Dashboard</Link> to find teams!
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {teamsList.map((teamName, i) => (
                  <div key={i} className="flex flex-col items-center relative">
                    <div className="w-12 h-8 mb-2 relative flex items-center justify-center">
                      <TeamFlag teamName={teamName} className="w-10 h-7 object-cover shadow-sm rounded-sm" />
                      <button onClick={() => removeTeam(teamName)} className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 border border-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-gray-900 text-center truncate w-full uppercase">{teamName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Fixtures */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">UPCOMING MATCHES</h2>
          </div>

          <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden">
            {teamsList.length > 0 && teamFixtures.length === 0 && (
              <div className="p-8 text-center text-gray-400 font-medium text-sm">
                No upcoming fixtures scheduled for your followed teams.
              </div>
            )}
            
            {teamFixtures.length > 0 && (
              <div className="divide-y divide-gray-50">
                {teamFixtures.map((match) => (
                  <Link href={`/matches/${match.id}`} key={match.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer block">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center w-[60px] shrink-0 text-center">
                        <span className="text-[11px] font-bold text-gray-500">{new Date(match.kickoffUtc).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        <span className="text-[13px] font-bold text-gray-900">{new Date(match.kickoffUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <TeamFlag teamName={match.home} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                            <span className="text-[15px] font-bold text-gray-900">{match.home}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <TeamFlag teamName={match.away} className="w-5 h-5 object-cover rounded-full border border-gray-100" />
                            <span className="text-[15px] text-gray-500">{match.away}</span>
                          </div>
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
            )}
            
            {teamsList.length === 0 && (
              <div className="p-8 text-center text-gray-400 font-medium text-sm">
                Follow teams to see their upcoming matches here.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
