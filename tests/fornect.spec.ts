import { test, expect, Page } from '@playwright/test';

async function login(page: Page): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email address').fill('test@fornect.com');
  await page.getByLabel('Password').fill('test123');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

test.beforeEach(async ({ page }) => {
  // Svaki test počinje sa čistim POC stanjem.
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('01 - auth guard blocks dashboard without login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Welcome back' })
  ).toBeVisible();
});

test('02 - login validates fields and creates session', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByText('Invalid email or password.')
  ).toBeVisible();

  await page.getByLabel('Email address').fill('test@fornect.com');
  await page.getByLabel('Password').fill('test123');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Your network is protected' })
  ).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('03 - logout clears session', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
});

test('04 - devices are listed and open correct details', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Devices' }).click();

  await expect(page).toHaveURL(/\/devices$/);

  await expect(page.getByText("Amar's iPhone")).toBeVisible();
  await expect(page.getByText('Living room TV')).toBeVisible();
  await expect(page.getByText('PlayStation 5')).toBeVisible();
  await expect(page.getByText('Unknown device')).toBeVisible();

  const tvCard = page
    .locator('.device-card')
    .filter({ hasText: 'Living room TV' });

  await tvCard.getByRole('button', { name: 'Manage' }).click();

  await expect(page).toHaveURL(/\/devices\/living-room-tv$/);

  await expect(
    page.getByRole('heading', { name: 'Living room TV', exact: true }).first()
  ).toBeVisible();

  await expect(page.getByText('Adult profile')).toBeVisible();
});

test('05 - profile change survives refresh', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone');

  await page.getByRole('button', { name: 'Change profile' }).click();
  await page.getByRole('button', { name: 'Teen', exact: true }).click();

  await expect(
    page.getByText('This device uses the Teen protection profile.')
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByText('This device uses the Teen protection profile.')
  ).toBeVisible();
});

test('06 - schedule saves and survives refresh', async ({ page }) => {
  await login(page);
  await page.goto('/devices/living-room-tv/schedule');

  await page.locator('.slider').click();

  const selects = page.locator('.time-picker select');

  await selects.nth(0).selectOption('18');
  await selects.nth(1).selectOption('30');
  await selects.nth(2).selectOption('22');
  await selects.nth(3).selectOption('15');

  await page.getByRole('button', { name: 'Save schedule' }).click();

  await expect(
    page.getByText('Schedule saved successfully.')
  ).toBeVisible();

  await page.reload();

  await expect(selects.nth(0)).toHaveValue('18');
  await expect(selects.nth(1)).toHaveValue('30');
  await expect(selects.nth(2)).toHaveValue('22');
  await expect(selects.nth(3)).toHaveValue('15');

  await page.getByRole('button', { name: 'Back to device' }).click();

  await expect(page.getByText('18:30 - 22:15')).toBeVisible();
});

test('07 - emergency override survives refresh', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone');

  await page.getByRole('button', { name: '30 min' }).click();

  await expect(
    page.getByRole('heading', { name: 'Temporarily allowed' })
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'Temporarily allowed' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'End override' }).click();

  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'Paused' })
  ).toBeVisible();
});

test('08 - protection pairing survives refresh', async ({ page }) => {
  await login(page);
  await page.goto('/devices/living-room-tv/protection');

  await page.getByRole('button', { name: 'Start pairing' }).click();

  await expect(
    page.getByText('Waiting for confirmation')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Profile installed' }).click();

  await expect(
    page.getByText('Paired', { exact: true })
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByText('Paired', { exact: true })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Full Protection', exact: true }).first()
  ).toBeVisible();
});

test('09 - unknown device setup flow works', async ({ page }) => {
  await login(page);
  await page.goto('/devices');

  await page.getByRole('button', { name: 'Set up' }).click();

  await expect(page).toHaveURL(/\/devices\/unknown-device\/setup$/);

  await page
    .getByPlaceholder("e.g. Amina's tablet")
    .fill('Test iPhone');

  await page.getByRole('button', { name: /Teen/ }).click();

  await page
    .getByRole('button', { name: /Standard Protection/ })
    .click();

  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page).toHaveURL(/\/devices\/unknown-device$/);

  await expect(
    page.getByRole('heading', { name: 'Test iPhone', exact: true }).first()
  ).toBeVisible();

  await page.getByRole('button', { name: 'Back to devices' }).click();

  const newDeviceCard = page
    .locator('.device-card')
    .filter({ hasText: 'Test iPhone' });

  await expect(newDeviceCard).toBeVisible();
  await expect(
    newDeviceCard.getByText('Teen profile')
  ).toBeVisible();
});

test('10 - another account cannot see demo account devices', async ({ page }) => {
  await login(page);

  await page.evaluate(() => {
    localStorage.setItem(
      'fornect-auth-user',
      JSON.stringify({
        id: 'user-other',
        name: 'Other User',
        email: 'other@fornect.com',
        accountId: 'account-other-999'
      })
    );
  });

  await page.goto('/devices');

  await expect(page.getByText("Amar's iPhone")).not.toBeVisible();
  await expect(page.getByText('Living room TV')).not.toBeVisible();
  await expect(page.getByText('PlayStation 5')).not.toBeVisible();

  const counts = page.locator('.summary-card strong');

  await expect(counts.nth(0)).toHaveText('0');
  await expect(counts.nth(1)).toHaveText('0');
  await expect(counts.nth(2)).toHaveText('0');
});

test('11 - main devices screen fits mobile width', async ({ page }) => {
  await page.setViewportSize({
    width: 390,
    height: 844
  });

  await login(page);
  await page.goto('/devices');

  const hasHorizontalOverflow = await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
    );
  });

  expect(hasHorizontalOverflow).toBe(false);

  await expect(
    page.getByRole('heading', { name: 'Devices', exact: true })
  ).toBeVisible();
});


test('12 - dashboard quick actions all work', async ({ page }) => {
  await login(page);

  // Devices
  await page.getByRole('button', { name: 'Devices' }).click();
  await expect(page).toHaveURL(/\/devices$/);

  // Schedules
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Schedules' }).click();
  await expect(page).toHaveURL(/\/schedules$/);
  await expect(
    page.getByRole('heading', { name: 'Schedules', exact: true })
  ).toBeVisible();

  // Protection
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Protection' }).click();
  await expect(page).toHaveURL(/\/protection$/);
  await expect(
    page.getByRole('heading', { name: 'Protection', exact: true })
  ).toBeVisible();

  // Pause internet
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Pause internet' }).click();

  await expect(
    page.getByRole('button', { name: 'Resume internet' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Internet is paused' })
  ).toBeVisible();

  // Pause state survives refresh
  await page.reload();

  await expect(
    page.getByRole('button', { name: 'Resume internet' })
  ).toBeVisible();

  // Resume internet
  await page.getByRole('button', { name: 'Resume internet' }).click();

  await expect(
    page.getByRole('button', { name: 'Pause internet' })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Your network is protected' })
  ).toBeVisible();
});

