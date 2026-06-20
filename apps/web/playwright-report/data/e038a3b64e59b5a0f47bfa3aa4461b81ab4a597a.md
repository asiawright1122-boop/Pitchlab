# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Quant Edge Frontend E2E Tests >> Admin dashboard - renders KPI indicators and growth chart
- Location: e2e/app.spec.ts:78:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').filter({ hasText: '系统大盘数据' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1').filter({ hasText: '系统大盘数据' })

```

```yaml
- banner:
  - link "PitchLab | 2026":
    - /url: /
  - navigation:
    - text: 赛程
    - img
    - text: 赔率
    - img
    - text: 积分榜
    - img
    - text: 关于世界杯
    - img
    - text: 新闻
    - img
    - button:
      - img
  - link "注册 / 登录":
    - /url: /login
- main:
  - heading "404" [level=1]
  - heading "This page could not be found." [level=2]
- contentinfo:
  - paragraph: PitchLab Quant Edge · World Cup 2026 Demo
  - paragraph: 纯视觉静态演示页面，未接入后端数据
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Quant Edge Frontend E2E Tests', () => {
  4  | 
  5  |   test.beforeEach(async ({ context }) => {
  6  |     // Inject age verification into localStorage and mock Telegram WebApp SDK
  7  |     await context.addInitScript(() => {
  8  |       window.localStorage.setItem('quant-edge-age-confirmed', '1');
  9  |       (window as any).Telegram = {
  10 |         WebApp: {
  11 |           initData: "mock_dev_init_data",
  12 |           openInvoice: (url: string, callback: (status: string) => void) => callback('paid'),
  13 |           HapticFeedback: { notificationOccurred: () => {} }
  14 |         }
  15 |       };
  16 |     });
  17 |   });
  18 | 
  19 |   test('TMA Play page - loads mock wallet, renders matches, and places a paper bet', async ({ page }) => {
  20 |     // Set up console logging from browser to Node process
  21 |     page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  22 | 
  23 |     // Visit TMA play app (auth bypass is automatic in dev mode)
  24 |     await page.goto('/play');
  25 | 
  26 |     // 1. Verify header wallet balance displays mock account research units
  27 |     const walletText = page.locator('header');
  28 |     await expect(walletText).toContainText(/RU/);
  29 | 
  30 |     // 2. Verify match list matches are rendered
  31 |     // Locate the first match card
  32 |     const matchCard = page.locator('.card').first();
  33 |     await expect(matchCard).toBeVisible();
  34 | 
  35 |     // Verify team names (VS element is present)
  36 |     await expect(matchCard).toContainText('VS');
  37 | 
  38 |     // 3. Place a paper bet using the inline options
  39 |     // Find the home odds button (contains a span with text '1')
  40 |     const homeBetButton = matchCard.locator('button').filter({ has: page.locator('span', { hasText: /^1$/ }) }).first();
  41 |     
  42 |     // Toggle bet selection
  43 |     await homeBetButton.click();
  44 | 
  45 |     // Stake input and Place Bet button should become visible
  46 |     const stakeInput = matchCard.locator('input[type="number"]');
  47 |     await expect(stakeInput).toBeVisible();
  48 | 
  49 |     // Type stake amount
  50 |     await stakeInput.fill('200');
  51 | 
  52 |     // Click "Place Bet"
  53 |     const placeBetBtn = matchCard.locator('button', { hasText: 'Place Bet' });
  54 |     await expect(placeBetBtn).toBeVisible();
  55 |     await placeBetBtn.click();
  56 | 
  57 |     // 4. Verify inline toast feedback triggers success
  58 |     const inlineToast = matchCard.locator('div', { hasText: 'Bet placed' }).or(matchCard.locator('div', { hasText: 'Failed' })).or(matchCard.locator('div', { hasText: '✓' }));
  59 |     await expect(inlineToast).toBeVisible({ timeout: 5000 });
  60 |   });
  61 | 
  62 |   test('Public Record page - renders benchmark appendix and league CLV charts', async ({ page }) => {
  63 |     await page.goto('/record');
  64 | 
  65 |     // Verify headers and key explanations
  66 |     const heading = page.locator('h1');
  67 |     await expect(heading).toContainText('Benchmark backtest');
  68 |     
  69 |     // Verify cross-league CLV snapshot bar charts are rendered
  70 |     const clvSection = page.locator('div', { hasText: 'Cross-league CLV snapshot' }).first();
  71 |     await expect(clvSection).toBeVisible();
  72 | 
  73 |     // Verify the legend is present
  74 |     await expect(clvSection).toContainText('Edge ≥ +2%');
  75 |     await expect(clvSection).toContainText('Negative CLV');
  76 |   });
  77 | 
  78 |   test('Admin dashboard - renders KPI indicators and growth chart', async ({ page }) => {
  79 |     await page.goto('/admin');
  80 | 
  81 |     // Verify critical dashboard modules are loaded
> 82 |     await expect(page.locator('h1', { hasText: '系统大盘数据' })).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  83 |     
  84 |     // Verify growth charts are rendering Recharts components
  85 |     await expect(page.locator('h3', { hasText: '系统增长与交易动态' })).toBeVisible();
  86 |     
  87 |     // Verify action buttons exist
  88 |     await expect(page.locator('button', { hasText: '强制同步 API 数据' })).toBeVisible();
  89 |   });
  90 | });
  91 | 
```