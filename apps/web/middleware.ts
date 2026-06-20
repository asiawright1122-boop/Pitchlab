import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const path = nextUrl.pathname;
  
  // 1. 免控路径：过滤静态资源、图片、机器人文件、及被屏蔽页面本身，避免无限循环重定向
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api/health") ||
    path === "/blocked" ||
    path.includes(".") // favicon.ico, sitemap.xml, robots.txt 等
  ) {
    return NextResponse.next();
  }

  // 2. 获取被屏蔽国家列表 (默认规避合规高风险区域：中国大陆 CN，朝鲜 KP)
  const blockedStr = process.env.BLOCKED_COUNTRIES || "CN,KP";
  const blockedCountries = blockedStr.split(",").map((c) => c.trim().toUpperCase());

  // 3. 提取地理头部国家代码
  // Vercel 生产环境提供: x-vercel-ip-country
  // Cloudflare CDN 提供: cf-ipcountry
  let country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "";
  
  // 开发测试环境下，支持通过 URL Query (?country=CN) 来强行模拟国家定位
  if (process.env.NODE_ENV === "development") {
    const mockCountry = nextUrl.searchParams.get("country");
    if (mockCountry) {
      country = mockCountry;
    }
  }

  country = country.toUpperCase();

  // 4. 执行合规地理围栏拦截
  if (blockedCountries.includes(country)) {
    // API 请求：直接返回 403 Forbidden 格式 JSON
    if (path.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ 
          error: "forbidden", 
          message: "Service unavailable in your region due to compliance restrictions." 
        }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Web 网页请求：跳转重定向至 /blocked 合规通知页
    const redirectUrl = new URL("/blocked", request.url);
    redirectUrl.searchParams.set("region", country);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态文件和网站 favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
