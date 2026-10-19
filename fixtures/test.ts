import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

type PageFixtures = {
  homePage: HomePage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect };
