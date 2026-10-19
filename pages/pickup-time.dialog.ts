import type { Locator, Page } from '@playwright/test';

/** WEB-V02 */
export class PickupTimeDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly date: Locator;
  readonly openCalendar: Locator;
  readonly calendar: Locator;
  readonly calendarToday: Locator;
  readonly time: Locator;
  readonly timeOptions: Locator;
  readonly confirm: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog').filter({ hasText: 'Choose a pickup time' });
    this.heading = this.root.getByRole('heading', { name: 'Choose a pickup time' });
    this.date = this.root.getByLabel('Select a Pickup Date');
    this.openCalendar = this.root.getByRole('button', { name: 'Open calendar' });
    this.calendar = page.locator('mat-datepicker-content');
    this.calendarToday = this.calendar.locator('[aria-current="date"]');
    this.time = this.root.getByRole('combobox');
    this.timeOptions = page.getByRole('option');
    this.confirm = this.root.getByRole('button', { name: /^Pickup .* at / });
  }
}
