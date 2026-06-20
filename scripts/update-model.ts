import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Updating NVIDIA Model Configuration ===");

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "AI_CONFIG" }
  });

  if (!setting || !setting.value) {
    console.error("❌ No AI_CONFIG found in database.");
    return;
  }

  const config = setting.value as any;
  const oldModel = config.modelName;
  const newModel = "meta/llama-3.3-70b-instruct";

  // 更新数据库
  config.modelName = newModel;
  await prisma.systemSetting.update({
    where: { key: "AI_CONFIG" },
    data: { value: config }
  });

  console.log(`✓ Model updated in DB: "${oldModel}" -> "${newModel}"`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
