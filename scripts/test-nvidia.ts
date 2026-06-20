import { PrismaClient } from "@prisma/client";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function runCurl(baseURL: string, apiKey: string, modelName: string, prompt: string) {
  const url = `${baseURL.replace(/\/$/, "")}/chat/completions`;
  const postData = JSON.stringify({
    model: modelName,
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 15
  });

  // 借助系统 curl 以便重用系统/命令行代理
  const cmd = `curl -s -i -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" -d '${postData.replace(/'/g, "'\\''")}' "${url}"`;
  
  try {
    const { stdout } = await execAsync(cmd);
    return stdout;
  } catch (err: any) {
    return `Curl Execution Error: ${err.message}`;
  }
}

async function main() {
  console.log("=== Testing NVIDIA AI_CONFIG Database Connection via cURL ===");

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "AI_CONFIG" }
  });

  if (!setting || !setting.value) {
    console.error("❌ No AI_CONFIG found in database.");
    return;
  }

  const config = setting.value as any;
  const baseURL = config.baseURL || "https://integrate.api.nvidia.com/v1";
  const apiKey = config.apiKey;
  const userModel = config.modelName;

  console.log("✓ Read DB config successfully.");
  console.log(`- Provider: ${config.provider}`);
  console.log(`- Base URL: ${baseURL}`);
  console.log(`- Configured Model: ${userModel}`);

  // 1. 测试用户配置的模型
  console.log(`\n[Test 1] Testing user-configured model "${userModel}"...`);
  const out1 = await runCurl(baseURL, apiKey, userModel, "Say SUCCESS and nothing else.");
  console.log("Response headers & body:\n" + out1);

  // 2. 测试备用活跃模型 nvidia/llama-3.1-nemotron-70b-instruct
  const fallbackModel = "nvidia/llama-3.1-nemotron-70b-instruct";
  console.log(`\n[Test 2] Testing fallback model "${fallbackModel}"...`);
  const out2 = await runCurl(baseURL, apiKey, fallbackModel, "Say SUCCESS and nothing else.");
  console.log("Response headers & body:\n" + out2);

  // 3. 测试 meta/llama-3.3-70b-instruct
  const model3 = "meta/llama-3.3-70b-instruct";
  console.log(`\n[Test 3] Testing model "${model3}"...`);
  const out3 = await runCurl(baseURL, apiKey, model3, "Say SUCCESS and nothing else.");
  console.log("Response headers & body:\n" + out3);

  // 4. 测试 microsoft/phi-3.5-moe-instruct
  const model4 = "microsoft/phi-3.5-moe-instruct";
  console.log(`\n[Test 4] Testing model "${model4}"...`);
  const out4 = await runCurl(baseURL, apiKey, model4, "Say SUCCESS and nothing else.");
  console.log("Response headers & body:\n" + out4);

  // 5. 测试 meta/llama2-70b
  const model5 = "meta/llama2-70b";
  console.log(`\n[Test 5] Testing model "${model5}"...`);
  const out5 = await runCurl(baseURL, apiKey, model5, "Say SUCCESS and nothing else.");
  console.log("Response headers & body:\n" + out5);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
