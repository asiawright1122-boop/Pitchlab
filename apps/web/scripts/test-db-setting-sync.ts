import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("=== 正在测试 SystemSetting 晋升模型写入 ===");
  const prisma = new PrismaClient();
  try {
    const promotedModelId = "dc-raw-v0.1";
    
    // 清理先前的数据
    await prisma.systemSetting.deleteMany({
      where: { key: "active_model_version" }
    });

    // 1. 验证 upsert 写入
    const setting = await prisma.systemSetting.upsert({
      where: { key: "active_model_version" },
      create: {
        key: "active_model_version",
        value: promotedModelId
      },
      update: {
        value: promotedModelId
      }
    });

    console.log("写入成功: ", setting);
    if (setting.value !== promotedModelId) {
      throw new Error(`写入值不正确，期望: ${promotedModelId}, 实际: ${setting.value}`);
    }

    // 2. 验证读取
    const found = await prisma.systemSetting.findUnique({
      where: { key: "active_model_version" }
    });
    console.log("读取成功: ", found);
    if (!found || found.value !== promotedModelId) {
      throw new Error("读取值校验失败");
    }

    console.log("🎉 SystemSetting 数据库写入与读取测试通过！");
  } catch (error) {
    console.error("❌ 测试失败: ", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
