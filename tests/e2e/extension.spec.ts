import { test as base, chromium, expect, type BrowserContext } from '@playwright/test'
import { resolve } from 'node:path'

const test = base.extend<{ extensionContext: BrowserContext; extensionId: string }>({
  extensionContext: async ({}, use) => {
    const extensionPath = resolve('dist')
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', headless: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
      viewport: { width: 380, height: 560 },
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ extensionContext }, use) => {
    const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent('serviceworker')
    await use(new URL(worker.url()).host)
  },
  page: async ({ extensionContext, extensionId }, use) => {
    const page = await extensionContext.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
    await use(page)
    await page.close().catch(() => {})
  },
})

test('统一输入正确转换 ISO，并拒绝非法日期', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await page.getByLabel('粘贴时间戳或日期时间').fill('2026-11-12T10:00:00+08:00')
  await expect(page.locator('[data-result="millis"] dd')).toHaveText('1794448800000')
  await expect(page.locator('[data-result="iso"] dd')).toHaveText('2026-11-12T02:00:00.000Z')
  await page.getByLabel('粘贴时间戳或日期时间').fill('2026-02-30 12:00:00')
  await expect(page.getByRole('alert')).toContainText('无法解析')
  await expect(page.locator('.conversion-results')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('显式毫秒和常用格式在切换标签页后仍可用', async ({ page }) => {
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await page.getByLabel('数字单位').selectOption('ms')
  await page.getByLabel('粘贴时间戳或日期时间').fill('1000')
  await expect(page.locator('[data-result="iso"] dd')).toHaveText('1970-01-01T00:00:01.000Z')
  await page.getByLabel('常用格式').fill('YYYY/MM/DD HH:mm')
  await page.getByRole('tab', { name: '世界时钟', exact: true }).click()
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await expect(page.getByLabel('常用格式')).toHaveValue('YYYY/MM/DD HH:mm')
  await expect.poll(() => page.evaluate(async () => (await chrome.storage.sync.get('defaultFormat')).defaultFormat)).toBe('YYYY/MM/DD HH:mm')
})

test('切换标签后添加 UTC 可以持久化并跨页面同步', async ({ page, extensionContext, extensionId }) => {
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await page.getByRole('tab', { name: '世界时钟', exact: true }).click()
  const other = await extensionContext.newPage()
  await other.goto(`chrome-extension://${extensionId}/src/standalone/index.html`)
  await page.getByRole('button', { name: '添加时区', exact: false }).click()
  await page.locator('[data-timezone="UTC"]').click()
  await expect.poll(() => page.evaluate(async () => (await chrome.storage.sync.get('selectedTimezones')).selectedTimezones?.includes('UTC'))).toBe(true)
  await expect(other.locator('.wc-city').filter({ hasText: /^UTC$/ })).toBeVisible()
  await page.reload()
  await expect(page.locator('.wc-city').filter({ hasText: /^UTC$/ })).toBeVisible()
})

test('暂停只影响当前时间戳，世界时钟继续推进', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T00:00:30Z') })
  await page.reload()
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const frozen = await page.locator('.num').first().textContent()
  await page.clock.fastForward(65_000)
  await expect(page.locator('.num').first()).toHaveText(frozen!)
  await page.getByRole('tab', { name: '世界时钟', exact: true }).click()
  await expect(page.locator('.wc-row').filter({ hasText: '上海' }).locator('.wc-clock')).toHaveText('08:01')
})

test('指定时间联动时钟并正确显示跨日', async ({ page }) => {
  await page.getByRole('button', { name: '规划时间', exact: true }).click()
  await page.getByLabel('规划日期', { exact: true }).fill('2026-11-12')
  await page.getByLabel('规划时间', { exact: true }).fill('08:00')
  const ny = page.locator('.wc-row').filter({ hasText: '纽约' })
  await expect(ny.locator('.wc-date')).toHaveText('2026-11-11')
  await expect(ny.locator('.wc-clock')).toHaveText('19:00')
  await expect(ny.locator('.wc-sub')).toContainText('昨天')
  await expect(page.getByText('所选参考日没有共同工作时段。')).toBeVisible()
  await page.getByRole('button', { name: '恢复实时', exact: true }).click()
  await expect(page.getByLabel('规划日期', { exact: true })).toHaveCount(0)
})

test('规划处理 DST 缺口和两次出现的当地时间', async ({ page }) => {
  await page.getByRole('button', { name: '规划时间', exact: true }).click()
  await page.locator('.planner .tz-trigger').click()
  await page.locator('.planner .tz-search').fill('America/New_York')
  await page.locator('[data-timezone="America/New_York"]').click()
  await page.getByLabel('规划日期', { exact: true }).fill('2026-03-08')
  await page.getByLabel('规划时间', { exact: true }).fill('02:30')
  await expect(page.getByRole('alert')).toContainText('跳过')
  await expect(page.locator('.wc-row')).toHaveCount(0)
  await page.getByLabel('规划日期', { exact: true }).fill('2026-11-01')
  await page.getByLabel('规划时间', { exact: true }).fill('01:30')
  await expect(page.getByLabel('选择重复时间').locator('option')).toHaveCount(2)
  await page.getByLabel('选择重复时间').selectOption('1')
  await expect(page.locator('.wc-row').filter({ hasText: '上海' }).locator('.wc-clock')).toHaveText('14:30')
})

test('独立入口中英文显示且无运行错误', async ({ page, extensionId }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(`chrome-extension://${extensionId}/src/standalone/index.html`)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByLabel('English', { exact: true }).check()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('tab', { name: 'Timestamp', exact: true }).click()
  await expect(page.getByText('Time converter', { exact: true })).toBeVisible()
  await page.getByLabel('Paste a timestamp or date').fill('2026-11-12T02:00:00Z')
  await expect(page.locator('[data-result="iso"] dd')).toContainText('2026-11-12T02:00:00.000Z')
  expect(errors).toEqual([])
})

test('规划滑块与可调整工作时段一致', async ({ page }) => {
  await page.evaluate(() => chrome.storage.sync.set({ selectedTimezones: ['Asia/Shanghai', 'Asia/Tokyo'] }))
  await page.reload()
  await page.getByRole('button', { name: '规划时间', exact: true }).click()
  await page.getByLabel('规划日期', { exact: true }).fill('2026-11-12')
  await expect(page.locator('.overlap li')).toHaveText('09:00 +08:00 – 17:00 +08:00')
  await page.getByLabel('按15分钟调整时间').focus()
  await page.getByLabel('按15分钟调整时间').press('Home')
  await page.getByLabel('按15分钟调整时间').press('ArrowRight')
  await expect(page.getByLabel('规划时间', { exact: true })).toHaveValue('00:15')
  await expect(page.locator('.wc-row').filter({ hasText: '东京' }).locator('.wc-clock')).toHaveText('01:15')
  await page.getByLabel('工作开始时间', { exact: true }).selectOption('18')
  await page.getByLabel('工作结束时间', { exact: true }).selectOption('9')
  await expect(page.locator('.overlap')).toContainText('工作开始时间必须早于结束时间')
  await expect(page.locator('.wc-row')).toHaveCount(0)
})

test('负毫秒输出正确且点击复制成功', async ({ page, extensionContext }) => {
  await extensionContext.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('tab', { name: '时间戳', exact: true }).click()
  await page.getByLabel('数字单位').selectOption('ms')
  await page.getByLabel('粘贴时间戳或日期时间').fill('-1')
  await page.getByLabel('常用格式').fill('YYYY-MM-DD HH:mm:ss.SSS Z')
  await expect(page.locator('[data-result="utc"] dd')).toHaveText('1969-12-31 23:59:59.999 +00:00')
  await expect(page.locator('[data-result="target"] dd')).toHaveText('1970-01-01 07:59:59.999 +08:00')
  await page.locator('[data-result="millis"] button').click()
  await expect(page.locator('[data-result="millis"] button')).toHaveAttribute('aria-label', '已复制')
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('-1')
})

test('工具栏入口通过后台打开独立窗口', async ({ page, extensionContext }) => {
  const opened = extensionContext.waitForEvent('page')
  await page.getByRole('button', { name: '弹出独立窗口', exact: true }).click()
  const standalone = await opened
  await expect(standalone).toHaveURL(/\/src\/standalone\/index.html$/)
  await expect(standalone.getByRole('button', { name: '规划时间', exact: true })).toBeVisible()
})
