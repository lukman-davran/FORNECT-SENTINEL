import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,

  // Prvi test placa hladan start dev servera. Playwright saceka
  // da se port otvori, ali prvi stvarni zahtjev jos uvijek moze
  // cekati kompilaciju. Na opterecenoj masini (Android emulator i
  // Gradle daemon u pozadini) to je preslo podrazumijevanih 30
  // sekundi i oborilo test 01, iako aplikacija radi ispravno.
  timeout: 60000,

  // Jedno ponavljanje pokriva taj hladan start. Cijena je da
  // ponavljanje moze sakriti stvarnu nestabilnost, pa test koji
  // prolazi tek iz drugog puta izvjestaj oznaci kao "flaky" -
  // to treba pogledati, ne ignorisati.
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ],

  webServer: {
    command: 'npx ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120000
  }
});
