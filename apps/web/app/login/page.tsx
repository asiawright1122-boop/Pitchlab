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
    <div className="min-h-[100dvh] bg-[#f2f2f7] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* 🟢 iOS Ambient background decorations */}
      <div className="absolute inset-0 bg-quant-mesh opacity-30 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-white p-8 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] relative z-10 flex flex-col gap-6">
        
        {/* Terminal Header */}
        <div className="flex flex-col items-center text-center gap-3">
          {/* iOS pill tag */}
          <div className="flex items-center gap-2 bg-[#eafaf1] border border-[#d5f5e3] px-3.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] shadow-[0_0_6px_rgba(52,199,89,0.5)]"></span>
            <span className="text-[9px] font-black text-[#248a3d] tracking-[0.25em] uppercase">PITCHLAB QUANT</span>
          </div>

          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase mt-2">
            量化模拟操盘终端
          </h2>
          <p className="text-[10px] text-gray-450 font-bold uppercase tracking-wider max-w-[280px]">
            输入邮箱即可快速访问实时赔率回测与模拟大本营
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
            <label htmlFor="email-address" className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
              邮箱地址 (Email Address)
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              ref={emailRef}
              autoComplete="email"
              required
              className="w-full bg-[#f2f2f7] border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#34c759] focus:ring-1 focus:ring-[#34c759] transition-all text-xs font-bold"
              placeholder="你的邮箱地址 (如 test@example.com)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#34c759] hover:bg-[#30d158] text-white font-extrabold py-4 px-4 rounded-2xl shadow-[0_4px_12px_rgba(52,199,89,0.2)] transition-all text-xs uppercase tracking-widest active:scale-[0.98] disabled:opacity-50 mt-1"
          >
            {isPending ? "正在加载量化空间..." : "继续访问终端"}
          </button>
        </form>

        {/* Separator line */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/60"></div>
          </div>
          <span className="relative px-3 bg-white text-[7.5px] font-black text-gray-400 tracking-[0.3em] uppercase">
            OR DEV SANDBOX
          </span>
        </div>

        {/* One-click Sandbox Login Button */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSandboxLogin}
            disabled={isPending}
            className="w-full bg-[#f2f2f7] hover:bg-[#e5e5ea] border border-transparent text-[#007aff] font-extrabold py-3.5 px-4 rounded-2xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-base group-hover:scale-110 transition-transform">💻</span>
            <span>一键测试沙盒登录 (Sandbox Bypass)</span>
          </button>
          
          <div className="flex items-start gap-2 bg-[#eafaf1] border border-[#d5f5e3] rounded-2xl p-3.5">
            <span className="text-xs mt-0.5">💡</span>
            <p className="text-[9px] text-[#248a3d] font-bold leading-normal uppercase tracking-wider">
              此方式免输验证，将直接以系统主沙盒用户登录，包含 4 笔已结算的模拟预测盈亏，可在个人主页中直接预览极精美的 RU 虚拟基金净值权益增长曲线走势。
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
