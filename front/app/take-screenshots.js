import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Устанавливаем размер экрана как у десктопа
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Открываем страницу входа...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });
  
  // Ждем загрузку страницы
  await page.waitForTimeout(2000);
  
  console.log('Делаем скриншот страницы входа...');
  await page.screenshot({ path: '/Users/niksa/projects/diploma/front/app/screenshots/01_login_page.png', fullPage: true });
  
  // Если есть форма входа, пытаемся ввести демо данные
  try {
    // Проверяем наличие демо кнопки
    const demoButton = await page.$('button');
    if (demoButton) {
      console.log('Находим демо кнопку...');
      const buttonText = await page.evaluate(btn => btn.textContent, demoButton);
      console.log('Текст кнопки:', buttonText);
      
      if (buttonText.includes('Демо')) {
        console.log('Кликаем на демо вход...');
        await demoButton.click();
        await page.waitForTimeout(3000);
        
        console.log('Делаем скриншот после входа...');
        await page.screenshot({ path: '/Users/niksa/projects/diploma/front/app/screenshots/02_after_login.png', fullPage: true });
      }
    }
  } catch (e) {
    console.log('Не удалось войти через демо:', e.message);
  }
  
  await browser.close();
  console.log('Скриншоты сохранены!');
})();
