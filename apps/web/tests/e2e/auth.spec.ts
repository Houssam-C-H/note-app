import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Check if redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });
});
