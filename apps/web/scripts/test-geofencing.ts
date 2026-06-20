import { middleware } from "../middleware";
import { NextRequest } from "next/server";

// 强制设置测试变量
(process.env as any).NODE_ENV = "development";
process.env.BLOCKED_COUNTRIES = "CN,KP";

async function runTests() {
  console.log("=== 正在运行 PitchLab 地理限制 (Geofencing) 中间件测试 ===");

  // 1. 测试普通不受限制国家请求 (如 US)
  const reqUS = new NextRequest(new URL("http://localhost:3000/matches"), {
    headers: {
      "x-vercel-ip-country": "US",
    },
  });

  const resUS = middleware(reqUS);
  // 对于不被拦截的请求，中间件会返回 NextResponse.next() (或者说是不重定向，这里通过 location 头部检测是否为 null)
  const isRedirectedUS = resUS?.headers.get("location") !== null && resUS?.status === 307;
  console.log(`测试 1: 允许美国 (US) 用户访问 ➔ ${!isRedirectedUS ? "通过 ✅" : "拦截 ❌"}`);
  if (isRedirectedUS) {
    throw new Error("测试失败: 错误拦截了非限制地区用户！");
  }

  // 2. 测试被屏蔽地区 Web 网页访问 (例如 IP 国家为 CN)
  const reqCN = new NextRequest(new URL("http://localhost:3000/matches"), {
    headers: {
      "x-vercel-ip-country": "CN",
    },
  });

  const resCN = middleware(reqCN);
  const locationCN = resCN?.headers.get("location");
  const isRedirectedCN = resCN?.status === 307 || resCN?.status === 308 || resCN?.status === 302;
  
  console.log(`测试 2: 拦截中国 (CN) 网页请求 ➔ ${isRedirectedCN && locationCN?.includes("/blocked") ? "通过 ✅" : "放行 ❌"}`);
  if (!isRedirectedCN || !locationCN?.includes("/blocked")) {
    throw new Error(`测试失败: 未能成功拦截网页请求并重定向！响应状态: ${resCN?.status}, 重定向地: ${locationCN}`);
  }

  // 3. 测试受限地区开发 Query 参数模拟 (?country=KP)
  const reqMockKP = new NextRequest(new URL("http://localhost:3000/matches?country=KP"));
  const resMockKP = middleware(reqMockKP);
  const locationKP = resMockKP?.headers.get("location");
  
  console.log(`测试 3: 开发环境 Query 模拟拦截 (KP) ➔ ${locationKP?.includes("/blocked?region=KP") ? "通过 ✅" : "放行 ❌"}`);
  if (!locationKP?.includes("/blocked?region=KP")) {
    throw new Error("测试失败: 开发环境 Query 参数模拟拦截失效！");
  }

  // 4. 测试被限制地区访问 API 接口 (例如 CN 请求 /api/fixtures)
  const reqApi = new NextRequest(new URL("http://localhost:3000/api/fixtures"), {
    headers: {
      "x-vercel-ip-country": "CN",
    },
  });

  const resApi = middleware(reqApi);
  const is403 = resApi?.status === 403;
  console.log(`测试 4: 拦截受限区 API 请求并返回 403 ➔ ${is403 ? "通过 ✅" : "放行 ❌"}`);
  if (!is403) {
    throw new Error(`测试失败: API 被拦截后未返回 403 状态！实际状态: ${resApi?.status}`);
  }

  // 5. 验证静态资源免控
  const reqStatic = new NextRequest(new URL("http://localhost:3000/_next/static/chunks/main.js"), {
    headers: {
      "x-vercel-ip-country": "CN",
    },
  });

  const resStatic = middleware(reqStatic);
  const isRedirectedStatic = resStatic?.headers.get("location") !== null;
  console.log(`测试 5: 静态资源免控通过验证 ➔ ${!isRedirectedStatic ? "通过 ✅" : "拦截 ❌"}`);
  if (isRedirectedStatic) {
    throw new Error("测试失败: 错误拦截了静态资源，这会导致页面加载死循环！");
  }

  console.log("\n🎉 地理拦截中间件所有核心路由场景测试通过！");
}

runTests().catch((e) => {
  console.error("❌ 中间件测试出错：", e);
  process.exit(1);
});
