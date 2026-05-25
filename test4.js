import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(5000);
  
  const content = await page.content();
  fs.writeFileSync('debug_html.html', content);
  console.log("Dumped HTML.");
  
  await browser.close();
})();
