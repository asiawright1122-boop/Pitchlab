import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("正在尝试通过 Prisma 建立与 Supabase 的连接...");
  console.log("当前 DATABASE_URL:", process.env.DATABASE_URL);

  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

  try {
    const fCount = await prisma.fixture.count();
    const pCount = await prisma.prediction.count();
    console.log(`🎉 数据库当前状态：Fixtures 数量 = ${fCount}, Predictions 数量 = ${pCount}`);
  } catch (err: any) {
    console.error("❌ 连接失败。详细错误信息如下：");
    console.error("错误名称:", err.name);
    console.error("错误消息:", err.message);
    console.error("错误代码:", err.code);
    console.error("详细堆栈:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
