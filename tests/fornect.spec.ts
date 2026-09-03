import { test, expect, Page } from '@playwright/test';

async function login(page: Page): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('Email address').fill('test@fornect.com');
  await page.getByLabel('Password').fill('test123');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  // Router je stigao na dashboard, ali brze akcije se
  // renderuju tek nakon prvog prolaza. Bez ovog čekanja
  // klik odmah nakon prijave zna promašiti.
  await expect(
    page.getByRole('button', { name: 'Devices' })
  ).toBeVisible();
}

// POC default jezik je bosanski, a testovi gađaju
// engleske stringove. Jezik se zato fiksira prije
// nego se aplikacija uopšte pokrene.
const ENGLISH_ACCOUNTS = [
  'anonymous',
  'account-demo-001',
  'account-other-999'
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((accounts: string[]) => {
    for (const account of accounts) {
      localStorage.setItem(
        `fornect-account-preferences-${account}`,
        JSON.stringify({ language: 'en' })
      );
    }
  }, ENGLISH_ACCOUNTS);

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

  await page.waitForURL(/\/devices$/);

  await expect(page.getByText("Amar's iPhone")).toBeVisible();
  await expect(page.getByText('Living room TV')).toBeVisible();
  await expect(page.getByText('PlayStation 5')).toBeVisible();
  await expect(page.getByText('Unknown device')).toBeVisible();

  const tvCard = page
    .locator('.device-card')
    .filter({ hasText: 'Living room TV' });

  // Oznaka profila zivi na listi uredaja.
  await expect(
    tvCard.getByText('Adult profile')
  ).toBeVisible();

  await tvCard.getByRole('button', { name: 'Manage' }).click();

  await expect(page).toHaveURL(/\/devices\/living-room-tv$/);

  await expect(
    page.getByRole('heading', { name: 'Living room TV', exact: true }).first()
  ).toBeVisible();

  // Detalji uredaja isti podatak pisu punom recenicom,
  // i to na dva mjesta (header i kartica profila).
  await expect(
    page
      .getByText('This device uses the Adult protection profile.')
      .first()
  ).toBeVisible();
});

test('05 - profile change survives refresh', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone');

  await page.getByRole('button', { name: 'Change profile' }).click();
  await page.getByRole('button', { name: 'Teen', exact: true }).click();

  const teenProfileText = page
    .getByText('This device uses the Teen protection profile.')
    .first();

  await expect(teenProfileText).toBeVisible();

  await page.reload();

  await expect(teenProfileText).toBeVisible();
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
  await page.waitForURL(/\/devices$/);

  // Schedules
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Schedules' }).click();
  await page.waitForURL(/\/schedules$/);
  await expect(
    page.getByRole('heading', { name: 'Schedules', exact: true })
  ).toBeVisible();

  // Protection
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Protection' }).click();
  await page.waitForURL(/\/protection$/);
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

test('13 - help page is reachable from settings', async ({ page }) => {
  await login(page);
  await page.goto('/settings');

  await page
    .getByRole('link', { name: /How can we help/ })
    .click();

  await expect(page).toHaveURL(/\/help$/);

  await expect(
    page.getByRole('heading', { name: 'Help & Support' })
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Send request' })
    .click();

  await expect(
    page.getByText('Please enter at least 10 characters.')
  ).toBeVisible();

  await page
    .getByLabel('Message')
    .fill('My living room TV keeps going offline.');

  await page
    .getByRole('button', { name: 'Send request' })
    .click();

  await expect(
    page.getByText('Your support request has been received.')
  ).toBeVisible();
});

test('14 - registration survives an interrupted pairing step', async ({ page }) => {
  await page.goto('/register');

  await page.getByRole('button', { name: 'EN' }).click();

  await page.getByLabel('Full name').fill('Inas Test');

  await page
    .getByLabel('Email address')
    .fill('inas.test@fornect.com');

  await page
    .getByLabel('Password', { exact: true })
    .fill('Fornect2026');

  await page
    .getByLabel('Confirm password')
    .fill('Fornect2026');

  await page
    .getByRole('button', { name: 'Create account' })
    .click();

  await expect(page).toHaveURL(/\/verify-email$/);

  await page.getByLabel('Verification code').fill('123456');

  await page
    .getByRole('button', { name: 'Verify email' })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Your account is verified'
    })
  ).toBeVisible();

  // Korisnik prekida flow prije pairinga uređaja.
  await page.goto('/login');

  await page
    .getByLabel('Email address')
    .fill('inas.test@fornect.com');

  await page.getByLabel('Password').fill('Fornect2026');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('15 - content restrictions can be customized and reset', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone');

  const card = page
    .locator('.settings-card')
    .filter({ hasText: 'Content restrictions' });

  const socialMedia = card
    .locator('.restriction-item')
    .filter({ hasText: 'Block social media' })
    .locator('input');

  // Bedz se gadja klasom: tekst 'Profile defaults' se
  // inace poklopi i sa dugmetom za reset.
  const badge = card.locator('.restrictions-badge');

  await expect(badge).toHaveText('Profile defaults');
  await expect(socialMedia).toBeChecked();

  await socialMedia.uncheck();

  await expect(badge).toHaveText('Customized');

  await page.reload();

  await expect(badge).toHaveText('Customized');
  await expect(socialMedia).not.toBeChecked();

  await card
    .getByRole('button', { name: 'Reset to profile defaults' })
    .click();

  await expect(badge).toHaveText('Profile defaults');
  await expect(socialMedia).toBeChecked();
});

test('16 - profile change applies the new restriction preset', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone');

  const card = page
    .locator('.settings-card')
    .filter({ hasText: 'Content restrictions' });

  const adultContent = card
    .locator('.restriction-item')
    .filter({ hasText: 'Block adult content' })
    .locator('input');

  await expect(adultContent).toBeChecked();

  await page
    .getByRole('button', { name: 'Change profile' })
    .click();

  await page
    .getByRole('button', { name: 'Admin', exact: true })
    .click();

  await expect(adultContent).not.toBeChecked();

  await expect(
    card.locator('.restrictions-badge')
  ).toHaveText('Profile defaults');
});

test('17 - account without devices sees the pairing empty state', async ({ page }) => {
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

  await expect(
    page.getByRole('heading', { name: 'No devices connected' })
  ).toBeVisible();

  await page
    .getByRole('link', { name: 'Pair Fornect device' })
    .click();

  await expect(page).toHaveURL(/\/pair-device$/);
});

// Nivo zastite je jedna kontrola sa tri jacine, a certifikat je
// preduslov za najvisu - ne jacina za sebe. Ova cetiri testa
// pokrivaju upravo tu razliku, jer se na njoj vec grijesilo.

function levelOption(page: Page, title: string) {
  return page.locator('.protection-option').filter({
    has: page.getByRole('heading', { name: title, exact: true })
  });
}

test('18 - lowering to standard keeps the certificate installed', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone/protection');

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Full Protection');

  await levelOption(page, 'Standard Protection').click();

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Standard Protection');

  // Profil ostaje na uredjaju - to je cijela poenta izmjene.
  await expect(
    page.getByText('Paired', { exact: true })
  ).toBeVisible();

  await page.reload();

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Standard Protection');

  await expect(
    page.getByText('Paired', { exact: true })
  ).toBeVisible();
});

test('19 - full protection is locked until the profile is installed', async ({ page }) => {
  await login(page);
  await page.goto('/devices/living-room-tv/protection');

  const full = levelOption(page, 'Full Protection');

  await expect(full.locator('.option-lock')).toHaveText(
    'Requires an installed protection profile'
  );

  // Klik ne smije ostati mrtav: vodi u instalaciju profila.
  await full.click();

  await expect(
    page.getByText('Waiting for confirmation')
  ).toBeVisible();
});

test('20 - protection can be switched off and back on', async ({ page }) => {
  await login(page);
  await page.goto('/devices/amar-iphone/protection');

  await levelOption(page, 'Off').click();

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Off');

  await page.reload();

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Off');

  await levelOption(page, 'Standard Protection').click();

  await expect(
    page.locator('.section-heading h2')
  ).toHaveText('Standard Protection');
});

test('21 - offline device raises a notification that can be turned off', async ({ page }) => {
  await login(page);

  // PlayStation 5 je offline i ima tinejdzerski profil, pa je
  // pracenje prisutnosti podrazumijevano ukljuceno.
  await page.goto('/notifications');

  await expect(
    page.getByText('PlayStation 5').first()
  ).toBeVisible();

  await page.goto('/devices/playstation-5');

  const row = page.locator('.restriction-item').filter({
    hasText: 'Notify me when this device is off the network'
  });

  await expect(row.locator('input')).toBeChecked();

  await row.locator('input').uncheck();

  await expect(row.locator('input')).not.toBeChecked();

  await page.reload();

  await expect(row.locator('input')).not.toBeChecked();

  // Obavjestenje prati stvarno stanje, pa nestaje samo.
  await page.goto('/notifications');

  await expect(
    page.getByText('PlayStation 5')
  ).toHaveCount(0);
});
