import React from 'react';
import fs from 'fs';
import path from 'path';
import TeamFlag from '@/components/TeamFlag';

export default async function GroupsDirectory() {
  // 1. 读取系统真实的 public/data/fixtures.json 分组关系
  const dataFilePath = path.join(process.cwd(), 'public/data/fixtures.json');
  let officialGroups: { id: string; name: string; teams: string[] }[] = [];

  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    const fixturesData = JSON.parse(rawData);
    const jsonFixtures = fixturesData.fixtures || [];

    // 从真实的赛事数据中提取 Group 映射关系
    const groupsMap: Record<string, Set<string>> = {};
    jsonFixtures.forEach((f: any) => {
      if (f.group && f.home && f.away) {
        const groupName = f.group.toUpperCase();
        if (!groupsMap[groupName]) {
          groupsMap[groupName] = new Set();
        }
        groupsMap[groupName].add(f.home);
        groupsMap[groupName].add(f.away);
      }
    });

    officialGroups = Object.keys(groupsMap).sort().map(groupName => ({
      id: `group-${groupName}`,
      name: `Group ${groupName}`,
      teams: Array.from(groupsMap[groupName]).sort()
    }));
  } catch (error) {
    console.error("Failed to load official groups from public/data/fixtures.json:", error);
  }

  return (
    <div className="min-h-screen bg-[#070a0b] text-white pb-28 relative overflow-x-hidden select-none">
      {/* Decorative grids */}
      <div className="absolute inset-0 bg-quant-mesh opacity-15 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Mini App Sticky Header */}
      <header className="px-5 py-5 flex items-center justify-between sticky top-0 z-40 bg-[#070a0b]/90 backdrop-blur-md border-b border-[#202b30]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
          <span className="text-[13px] font-black text-white tracking-[0.25em] uppercase">
            GROUPS DIRECTORY
          </span>
        </div>
        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 rounded-full tracking-widest uppercase">
          World Cup
        </span>
      </header>

      {/* Main Container - Optimized for mobile width */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6 relative z-10">
        {officialGroups.length === 0 ? (
          <div className="bg-[#0a0f12]/70 backdrop-blur-md border border-[#202b30] rounded-3xl p-16 text-center text-gray-500 text-xs">
             暂无有效的分组数据
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {officialGroups.map((group) => (
              <div key={group.name} id={group.id} className="bg-[#0a0f12]/70 backdrop-blur-md border border-[#202b30] rounded-3xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.55)] transition-all duration-300 scroll-mt-24">
                <div className="bg-emerald-500/5 px-5 py-3.5 border-b border-[#202b30] flex justify-between items-center">
                  <h2 className="text-xs font-black text-emerald-400 uppercase tracking-wider">{group.name}</h2>
                  <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-widest">Official Teams</span>
                </div>
                
                <ul className="divide-y divide-[#202b30]/50">
                  {group.teams.map((team, idx) => (
                    <li key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-emerald-500/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-gray-500 w-4">{idx + 1}</span>
                        <TeamFlag teamName={team} className="w-6.5 h-4.5 rounded shadow-sm object-cover border border-[#202b30]/40" />
                        <span className="font-extrabold text-white text-xs uppercase tracking-wide">{team}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
