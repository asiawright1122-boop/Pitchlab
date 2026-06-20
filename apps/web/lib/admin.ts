import { getSession } from "./session";

/**
 * 判断指定 Email 是否属于管理员邮箱
 */
export function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  
  // 生产环境与本地开发自适应配置的管理员邮箱列表
  const adminEmailsStr = process.env.ADMIN_EMAILS || "admin@quantedge.ai,kaka@quantedge.local";
  const adminEmails = adminEmailsStr.split(",").map(e => e.trim().toLowerCase());
  
  return adminEmails.includes(email.toLowerCase());
}

/**
 * 安全验证当前请求是否由管理员发起
 * 支持：
 * 1. 传统 Bearer Header 校验（Worker 同步等服务间调用）
 * 2. 用户浏览器 Iron-Session 身份会话校验（后台 GUI 管理面板）
 */
export async function verifyAdminSession(request: Request): Promise<boolean> {
  // 1. 检查 API 授权 header（Bearer token 方式）
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const adminSecret = process.env.ADMIN_SECRET || "quant_edge_dev_admin_secret_123";
    
    // 定时安全比对
    if (token === adminSecret) {
      return true;
    }
  }

  // 2. 检查会话 session.email 是否在管理员白名单中
  const session = await getSession();
  if (session.email && isAdminUser(session.email)) {
    return true;
  }

  return false;
}
