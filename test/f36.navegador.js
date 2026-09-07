// Comprova que el progrés es pot comparar amb un mateix (F36).
//
//   npm i --no-save puppeteer-core && node test/f36.navegador.js
//
// S'aixeca el servidor sol amb una BD temporal, com `f33` i `f35`. Fora de
// `npm test` pel mateix motiu: allà no hi ha dependències ni ports. La lògica
// pura ja es prova a `test/progres.test.js`, que sí que hi entra.
//
// Els dictats es fan amb correccions de VERITAT contra `/api/correct`. L'única
// cosa que es toca a mà és el `completed_at` d'aquelles mateixes files, per
// escampar-les per setmanes: no hi ha cap manera de fer un dictat «la setmana
// passada» per l'API, i esperar set dies no és una prova.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer-core');

const PORT = 3985;
const BASE = `http://localhost:${PORT}`;
const BD = path.join(os.tmpdir(), `dictats-f36-${process.pid}.db`);

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const servidor = spawn('node', [path.join(__dirname, '../src/index.js')], {
    env: { ...process.env, PORT: String(PORT), DICTATS_DB_PATH: BD, DICTATS_AUTH_BYPASS: '1', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let registre = '';
  servidor.stdout.on('data', d => { registre += d; });
  servidor.stderr.on('data', d => { registre += d; });

  let browser = null;
  const acaba = async (codi) => {
    if (browser) await browser.close().catch(() => {});
    servidor.kill();
    try { fs.unlinkSync(BD); } catch {}
    process.exit(codi);
  };

  try {
    await espera(3000);
    const primera = await fetch(BASE + '/mobile');
    const galeta = (primera.headers.get('set-cookie') || '').split(';')[0];
    const caps = { 'Content-Type': 'application/json', Cookie: galeta };

    /**
     * Un dictat de veritat amb EXACTAMENT `quantes` paraules mal escrites.
     *
     * Es canvia l'última lletra de paraules netes i llargues en comptes de
     * treure accents: treure accents depèn de quants en tingui el text, i el
     * primer intent d'aquesta prova va demanar tres errors a un text que només
     * tenia dues paraules accentuades.
     */
    async function dicta(nivell, id, quantes) {
      const t = await (await fetch(`${BASE}/api/texts/${nivell}/${id}`, { headers: { Cookie: galeta } })).json();
      let fets = 0;
      const user = t.text.replace(/\|\|/g, ' ').split(/\s+/).map((p) => {
        if (fets >= quantes) return p;
        if (!/^[a-zA-ZàèéíòóúïüçÀÈÉÍÒÓÚÏÜÇ]{4,}$/.test(p)) return p;
        fets++;
        return p.slice(0, -1) + 'x';
      }).join(' ');
      if (fets !== quantes) throw new Error(`el text ${id} no dona per a ${quantes} errors`);
      const c = await (await fetch(BASE + '/api/correct', {
        method: 'POST', headers: caps,
        body: JSON.stringify({ originalText: t.text, userText: user, level: nivell, textId: id, textTitle: t.title }),
      })).json();
      return { errors: (c.errors || []).length, paraules: c.totalWords };
    }

    const perfil = async () => (await fetch(BASE + '/api/profile', { headers: { Cookie: galeta } })).json();

    // ── 1. El cor de F36: el mateix nombre d'errors no és el mateix resultat
    console.log('Tres errors en un text curt no són tres en un de llarg:');
    const curt = await dicta('basic', 'b1', 3);
    let p = await perfil();
    const taxaCurt = p.stats.errorsPer100;
    const llarg = await dicta('avancat', 'a1', 3);
    p = await perfil();

    comprova('el text bàsic és més curt que l\'avançat', true, curt.paraules < llarg.paraules);
    comprova('tots dos tenen els mateixos errors', curt.errors, llarg.errors);
    comprova('i tot i així la taxa canvia', true, p.stats.errorsPer100 !== taxaCurt);
    comprova('la taxa pesa per paraules',
      Math.round(((curt.errors + llarg.errors) * 100 / (curt.paraules + llarg.paraules)) * 10) / 10,
      p.stats.errorsPer100);

    // ── 2. La mitjana ja no s'arrodoneix a enter
    console.log('\nLa mitjana no s\'arrodoneix:');
    await dicta('basic', 'b2', 1);
    p = await perfil();
    const bd = new Database(BD);
    const files = bd.prepare('SELECT errors_count FROM user_progress').all();
    const mitjanaReal = files.reduce((a, f) => a + f.errors_count, 0) / files.length;
    comprova('el decimal hi és', Math.round(mitjanaReal * 10) / 10, p.stats.avgErrors);
    comprova('i no és l\'enter', true, !Number.isInteger(p.stats.avgErrors) || Number.isInteger(mitjanaReal));

    // ── 3. Un dictat vell sense paraules no embruta la taxa
    console.log('\nUn dictat antic que no sap quantes paraules tenia:');
    bd.prepare(`INSERT INTO user_progress (email, text_id, text_title, level, score, errors_count, total_words, completed_at)
                VALUES (?, 'b9', 'Antic', 'basic', 0, 40, NULL, datetime('now'))`).run(p.email);
    const abansTaxa = p.stats.errorsPer100;
    p = await perfil();
    comprova('compta com a dictat fet', 4, p.stats.total);
    comprova('però no entra a la taxa', abansTaxa, p.stats.errorsPer100);
    comprova('i es diu quants en queden fora', 3, p.stats.dictatsComptats);
    comprova('la mitjana d\'errors sí que el compta', true, p.stats.avgErrors > mitjanaReal);

    // ── 4. La corba per setmanes
    console.log('\nLa corba, amb els dictats escampats per setmanes:');
    // Les files són de veritat; només se'ls mou el rellotge.
    const ids = bd.prepare('SELECT id FROM user_progress ORDER BY id').all().map(r => r.id);
    bd.prepare("UPDATE user_progress SET completed_at = datetime('now','-15 days') WHERE id = ?").run(ids[0]);
    bd.prepare("UPDATE user_progress SET completed_at = datetime('now','-14 days') WHERE id = ?").run(ids[1]);
    bd.prepare("UPDATE user_progress SET completed_at = datetime('now') WHERE id = ?").run(ids[2]);
    bd.close();

    p = await perfil();
    comprova('hi ha corba', true, Array.isArray(p.setmanes) && p.setmanes.length >= 2);
    comprova('la darrera setmana és la d\'ara', true,
      p.setmanes[p.setmanes.length - 1].dictats > 0);
    comprova('les setmanes van de la més antiga a la més recent', true,
      p.setmanes.every((s, i) => i === 0 || s.setmana > p.setmanes[i - 1].setmana));

    // ── 5. Com es veu
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome', headless: 'new',
      args: ['--no-sandbox', '--hide-scrollbars', '--lang=ca-ES'],
      defaultViewport: { width: 432, height: 900 },
    });
    const page = await browser.newPage();
    page.on('dialog', async (d) => { console.error('  [diàleg] ' + d.message()); await d.dismiss(); });
    await page.setCookie({ name: galeta.split('=')[0], value: galeta.split('=').slice(1).join('='), domain: 'localhost' });
    await page.goto(BASE + '/profile', { waitUntil: 'networkidle0' });
    await espera(900);

    console.log('\nI al perfil:');
    const vist = await page.evaluate(() => ({
      targetaVisible: document.getElementById('corba-card').style.display !== 'none',
      barres: document.querySelectorAll('#corba svg rect').length,
      filesTaula: document.querySelectorAll('#corba table tr').length,
      svgAmagatAlLector: document.querySelector('#corba svg').getAttribute('aria-hidden'),
      taulaNomesLector: document.querySelector('#corba table').className,
      avis: document.getElementById('corba-avis').textContent.trim(),
      xifres: [...document.querySelectorAll('.stat-card')].map(c => ({
        n: c.querySelector('.stat-number').textContent.trim(),
        l: c.querySelector('.stat-label').textContent.trim(),
      })),
    }));
    comprova('la targeta de la corba es veu', true, vist.targetaVisible);
    comprova('hi ha una barra per setmana amb dades', p.setmanes.filter(s => s.taxa !== null).length, vist.barres);
    comprova('i la taula del lector té una fila per setmana', p.setmanes.length, vist.filesTaula);
    comprova('l\'SVG no el llegeix el lector', 'true', vist.svgAmagatAlLector);
    comprova('perquè la taula ja ho diu tot', 'nomes-lector', vist.taulaNomesLector);
    comprova('s\'avisa del dictat antic', true, vist.avis.includes('no va desar quantes paraules'));

    const mitjana = vist.xifres.find(x => x.l === 'Mitjana d\'errors');
    const per100 = vist.xifres.find(x => x.l === 'Errors per 100 paraules');
    comprova('la mitjana es veu amb coma decimal', true, /,/.test(mitjana.n));
    comprova('i hi ha la xifra per 100 paraules', String(p.stats.errorsPer100).replace('.', ','), per100.n);

    console.log(falles === 0
      ? '\nEl progrés ja es pot comparar amb un mateix\n'
      : `\n${falles} comprovacions fallen\n`);
    await acaba(falles === 0 ? 0 : 1);
  } catch (e) {
    console.error('\nFALLA: ' + e.message);
    console.error(registre.slice(-1500));
    await acaba(1);
  }
})();
