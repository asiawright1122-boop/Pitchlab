"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Users, User, LayoutGrid } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Quant Hub", icon: LayoutGrid },
    { href: "/standings", label: "Leaderboard", icon: Trophy },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/profile", label: "Portfolio", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#070a0b]/90 backdrop-blur-md border-t border-[#202b30] p-2 pb-6.5 z-50 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        // 支持模糊路径匹配
        const active = item.href === "/" 
          ? pathname === "/" 
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all duration-300 active:scale-95 ${
              active 
                ? "text-emerald-400 font-black" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon 
              size={18} 
              className={`transition-all duration-300 ${
                active ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] stroke-[2.5px]" : "stroke-[2px]"
              }`}
            />
            <span className="text-[9px] uppercase tracking-widest leading-none font-bold mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
