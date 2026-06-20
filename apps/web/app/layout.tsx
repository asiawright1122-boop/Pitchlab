import type { Metadata } from "next";
import Script from "next/script";
import { TmaAuthProvider } from "@/components/TmaAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Live Goals | WorldCup",
  description: "PitchLab TMA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-[#f0f2f5] text-slate-800">
        <div className="max-w-md mx-auto relative min-h-screen bg-white shadow-xl overflow-hidden flex flex-col">
          <TmaAuthProvider>
            <main className="flex-1 flex flex-col overflow-y-auto pb-20">
              {children}
            </main>
          </TmaAuthProvider>
        </div>
      </body>
    </html>
  );
}
