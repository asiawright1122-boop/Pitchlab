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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-800 pb-24">
      {/* Decorative grids */}
      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#e04039]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight leading-none">Groups Directory</h1>
          <p className="text-slate-500 text-lg font-medium">Browse official World Cup groups and teams</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {officialGroups.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-16 text-center text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
             暂无有效的分组数据
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {officialGroups.map((group) => (
              <div key={group.name} id={group.id} className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 scroll-mt-24">
                <div className="bg-[#e04039]/5 px-6 py-4 border-b border-slate-200/50 flex justify-between items-center">
                  <h2 className="text-xl font-black text-[#e04039]">{group.name}</h2>
                </div>
                
                <ul className="divide-y divide-slate-100">
                  {group.teams.map((team, idx) => (
                    <li key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-450 w-4">{idx + 1}</span>
                        <TeamFlag teamName={team} className="w-8 h-5.5 rounded shadow-sm" />
                        <span className="font-bold text-slate-800">{team}</span>
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
