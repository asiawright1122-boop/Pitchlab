"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export function TmaAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if we are inside Telegram
    const initData = window.Telegram?.WebApp?.initData;
    
    if (initData) {
      // Tell Telegram that the App is ready and expand it
      window.Telegram?.WebApp?.ready();
      window.Telegram?.WebApp?.expand();

      // Optional: Set theme colors if needed
      // window.Telegram.WebApp?.setHeaderColor("#f9fafb");
      // window.Telegram.WebApp?.setBackgroundColor("#f9fafb");

      // Silently authenticate
      fetch("/api/auth/tma-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          // Force a router refresh so server components pick up the new session cookie
          router.refresh();
        } else {
          console.error("TMA Auth failed:", data.error);
        }
      })
      .catch(err => {
        console.error("TMA Auth network error:", err);
      })
      .finally(() => {
        setIsAuthenticating(false);
      });
    } else {
      // Not in Telegram (e.g., opened in a regular browser), proceed immediately
      setIsAuthenticating(false);
    }
  }, [router]);

  if (isAuthenticating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading PitchLab...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
