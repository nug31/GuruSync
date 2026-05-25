import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // try to login with any existing user, or just see if there's an error.
  // wait, I don't know the password.
  // I can just try to run it and check for PAGE ERROR.
  console.log("Current URL:", page.url());
  
  await browser.close();
})();
