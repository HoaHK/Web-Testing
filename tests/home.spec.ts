import { test, expect } from '../fixtures/test';

test('homepage displays its Learn more link', async ({ homePage }) => {
  await homePage.goto();
  await expect(homePage.learnMoreLink).toBeVisible();
});
