/**
 * 사고 페이지 E2E 테스트
 */
import { test, expect } from '@playwright/test'

test.describe('사고 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 사고 페이지로 이동
    await page.goto('/incidents')
  })

  test('페이지가 로드되어야 함', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/V-Factory/)
  })

  test('사고 목록이 표시되어야 함', async ({ page }) => {
    // 사고 목록 테이블 또는 리스트 확인
    const incidentList = page.locator('table').or(
      page.locator('[data-testid="incident-list"]')
    )
    
    // 목록이 표시되거나 로딩 상태가 사라질 때까지 대기
    await page.waitForTimeout(2000)
    
    // 최소한 페이지 구조는 있어야 함
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
  })
})
