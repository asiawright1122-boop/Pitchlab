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
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white/80 backdrop-blur-lg border-t border-gray-200/50 p-2 pb-6.5 z-50 flex items-center justify-around select-none shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" 
          ? pathname === "/" 
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all duration-300 active:scale-95 ${
              active 
                ? "text-[#34c759] font-extrabold" 
                : "text-gray-450 hover:text-gray-700"
            }`}
          >
            <Icon 
              size={18} 
              className={`transition-all duration-300 ${
                active ? "stroke-[2.5px] drop-shadow-[0_1px_4px_rgba(52,199,89,0.2)]" : "stroke-[2px]"
              }`}
            />
            <span className="text-[9px] uppercase tracking-wider leading-none font-bold mt-1 whitespace-nowrap">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
