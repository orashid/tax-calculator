import { Page } from '@playwright/test';

const API_URL = 'http://localhost:3000/api/v1';

export async function loginViaAPI(page: Page, email = 'admin@meetingrunner.app', password = 'admin123') {
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();

  // Must navigate to the app origin first before we can set localStorage
  await page.goto('/login');
  await page.evaluate((tokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }, body);

  return body;
}

export async function loginViaUI(page: Page, email = 'admin@meetingrunner.app', password = 'admin123') {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

export async function createBoardViaAPI(page: Page, name: string, accessToken: string) {
  const res = await page.request.post(`${API_URL}/boards`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name },
  });
  return res.json();
}
