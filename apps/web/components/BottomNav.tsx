"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-[360px] bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-2 z-50 flex items-center">
      <Link 
        href="/predictions" 
        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full font-bold text-[13px] transition ${pathname === '/predictions' ? 'bg-[#007aff] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="5"></circle>
          <circle cx="12" cy="12" r="1"></circle>
        </svg>
        Predictions
      </Link>
      <Link 
        href="/my-teams" 
        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full font-bold text-[13px] transition ${pathname === '/my-teams' ? 'bg-[#007aff] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        My Teams
      </Link>
    </div>
  );
}
