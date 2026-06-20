import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function MyTeamsPage() {
  // Fetch a few upcoming fixtures to simulate the upcoming fixtures list
  const fixtures = await prisma.fixture.findMany({
    where: { status: "scheduled" },
    orderBy: { kickoffUtc: "asc" },
    take: 3,
  });

  const teams = [
    { name: "USA", flag: "🇺🇸", following: true, notifs: false },
    { name: "Argentina", flag: "🇦🇷", following: true, notifs: false },
    { name: "France", flag: "🇫🇷", following: true, notifs: true },
    { name: "Spain", flag: "🇪🇸", following: true, notifs: true },
    { name: "Brazil", flag: "🇧🇷", following: true, notifs: true },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f2f2f7]">
      <header className="bg-white px-4 pt-6 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex justify-between items-center">
        <h1 className="font-bold text-2xl tracking-tight text-gray-900 flex items-center gap-2">
          My Teams 
          <button className="text-blue-500 rounded-full w-6 h-6 flex items-center justify-center border-2 border-blue-500 text-lg leading-none hover:bg-blue-50 transition">+</button>
        </h1>
        <button className="text-gray-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Teams Grid */}
        <div className="grid grid-cols-3 gap-3">
          {teams.map((team, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col items-center relative cursor-pointer hover:shadow-md transition">
              <div className="text-4xl mb-2">{team.flag}</div>
              <h3 className="font-bold text-xs text-gray-900 truncate w-full text-center">{team.name.toUpperCase()}</h3>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[9px] text-gray-500">Following</span>
                {team.notifs && <span className="text-[8px] text-gray-400">(Notifications ON)</span>}
              </div>
              <div className="absolute top-2 right-2 opacity-30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Fixtures */}
        <div>
          <h2 className="font-bold text-lg text-gray-900 mb-3">Upcoming Fixtures</h2>
          <div className="space-y-3">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-4 flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                    {fixture.home.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 px-3 text-center">
                    <h3 className="font-black text-sm text-gray-900">{fixture.home.toUpperCase()} vs. {fixture.away.toUpperCase()}</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">{fixture.league}</p>
                    <p className="text-[11px] text-gray-800 font-bold mt-0.5">{new Date(fixture.kickoffUtc).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-800 flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                    {fixture.away.substring(0,2).toUpperCase()}
                  </div>
                </div>
                <Link href={`/matches/${fixture.id}`} className="bg-blue-50/50 py-2.5 text-center border-t border-blue-100/50 hover:bg-blue-50 transition block">
                  <span className="text-xs font-bold text-blue-600">View Match</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
