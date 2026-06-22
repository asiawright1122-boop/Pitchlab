"use client";

import { useTransition, useRef } from "react";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSandboxLogin = () => {
    const formData = new FormData();
    formData.append("email", "sandbox_master@pitchlab.io");
    startTransition(async () => {
      try {
        await loginAction(formData);
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#070a0b] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* 🟢 Mesh layout grid and ambient lights */}
      <div className="absolute inset-0 bg-quant-mesh opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#0a0f12]/80 backdrop-blur-xl border border-[#202b30] p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative z-10 flex flex-col gap-6">
        
        {/* Terminal Header */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* Pulsing indicator */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            <span className="text-[9px] font-black text-emerald-400 tracking-[0.25em] uppercase">PITCHLAB QUANT</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight uppercase mt-2">
            量化模拟操盘终端
          </h2>
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider max-w-[280px]">
            输入邮箱即可获取实时数据、赔率回测与模拟资产建仓
          </p>
        </div>

        {/* Action Form */}
        <form 
          className="flex flex-col gap-5" 
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await loginAction(formData);
              } catch (e: any) {
                alert(e.message);
              }
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-address" className="text-[9.5px] font-black text-gray-500 uppercase tracking-widest pl-1">
              邮箱地址 (Email Address)
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              ref={emailRef}
              autoComplete="email"
              required
              className="w-full bg-[#070a0b] border border-[#202b30] rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-xs font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              placeholder="你的邮箱地址 (如 test@example.com)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070a0b] font-black py-4 px-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] transition-all text-xs uppercase tracking-widest active:scale-[0.98] disabled:opacity-50 mt-1"
          >
            {isPending ? "正在加载量化工作空间..." : "继续访问终端"}
          </button>
        </form>

        {/* Separator line */}
        <div className="relative flex items-center justify-center my-1.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#202b30]/60"></div>
          </div>
          <span className="relative px-3 bg-[#0a0f12] text-[7.5px] font-black text-gray-600 tracking-[0.3em] uppercase">
            OR DEV SANDBOX
          </span>
        </div>

        {/* One-click Sandbox Login Button */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSandboxLogin}
            disabled={isPending}
            className="w-full bg-gradient-to-r from-[#171f22] to-[#12181b] hover:from-[#202a2e] hover:to-[#171f22] border border-[#d4af37]/30 text-[#f3e5ab] font-black py-3.5 px-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-base group-hover:scale-110 group-hover:rotate-6 transition-transform">💻</span>
            <span>一键测试沙盒登录 (Sandbox Bypass)</span>
          </button>
          
          <div className="flex items-start gap-2 bg-yellow-950/15 border border-yellow-600/10 rounded-xl p-3">
            <span className="text-xs mt-0.5">💡</span>
            <p className="text-[9px] text-gray-500 font-bold leading-normal uppercase tracking-wider">
              此方式免输验证，将直接以系统主沙盒用户登录，包含 4 笔已结算的模拟预测盈亏，可在个人主页中直接预览极精美的 RU 虚拟基金净值权益增长曲线走势。
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
