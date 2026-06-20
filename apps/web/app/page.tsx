import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import heroStadiumBg from "../public/images/hero_stadium_bg.png";

export default async function LandingPage() {
  const fixtures = await prisma.fixture.findMany({
    where: { status: "scheduled" },
    orderBy: { kickoffUtc: "asc" },
    take: 5,
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Hero Section */}
      <section className="relative py-40 overflow-hidden bg-[#040a14]">
        {/* Next.js optimized HD Image with LCP priority and blur placeholder */}
        <Image
          src={heroStadiumBg}
          alt="World Cup 2026 Stadium"
          fill
          priority
          placeholder="blur"
          className="object-cover object-center pointer-events-none z-0 scale-105 blur-[8px] opacity-55"
          sizes="100vw"
        />
        {/* Advanced Deep Indigo Tint Overlay for Premium Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/90 via-[#071328]/75 to-[#040a14]/98 z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#040a14_90%)] z-10 opacity-80"></div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-20 text-center">
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <span className="px-4 py-1.5 bg-amber-500/10 text-amber-400 rounded-full text-xs font-extrabold uppercase tracking-widest border border-amber-500/20 mb-6 inline-block">
              Quantum Prediction Engine Active
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight text-white leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
              WORLD CUP <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">2026</span>
            </h1>
            <p className="text-lg md:text-xl mb-10 text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
              Advanced quantitative models, machine learning residual corrections, and real-time live betting analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/odds" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-lg font-extrabold px-8 py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 duration-200">
                开始量化分析
              </Link>
              <Link href="/about" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-lg font-bold px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 duration-200 backdrop-blur-sm">
                关于模型架构
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Matches */}
      <section className="py-16 max-w-6xl mx-auto px-4 w-full">
        <h2 className="text-3xl font-bold text-center mb-12 text-[#1a1a2e]">
          UPCOMING MATCHES
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fixtures.map((fixture) => (
            <div key={fixture.id} className="card p-6 flex flex-col items-center">
              <h3 className="text-xl font-bold mb-1">{fixture.home} VS {fixture.away}</h3>
              <p className="text-sm text-gray-500 mb-6">{fixture.league} | {fixture.kickoffUtc.toLocaleDateString()}</p>
              
              <div className="flex justify-between items-center w-full mb-6 px-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex justify-center items-center font-bold text-[#1a1a2e]">
                  {fixture.home.substring(0, 3).toUpperCase()}
                </div>
                
                <div className="text-center text-sm font-medium">
                  <p className="text-gray-500 text-xs">Kick-off</p>
                  <p>{fixture.kickoffUtc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex justify-center items-center font-bold text-[#1a1a2e]">
                  {fixture.away.substring(0, 3).toUpperCase()}
                </div>
              </div>
              
              <Link href={`/matches/${fixture.id}`} className="btn-primary w-full mt-auto text-center block">
                VIEW ODDS
              </Link>
            </div>
          ))}
          

        </div>
      </section>
    </div>
  );
}
