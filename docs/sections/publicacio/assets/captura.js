// Captura el gráfico de cabecera (F62) a 1024×500 exactos.
// Necesita puppeteer-core y un Chrome local:
//   node docs/sections/publicacio/assets/captura.js [ruta-a-puppeteer-core]
const path = require('path');
const modul = process.argv[2] || 'puppeteer-core';
const puppeteer = require(require.resolve(modul, { paths: [process.cwd(), __dirname] }));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 500 });
  await page.goto('file://' + path.join(__dirname, 'grafic-capcalera.html'), { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(__dirname, 'grafic-capcalera-1024x500.png') });
  await browser.close();
  console.log('OK: grafic-capcalera-1024x500.png');
})();
