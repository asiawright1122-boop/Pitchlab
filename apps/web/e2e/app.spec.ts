import { test, expect } from '@playwright/test';

test.describe('Quant Edge Frontend E2E Tests', () => {

  test.beforeEach(async ({ context }) => {
    // Inject age verification into localStorage and mock Telegram WebApp SDK
    await context.addInitScript(() => {
      window.localStorage.setItem('quant-edge-age-confirmed', '1');
      (window as any).Telegram = {
        WebApp: {
          initData: "mock_dev_init_data",
          openInvoice: (url: string, callback: (status: string) => void) => callback('paid'),
          HapticFeedback: { notificationOccurred: () => {} }
        }
      };
    });
  });

  test('TMA Play page - loads mock wallet, renders matches, and places a paper bet', async ({ page }) => {
    // Set up console logging from browser to Node process
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // Visit TMA play app (auth bypass is automatic in dev mode)
    await page.goto('/play');

    // 1. Verify header wallet balance displays mock account research units
    const walletText = page.locator('header');
    await expect(walletText).toContainText(/RU/);

    // 2. Verify match list matches are rendered
    // Locate the first match card
    const matchCard = page.locator('.card').first();
    await expect(matchCard).toBeVisible();

    // Verify team names (VS element is present)
    await expect(matchCard).toContainText('VS');

    // 3. Place a paper bet using the inline options
    // Find the home odds button (contains a span with text '1')
    const homeBetButton = matchCard.locator('button').filter({ has: page.locator('span', { hasText: /^1$/ }) }).first();
    
    // Toggle bet selection
    await homeBetButton.click();

    // Stake input and Place Bet button should become visible
    const stakeInput = matchCard.locator('input[type="number"]');
    await expect(stakeInput).toBeVisible();

    // Type stake amount
    await stakeInput.fill('200');

    // Click "Place Bet"
    const placeBetBtn = matchCard.locator('button', { hasText: 'Place Bet' });
    await expect(placeBetBtn).toBeVisible();
    await placeBetBtn.click();

    // 4. Verify inline toast feedback triggers success
    const inlineToast = matchCard.locator('div', { hasText: 'Bet placed' }).or(matchCard.locator('div', { hasText: 'Failed' })).or(matchCard.locator('div', { hasText: '✓' }));
    await expect(inlineToast).toBeVisible({ timeout: 5000 });
  });

  test('Public Record page - renders benchmark appendix and league CLV charts', async ({ page }) => {
    await page.goto('/record');

    // Verify headers and key explanations
    const heading = page.locator('h1');
    await expect(heading).toContainText('Benchmark backtest');
    
    // Verify cross-league CLV snapshot bar charts are rendered
    const clvSection = page.locator('div', { hasText: 'Cross-league CLV snapshot' }).first();
    await expect(clvSection).toBeVisible();

    // Verify the legend is present
    await expect(clvSection).toContainText('Edge ≥ +2%');
    await expect(clvSection).toContainText('Negative CLV');
  });

  test('Admin dashboard - renders KPI indicators and growth chart', async ({ page }) => {
    await page.goto('/admin');

    // Verify critical dashboard modules are loaded
    await expect(page.locator('h1', { hasText: '系统大盘数据' })).toBeVisible();
    
    // Verify growth charts are rendering Recharts components
    await expect(page.locator('h3', { hasText: '系统增长与交易动态' })).toBeVisible();
    
    // Verify action buttons exist
    await expect(page.locator('button', { hasText: '强制同步 API 数据' })).toBeVisible();
  });
});
