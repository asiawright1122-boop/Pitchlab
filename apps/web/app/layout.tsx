import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchLab | 2026 World Cup",
  description: "Demo layout replicating wc-2026.com",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-0 flex items-center justify-between h-16">
            <Link href="/" className="text-slate-800 hover:text-slate-900 text-xl font-bold flex items-center gap-2 mr-8">
              PitchLab | 2026
            </Link>
            
            <nav className="hidden md:flex items-center h-full text-[15px] font-medium">
              {/* Fixtures */}
              <Link href="/groups" className="h-full flex items-center px-4 text-slate-600 hover:text-slate-800 transition-colors">
                赛程
              </Link>

              {/* Odds - Direct link (page has its own tab switcher) */}
              <Link
                href="/odds"
                className="h-full flex items-center px-4 text-[#e04039] font-semibold transition-colors hover:text-[#c0332d]"
              >
                赔率中心
              </Link>

              {/* Standings */}
              <div className="group relative h-full flex items-center px-4 cursor-pointer">
                <span className="flex items-center gap-1 text-slate-600 hover:text-slate-850 transition-colors">
                  积分榜
                  <svg className="w-4 h-4 mt-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </span>
                <div className="absolute left-0 top-full hidden group-hover:block w-48 bg-white border border-slate-200/80 shadow-2xl rounded-b-xl border-t-4 border-[#e04039] z-50">
                  <div className="py-2">
                    <Link href="/standings#teams" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">球队积分榜</Link>
                    <Link href="/standings#scorers" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">射手榜</Link>
                    <Link href="/standings#assists" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">助攻榜</Link>
                    <Link href="/standings#cards" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">红黄牌统计</Link>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="group relative h-full flex items-center px-4 cursor-pointer">
                <span className="flex items-center gap-1 text-slate-600 hover:text-slate-850 transition-colors">
                  关于世界杯
                  <svg className="w-4 h-4 mt-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </span>
                <div className="absolute left-0 top-full hidden group-hover:block w-48 bg-white border border-slate-200/80 shadow-2xl rounded-b-xl border-t-4 border-[#e04039] z-50">
                  <div className="py-2">
                    <Link href="/about#rules" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">赛制介绍</Link>
                    <Link href="/about#cities" className="block px-6 py-2.5 text-slate-600 hover:text-slate-850 hover:bg-slate-50 transition-colors">举办城市</Link>
                  </div>
                </div>
              </div>


              
              {/* Search Icon */}
              <button className="px-4 text-slate-600 hover:text-slate-850 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>
            </nav>
            
            <div className="ml-auto flex items-center gap-4">
              {user ? (
                <Link href="/dashboard" className="flex items-center gap-2 text-slate-700 hover:text-slate-900">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-[#e04039] flex items-center justify-center text-sm font-bold text-[#e04039]">
                    {user.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{user.email.split('@')[0]}</span>
                </Link>
              ) : (
                <Link href="/login" className="bg-[#e04039] text-white px-5 py-2 rounded text-sm font-semibold hover:bg-white hover:text-[#1a1a2e] border border-transparent hover:border-slate-200 transition-colors shadow-sm">
                  注册 / 登录
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="bg-white/60 backdrop-blur-md border-t border-slate-200/50 text-slate-450 py-8 mt-12">
          <div className="max-w-6xl mx-auto px-4 text-center text-xs font-semibold">
            <p className="mb-2 text-slate-500">PitchLab Quant Edge · World Cup 2026</p>
            <p>已成功接入 Dixon-Coles 预测量化引擎与 Prisma 数据库实时数据源</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
