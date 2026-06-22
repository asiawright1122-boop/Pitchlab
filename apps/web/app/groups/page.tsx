import React from 'react';
import fs from 'fs';
import path from 'path';
import TeamFlag from '@/components/TeamFlag';

// 伪随机生成一致的群组在线活跃人数（避免 SSR & CSR 水合不一致的 hydration mismatch）
const getGroupMetrics = (name: string) => {
  const code = name.charCodeAt(name.length - 1) || 65;
  const members = 1200 + (code * 23) % 900;
  const online = Math.round(members * (0.12 + (code % 8) / 100));
  return { members, online };
};

// Telegram 超级群话题 Topic ID 映射配置 (方案 A)
const groupTopicMapping: Record<string, string> = {
  "GROUP A": "2",
  "GROUP B": "3",
  "GROUP C": "4",
  "GROUP D": "5",
  "GROUP E": "6",
  "GROUP F": "7",
  "GROUP G": "8",
  "GROUP H": "9",
};

export default async function GroupsDirectory() {
  // 1. 读取系统真实的 public/data/fixtures.json 分组关系，用于提取小组话题分类
  const dataFilePath = path.join(process.cwd(), 'public/data/fixtures.json');
  let officialGroups: { id: string; name: string; teams: string[] }[] = [];

  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    const fixturesData = JSON.parse(rawData);
    const jsonFixtures = fixturesData.fixtures || [];

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
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] pb-28 relative overflow-x-hidden select-none">
      {/* Decorative background grids */}
      <div className="absolute inset-0 bg-quant-mesh opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#34c759]/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Mini App Sticky Header */}
      <header className="px-5 py-5 flex items-center justify-between sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.3)] animate-pulse"></div>
          <span className="text-[12px] font-black text-gray-900 tracking-[0.25em] uppercase">
            QUANT CIRCLES
          </span>
        </div>
        <span className="text-[8px] font-black text-[#248a3d] bg-[#34c759]/10 px-2.5 py-1 border border-[#34c759]/20 rounded-full tracking-widest uppercase">
          COMMUNITY
        </span>
      </header>

      {/* Main Container - Optimized for mobile width */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-7 relative z-10">
        
        {/* 📢 PitchLab 官方社群信号通道 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Official Channels</h2>
          </div>
          
          <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            
            {/* Channel 1 */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#34c759]/10 border border-[#34c759]/20 flex items-center justify-center text-[#248a3d] shrink-0">
                  <span className="text-sm">🔔</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11.5px] font-black text-gray-800 uppercase tracking-wide truncate">Quant Signals Channel</span>
                  <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 leading-tight">
                    Real-time DC model edge warnings
                  </span>
                </div>
              </div>
              <a 
                href="https://t.me/pitchlab_signals" 
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-[8.5px] font-black uppercase tracking-widest shrink-0 transition-all duration-300"
              >
                Join
              </a>
            </div>

            {/* Channel 2 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 border border-[#007aff]/20 flex items-center justify-center text-[#007aff] shrink-0">
                  <span className="text-sm">💬</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11.5px] font-black text-gray-800 uppercase tracking-wide truncate">Global Traders Lounge</span>
                  <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 leading-tight">
                    Discuss odds, bets & strategies
                  </span>
                </div>
              </div>
              <a 
                href="https://t.me/pitchlab_chat" 
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-[8.5px] font-black uppercase tracking-widest shrink-0 transition-all duration-300"
              >
                Open
              </a>
            </div>

          </div>
        </div>

        {/* 🏟️ 赛事分组讨论大厅 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-4.5 bg-[#34c759] rounded-full inline-block"></span>
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Match Group Discussions</h2>
          </div>

          {officialGroups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-gray-400 text-xs">
              暂无讨论组话题数据
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {officialGroups.map((group) => {
                const metrics = getGroupMetrics(group.name);
                const gKey = group.name.toUpperCase();
                const topicId = groupTopicMapping[gKey] || "";
                const topicUrl = topicId ? `https://t.me/pitchlab_chat/${topicId}` : "https://t.me/pitchlab_chat";

                return (
                  <div key={group.name} id={group.id} className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] scroll-mt-24">
                    <div className="bg-[#34c759]/5 px-5 py-3 border-b border-gray-150 flex justify-between items-center">
                      <h3 className="text-xs font-black text-[#248a3d] uppercase tracking-wider">{group.name} Discussion Circle</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse"></span>
                        <span className="text-[7.5px] font-black text-[#248a3d] uppercase tracking-widest">Topic #{topicId || 'Chat'}</span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col gap-4">
                      {/* Topic Scope & Online indicators */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Topics Scope</span>
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Avatar stacked flags */}
                            <div className="flex -space-x-1.5 shrink-0">
                              {group.teams.map((team, idx) => (
                                <TeamFlag key={idx} teamName={team} className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover shrink-0" />
                              ))}
                            </div>
                            <span className="text-[10px] font-extrabold text-gray-600 uppercase truncate max-w-[140px]">
                              {group.teams.map(t => t.substring(0, 3)).join(" / ")}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col justify-center shrink-0">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Members Status</span>
                          <span className="text-[10.5px] font-black text-gray-800 mt-0.5 leading-none">
                            {metrics.members.toLocaleString()} / <span className="text-[#34c759] font-extrabold">{metrics.online} Live</span>
                          </span>
                        </div>
                      </div>

                      {/* Join Action button */}
                      <a 
                        href={topicUrl} 
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-2xl bg-[#34c759] hover:bg-[#2fbd53] text-white text-[10px] font-black uppercase tracking-widest text-center shadow-[0_4px_12px_rgba(52,199,89,0.15)] active:scale-95 transition-all duration-300 block"
                      >
                        Enter Topic Thread
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
