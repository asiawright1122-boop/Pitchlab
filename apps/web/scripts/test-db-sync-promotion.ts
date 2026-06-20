import { importLeaguePredictions } from "../../worker/src/import-predictions";
import type { PrismaClient } from "@prisma/client";

async function runTests() {
  console.log("=== 正在运行 PitchLab 数据库同步自动晋升测试 ===");

  const predictionsUpsertCalls: any[] = [];
  const fixtureUpsertCalls: any[] = [];

  // 构造 Mock Prisma 客户端
  const mockPrisma = {
    fixture: {
      upsert: async (args: any) => {
        fixtureUpsertCalls.push(args);
        return args.create;
      }
    },
    prediction: {
      findMany: async () => [],
      upsert: async (args: any) => {
        predictionsUpsertCalls.push(args);
        return args.create;
      }
    }
  } as unknown as PrismaClient;

  // 1. 模拟一个普通的（未自动晋升）的 E0 预测数据 payload
  const mockPayloadNormal = {
    league: "E0",
    predictions: [
      {
        date: "2026-06-05",
        home: "Chelsea",
        away: "Liverpool",
        home_prob: 0.45,
        draw_prob: 0.25,
        away_prob: 0.30,
        actual: null
      }
    ]
  };

  console.log("\n--- 测试 1: 未晋升场景数据库同步 ---");
  fixtureUpsertCalls.length = 0;
  predictionsUpsertCalls.length = 0;

  await importLeaguePredictions(mockPrisma, mockPayloadNormal);

  console.log(`Fixture 写入次数: ${fixtureUpsertCalls.length}`);
  console.log(`Prediction 写入次数: ${predictionsUpsertCalls.length}`);

  // 校验模型版本默认是否为 pitchlab-dc-v0.1
  predictionsUpsertCalls.forEach((call) => {
    const modelVersion = call.create.modelVersion;
    console.log(`- 写入的 modelVersion: ${modelVersion}`);
    if (modelVersion !== "pitchlab-dc-v0.1") {
      throw new Error(`测试失败: 期望 modelVersion 为 'pitchlab-dc-v0.1'，但得到 '${modelVersion}'`);
    }
    // 确保 id 包含 modelVersion 后缀
    if (!call.create.id.endsWith("pitchlab-dc-v0.1")) {
      throw new Error(`测试失败: 预测 ID '${call.create.id}' 应该以 'pitchlab-dc-v0.1' 结尾`);
    }
  });

  // 2. 模拟自动晋升场景的 E0 预测数据 payload（带 model_version: "dc-raw-v0.1"）
  const mockPayloadPromoted = {
    league: "E0",
    model_version: "dc-raw-v0.1", // 晋升模型
    predictions: [
      {
        date: "2026-06-05",
        home: "Chelsea",
        away: "Liverpool",
        home_prob: 0.40,
        draw_prob: 0.30,
        away_prob: 0.30,
        actual: null
      }
    ]
  };

  console.log("\n--- 测试 2: 自动晋升场景数据库同步 ---");
  fixtureUpsertCalls.length = 0;
  predictionsUpsertCalls.length = 0;

  await importLeaguePredictions(mockPrisma, mockPayloadPromoted as any);

  console.log(`Fixture 写入次数: ${fixtureUpsertCalls.length}`);
  console.log(`Prediction 写入次数: ${predictionsUpsertCalls.length}`);

  // 校验模型版本是否正确切换为 dc-raw-v0.1
  predictionsUpsertCalls.forEach((call) => {
    const modelVersion = call.create.modelVersion;
    console.log(`- 写入的 modelVersion: ${modelVersion}`);
    if (modelVersion !== "dc-raw-v0.1") {
      throw new Error(`测试失败: 期望 modelVersion 为 'dc-raw-v0.1'，但得到 '${modelVersion}'`);
    }
    // 确保 id 包含 modelVersion 后缀
    if (!call.create.id.endsWith("dc-raw-v0.1")) {
      throw new Error(`测试失败: 预测 ID '${call.create.id}' 应该以 'dc-raw-v0.1' 结尾`);
    }
  });

  console.log("\n🎉 所有数据库同步自动晋升测试通过！");
}

runTests().catch((e) => {
  console.error("❌ 自动晋升测试失败：", e);
  process.exit(1);
});
