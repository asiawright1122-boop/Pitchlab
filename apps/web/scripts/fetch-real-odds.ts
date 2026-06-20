/**
 * 1. 清理模拟赔率数据
 * 2. 尝试从 API-Football 拉取真实世界杯赔率
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = "482d492d8fabe6f52c434844ecb4387d";
const BASE = "https://v3.football.api-sports.io";

async function cleanFakeOdds() {
  // 删除 book 为模拟来源的赔率
  const deleted = await prisma.oddsSnapshot.deleteMany({
    where: {
      book: { in: ["dixon-coles", "pitchlab-elo"] },
    },
  });
  console.log(`已清理 ${deleted.count} 条模拟赔率数据`);
}

async function tryFetchOdds() {
  // 尝试1: 直接按 league=1 (World Cup) 获取 fixtures
  console.log("\n--- 尝试1: 获取 World Cup (league=1) fixtures ---");
  try {
    const res = await fetch(`${BASE}/fixtures?league=1&season=2026&next=10`, {
      headers: { "x-apisports-key": API_KEY },
    });
    const json = await res.json();
    console.log("Status:", res.status);
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.log("Errors:", JSON.stringify(json.errors));
    } else {
      console.log("Results:", json.results);
      if (json.response?.length > 0) {
        console.log("First fixture:", JSON.stringify(json.response[0].fixture, null, 2));
      }
    }
  } catch (e: any) {
    console.log("Failed:", e.message);
  }

  // 尝试2: 按日期获取所有比赛，然后过滤世界杯
  console.log("\n--- 尝试2: 按日期获取今天的 fixtures ---");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(`${BASE}/fixtures?date=${today}`, {
      headers: { "x-apisports-key": API_KEY },
    });
    const json = await res.json();
    console.log("Status:", res.status);
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.log("Errors:", JSON.stringify(json.errors));
    } else {
      console.log("Total fixtures today:", json.results);
      // Filter for World Cup
      const wc = json.response?.filter((f: any) => 
        f.league?.name?.includes("World Cup") || f.league?.id === 1
      );
      console.log("World Cup fixtures today:", wc?.length || 0);
      if (wc?.length > 0) {
        wc.slice(0, 3).forEach((f: any) => {
          console.log(`  ${f.teams.home.name} vs ${f.teams.away.name} | ${f.fixture.date} | league: ${f.league.name}`);
        });
      }
    }
  } catch (e: any) {
    console.log("Failed:", e.message);
  }

  // 尝试3: 按日期获取赔率
  console.log("\n--- 尝试3: 按日期获取今天的 odds ---");
  try {
    const res = await fetch(`${BASE}/odds?date=${today}&league=1&season=2026`, {
      headers: { "x-apisports-key": API_KEY },
    });
    const json = await res.json();
    console.log("Status:", res.status);
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.log("Errors:", JSON.stringify(json.errors));
    } else {
      console.log("Odds results:", json.results);
    }
  } catch (e: any) {
    console.log("Failed:", e.message);
  }

  // 尝试4: 获取 API 配额信息
  console.log("\n--- API 配额状态 ---");
  try {
    const res = await fetch(`${BASE}/status`, {
      headers: { "x-apisports-key": API_KEY },
    });
    const json = await res.json();
    const sub = json.response?.subscription;
    const req = json.response?.requests;
    console.log("Plan:", sub?.plan);
    console.log("End:", sub?.end);
    console.log("Requests today:", req?.current, "/", req?.limit_day);
  } catch (e: any) {
    console.log("Failed:", e.message);
  }
}

async function main() {
  await cleanFakeOdds();
  await tryFetchOdds();
  await prisma.$disconnect();
}

main();
