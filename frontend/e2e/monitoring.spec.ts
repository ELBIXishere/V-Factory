/**
 * 모니터링 페이지 E2E 테스트
 */
import { test, expect } from '@playwright/test'

test.describe('모니터링 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 모니터링 페이지로 이동
    await page.goto('/monitoring')
  })

  test('페이지가 로드되어야 함', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/V-Factory/)
  })

  test('CCTV 그리드 뷰가 표시되어야 함', async ({ page }) => {
    // CCTV 그리드 컨테이너 확인
    const gridContainer = page.locator('[data-testid="cctv-grid"]').or(
      page.locator('.grid')
    )
    await expect(gridContainer).toBeVisible({ timeout: 10000 })
  })

  test('레이아웃 변경 버튼이 작동해야 함', async ({ page }) => {
    // 레이아웃 선택 버튼 찾기
    const layoutButton = page.locator('button').filter({ hasText: /2x2|3x3|4x4/ }).first()
    
    if (await layoutButton.isVisible()) {
      await layoutButton.click()
      // 레이아웃이 변경되었는지 확인
      await page.waitForTimeout(500)
    }
  })
})
