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

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <header className="bg-white px-4 pt-6 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex justify-between items-center">
        <h1 className="font-bold text-2xl tracking-tight text-gray-900 flex items-center gap-2">
          My Teams 
          <Link href="/" className="text-blue-500 rounded-full w-6 h-6 flex items-center justify-center border-2 border-blue-500 text-lg leading-none hover:bg-blue-50 transition">+</Link>
        </h1>
        <button className="text-gray-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Teams Grid */}
        <div className="grid grid-cols-3 gap-3">
          {teamsList.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-400 text-sm">
              You haven't followed any teams yet. <br/><br/>
              <Link href="/" className="text-blue-500 font-bold underline">Go back to the Match List</Link> and click on a team to follow them!
            </div>
          ) : (
            teamsList.map((teamName, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center relative cursor-pointer hover:shadow-md transition">
                <div className="w-10 h-10 mb-2">
                   <TeamFlag teamName={teamName} className="w-full h-full object-cover rounded-full border border-gray-100 shadow-sm" />
                </div>
                <h3 className="font-bold text-[10px] text-gray-900 truncate w-full text-center">{teamName.toUpperCase()}</h3>
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[9px] text-green-500 font-bold">Following</span>
                </div>
                <button onClick={() => {
                   const next = { ...followedTeams, [teamName]: false };
                   setFollowedTeams(next);
                   localStorage.setItem("pitchlab_followed_teams", JSON.stringify(next));
                }} className="absolute top-2 right-2 opacity-30 hover:opacity-100 transition-opacity">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Fixtures */}
        {teamsList.length > 0 && (
          <div>
            <h2 className="font-bold text-lg text-gray-900 mb-3">Upcoming Fixtures</h2>
            {teamFixtures.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-4">No scheduled fixtures for your followed teams right now.</div>
            ) : (
              <div className="space-y-3">
                {teamFixtures.map((fixture) => (
                  <div key={fixture.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 flex items-center justify-between">
                      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center p-1 shrink-0">
                        <TeamFlag teamName={fixture.home} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div className="flex-1 px-3 text-center">
                        <h3 className="font-black text-sm text-gray-900">{fixture.home.toUpperCase()} vs. {fixture.away.toUpperCase()}</h3>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">{fixture.league}</p>
                        <p className="text-[11px] text-gray-800 font-bold mt-0.5">{new Date(fixture.kickoffUtc).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center p-1 shrink-0">
                        <TeamFlag teamName={fixture.away} className="w-full h-full object-cover rounded-full" />
                      </div>
                    </div>
                    <Link href={`/matches/${fixture.id}`} className="bg-blue-50/50 py-2.5 text-center border-t border-blue-100/50 hover:bg-blue-50 transition block">
                      <span className="text-xs font-bold text-blue-600">View Match</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
