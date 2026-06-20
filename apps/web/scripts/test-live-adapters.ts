import { OddsApiAdapter } from "../lib/data-adapter/odds-api";
import { FootballDataOrgAdapter } from "../lib/data-adapter/football-data";
import { getDataAdapter } from "../lib/data-adapter/factory";

// 保存原始全局 fetch
const originalFetch = global.fetch;

function mockGlobalFetchForTest() {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = input.toString();

    // 拦截 The Odds API 请求
    if (urlStr.includes("api.the-odds-api.com")) {
      console.log(`[MockFetch] 拦截 The Odds API 请求: ${urlStr}`);
      return {
        ok: true,
        json: async () => [
          {
            id: "epl_test_event_1",
            sport_key: "soccer_epl",
            commence_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            home_team: "Manchester United",
            away_team: "Arsenal",
            bookmakers: [
              {
                key: "pinnacle",
                last_update: new Date().toISOString(),
                markets: [
                  {
                    key: "h2h",
                    outcomes: [
                      { name: "Manchester United", price: 2.40 },
                      { name: "Arsenal", price: 2.90 },
                      { name: "Draw", price: 3.30 }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "wc_test_event_1",
            sport_key: "soccer_fifa_world_cup",
            commence_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            home_team: "Brazil",
            away_team: "Germany",
            bookmakers: [
              {
                key: "pinnacle",
                last_update: new Date().toISOString(),
                markets: [
                  {
                    key: "h2h",
                    outcomes: [
                      { name: "Brazil", price: 2.10 },
                      { name: "Germany", price: 3.20 },
                      { name: "Draw", price: 3.40 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      } as Response;
    }

    // 拦截 football-data.org 请求
    if (urlStr.includes("api.football-data.org")) {
      console.log(`[MockFetch] 拦截 football-data.org 请求: ${urlStr}`);
      return {
        ok: true,
        json: async () => ({
          matches: [
            {
              id: 999123,
              status: "FINISHED",
              score: {
                fullTime: { home: 3, away: 2 }
              }
            }
          ]
        })
      } as Response;
    }

    return { ok: false, text: async () => "not found" } as Response;
  }) as typeof fetch;
}

function restoreGlobalFetch() {
  global.fetch = originalFetch;
}

async function runTests() {
  console.log("=== 正在运行 PitchLab 实时数据适配器测试 ===");

  const hasOddsKey = !!process.env.THE_ODDS_API_KEY;
  const hasFbToken = !!process.env.FOOTBALL_DATA_TOKEN;

  if (!hasOddsKey || !hasFbToken) {
    console.log("提示: 检测到未完整配置真实 API Token，将自动进入拦截仿真单元测试模式。");
    mockGlobalFetchForTest();
  } else {
    console.log("提示: 检测到已配置真实 API Token，将进行真实网络请求联调测试！");
  }

  try {
    // 1. 验证 OddsApiAdapter
    console.log("\n--- 测试 1: OddsApiAdapter 赛程拉取 ---");
    if (!process.env.THE_ODDS_API_KEY) {
      process.env.THE_ODDS_API_KEY = "test_odds_key";
    }
    const oddsAdapter = new OddsApiAdapter();
    const fixtures = await oddsAdapter.getUpcomingFixtures(["WC", "PL"], 48);

    console.log(`成功获取赛程数: ${fixtures.length}`);
    if (fixtures.length > 0) {
      const f = fixtures[0];
      console.log(`- 赛事 ID: ${f.id}`);
      console.log(`- 对阵: ${f.home} vs ${f.away} (${f.league})`);
      console.log(`- 开赛时间: ${f.kickoffUtc}`);
      console.log(`- 赔率: 主胜(${f.odds?.home}) / 平局(${f.odds?.draw}) / 客胜(${f.odds?.away})`);

      const hasWc = fixtures.some(x => x.league === "WC");
      console.log(`包含世界杯(WC)赛程: ${hasWc ? "是" : "否"}`);

      if (!hasWc && !hasOddsKey) {
        throw new Error("测试失败: 未能在 Mock 模式下拉取到世界杯(WC)赛程！");
      }
    } else {
      if (!hasOddsKey) {
        throw new Error("测试失败: 未能在 Mock 模式下拉取到赛程！");
      }
    }

    // 2. 验证 FootballDataOrgAdapter
    console.log("\n--- 测试 2: FootballDataOrgAdapter 比分拉取 ---");
    if (!process.env.FOOTBALL_DATA_TOKEN) {
      process.env.FOOTBALL_DATA_TOKEN = "test_fb_token";
    }
    const fbAdapter = new FootballDataOrgAdapter();
    const results = await fbAdapter.getFixtureResults(["PL"], new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());

    console.log(`成功获取赛果数: ${results.length}`);
    if (results.length > 0) {
      const r = results[0];
      console.log(`- 赛事 ID: ${r.id}`);
      console.log(`- 比分: ${r.homeGoals} - ${r.awayGoals}`);
      console.log(`- 状态: ${r.status}`);
      if (r.id !== "999123" && !hasFbToken) {
        throw new Error("测试失败: FootballDataOrgAdapter 数据转换内容不正确！");
      }
    } else {
      if (!hasFbToken) {
        throw new Error("测试失败: 未能在 Mock 模式下拉取到比分！");
      }
    }

    // 3. 验证 factory 工厂
    console.log("\n--- 测试 3: DataAdapterFactory 工厂验证 ---");
    process.env.DATA_SOURCE_TYPE = "live";
    const factoryAdapter = getDataAdapter();
    
    if (typeof factoryAdapter.getUpcomingFixtures !== "function" || typeof factoryAdapter.getFixtureResults !== "function") {
      throw new Error("测试失败: 工厂返回的 LiveAdapter 缺失核心适配方法！");
    }
    console.log("LiveAdapter 工厂实例验证通过！");

    console.log("\n🎉 所有实时数据源适配层测试通过！");
  } finally {
    restoreGlobalFetch();
  }
}

runTests().catch((e) => {
  console.error("❌ 测试运行中捕获到异常：", e);
  process.exit(1);
});
