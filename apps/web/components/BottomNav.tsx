"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-safe z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        <Link 
          href="/predictions" 
          className="flex-1 flex items-center justify-center gap-2 font-bold text-[15px] text-[#007aff]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="5"></circle>
            <circle cx="12" cy="12" r="1"></circle>
          </svg>
          Predictions (10)
        </Link>
        <Link 
          href="/my-teams" 
          className="flex-1 bg-[#007aff] text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold text-[16px] shadow-sm ml-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          My Teams
        </Link>
      </div>
    </div>
  );
}
