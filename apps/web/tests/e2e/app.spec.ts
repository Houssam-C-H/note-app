import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    // Should end up on login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toHaveText('Welcome Back');
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('h1')).toHaveText('Create Account');
  });

  // A full registration and login test would typically require a clean test DB setup
  // or a mock API response in E2E tests.
  test('should show validation errors on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Expect error message
    await expect(page.locator('div[class*="error"]')).toBeVisible({ timeout: 10000 });
  });
});

