import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  let wallet = await prisma.paperWallet.findUnique({
    where: { userId: user.id }
  });

  if (!wallet) {
    try {
      wallet = await prisma.paperWallet.create({
        data: {
          userId: user.id,
          balance: 10000,
        }
      });
    } catch (e) {
      console.error("Failed to auto-create wallet, fallback:", e);
      wallet = {
        id: "fallback",
        userId: user.id,
        balance: 10000,
        currency: "research_units",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  const trades = await prisma.paperTrade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-pitch text-white relative overflow-x-hidden">
      <header className="px-5 py-5 flex items-center justify-between sticky top-0 z-40 bg-[#070a0b]/90 backdrop-blur-md border-b border-[#202b30]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
          <span className="text-[13px] font-black text-white tracking-[0.25em] uppercase">
            MY PORTFOLIO
          </span>
        </div>
        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 rounded-full tracking-widest uppercase">
          Live Analyst
        </span>
      </header>

      <ProfileClient 
        user={user} 
        wallet={wallet} 
        initialTrades={trades} 
      />
    </div>
  );
}
