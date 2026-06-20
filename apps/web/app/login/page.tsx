"use client";

import { useTransition } from "react";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f8f9fa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e8e8e8]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1a1a2e]">
            登录 / 注册
          </h2>
          <p className="mt-2 text-center text-sm text-[#555]">
            输入邮箱即可快速进入 PitchLab 后台
          </p>
        </div>
        <form 
          className="mt-8 space-y-6" 
          action={(formData) => {
            startTransition(() => {
              loginAction(formData).catch(e => alert(e.message));
            });
          }}
        >
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                邮箱地址
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-[#e8e8e8] placeholder-gray-400 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-[#e04039] focus:border-[#e04039] focus:z-10 sm:text-sm"
                placeholder="你的邮箱地址 (如 test@example.com)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e04039] hover:bg-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e04039] transition-colors disabled:opacity-50"
            >
              {isPending ? "登录中..." : "继续"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
