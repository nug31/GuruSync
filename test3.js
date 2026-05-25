import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/login');
  
  // wait for input
  await page.waitForSelector('input[type="email"]');
  // I don't know the password. I'll just type nonsense.
  await page.type('input[type="email"]', 'admin@example.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  console.log("Current URL after login:", page.url());
  
  const content = await page.content();
  if (content.includes('Memuat...')) {
    console.log('Stuck on loading screen!');
  }
  
  await browser.close();
})();
