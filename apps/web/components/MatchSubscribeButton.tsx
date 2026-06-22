"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export function MatchSubscribeButton({ fixtureId }: { fixtureId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pitchlab_followed_matches");
      if (saved) {
        try {
          const matches = JSON.parse(saved);
          setIsSubscribed(!!matches[fixtureId]);
        } catch (e) {
          console.error("Failed to parse followed matches:", e);
        }
      }
    }
  }, [fixtureId]);

  const toggleSubscribe = () => {
    setIsSubscribed(prev => {
      const nextState = !prev;
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pitchlab_followed_matches");
        const matches = saved ? JSON.parse(saved) : {};
        matches[fixtureId] = nextState;
        localStorage.setItem("pitchlab_followed_matches", JSON.stringify(matches));
      }
      return nextState;
    });
  };

  return (
    <button 
      onClick={toggleSubscribe}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
        isSubscribed 
          ? 'bg-emerald-500 text-[#070a0b] shadow-[0_0_12px_#10b981]' 
          : 'bg-[#161e22] border border-[#202b30] text-gray-500 hover:text-emerald-500 hover:border-emerald-500/40'
      }`}
    >
      <Bell size={13} className={isSubscribed ? "fill-current" : ""} />
    </button>
  );
}

