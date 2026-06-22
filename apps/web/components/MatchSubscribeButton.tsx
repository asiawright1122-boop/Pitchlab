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
          ? 'bg-[#34c759] text-white shadow-[0_3px_8px_rgba(52,199,89,0.25)]' 
          : 'bg-gray-50 border border-gray-200 text-gray-400 hover:text-[#34c759] hover:border-[#34c759]/30'
      }`}
    >
      <Bell size={12} className={isSubscribed ? "fill-current" : ""} />
    </button>
  );
}

