// Proves de la identitat pròpia (src/lib/usuaris.js) i del descodificador
// d'id_token de Google (src/lib/googleOAuth.js).
//
//   node test/usuaris.test.js
//
// No cal cap MySQL: els helpers de base de dades s'injecten. El que es prova és
// la lògica —vinculació de comptes, normalització, invariants— que és on hi ha
// les decisions; el driver de MySQL no és cosa nostra.

const { crea } = require('../src/lib/usuaris');
const google = require('../src/lib/googleOAuth');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
async function llanca(nom, fn, tros) {
  try { await fn(); comprova(nom, 'un error amb «' + tros + '»', 'no ha fallat'); }
  catch (e) { comprova(nom, true, e.message.toLowerCase().includes(tros.toLowerCase())); }
}

// Una base de dades falsa: files a memòria i el mínim de SQL reconegut.
function baseFalsa(files = []) {
  const estat = { files: files.map((f) => ({ ...f })), seguentId: files.length + 1, consultes: [] };
  const troba = (sql, params) => {
    if (/WHERE email = \?/.test(sql)) return estat.files.find((f) => f.email === params[0]) || null;
    if (/WHERE google_id = \?/.test(sql)) return estat.files.find((f) => f.google_id === params[0]) || null;
    return null;
  };
  return {
    P: 'dictats_',
    estat,
    async get(sql, params) { estat.consultes.push(sql); return troba(sql, params); },
    async all(sql, params) { const f = troba(sql, params); return f ? [f] : []; },
    async run(sql, params) {
      estat.consultes.push(sql);
      if (/^INSERT/.test(sql)) {
        const [email, hash, nombre, googleId] = params;
        const fila = { id: estat.seguentId++, email, password_hash: hash, nombre, google_id: googleId || null };
        estat.files.push(fila);
        return { insertId: fila.id, affectedRows: 1 };
      }
      if (/^UPDATE .* SET google_id/.test(sql)) {
        const f = estat.files.find((x) => x.id === params[1]);
        if (f) f.google_id = params[0];
        return { affectedRows: f ? 1 : 0 };
      }
      if (/^UPDATE .* SET password_hash/.test(sql)) {
        const f = estat.files.find((x) => x.email === params[1]);
        if (f) f.password_hash = params[0];
        return { affectedRows: f ? 1 : 0 };
      }
      if (/^DELETE/.test(sql)) {
        const abans = estat.files.length;
        estat.files = estat.files.filter((x) => x.email !== params[0]);
        return { affectedRows: abans - estat.files.length };
      }
      return { affectedRows: 0 };
    },
  };
}

(async () => {
  console.log('Alta i login amb bcrypt:');
  {
    const db = baseFalsa();
    const u = crea(db);
    const nou = await u.crear({ email: '  Gerard@Exemple.CAT ', contrasenya: 'unabonacontrasenya', nom: 'Gerard' });
    comprova('el correu es normalitza (espais i majúscules)', 'gerard@exemple.cat', nou.email);
    comprova('el perfil surt amb la forma que ja feia servir l\'app',
      ['id', 'email', 'first_name'], Object.keys(nou));

    const desada = db.estat.files[0].password_hash;
    comprova('la contrasenya NO es desa en text pla', false, desada === 'unabonacontrasenya');
    comprova('i el que es desa és un hash de bcrypt', true, /^\$2[aby]\$/.test(desada));

    comprova('entra amb la contrasenya bona', 'gerard@exemple.cat',
      (await u.perEmailIContrasenya('GERARD@exemple.cat', 'unabonacontrasenya')).email);
    comprova('no entra amb una de dolenta', null,
      await u.perEmailIContrasenya('gerard@exemple.cat', 'unaaltracosa'));
    comprova('ni un correu que no existeix', null,
      await u.perEmailIContrasenya('ningu@exemple.cat', 'unabonacontrasenya'));
  }

  console.log('\nEl que no s\'accepta en donar-se d\'alta:');
  {
    const u = crea(baseFalsa());
    await llanca('contrasenya curta', () => u.crear({ email: 'a@b.cat', contrasenya: 'set7car' }), 'mínim');
    await llanca('correu sense forma de correu', () => u.crear({ email: 'aixo-no-ho-es', contrasenya: 'unabonacontrasenya' }), 'correu');
    await llanca('sense contrasenya', () => u.crear({ email: 'a@b.cat' }), 'contrasenya');
    await u.crear({ email: 'a@b.cat', contrasenya: 'unabonacontrasenya' });
    await llanca('correu repetit', () => u.crear({ email: 'A@B.cat', contrasenya: 'unaaltrabona' }), 'ja hi ha');
  }

  console.log('\nGoogle: la regla de vinculació (el fallo que més fa mal és duplicar la persona)');
  {
    const db = baseFalsa();
    const u = crea(db);
    // 1. Algú que ja tenia compte amb contrasenya i ara entra amb Google.
    await u.crear({ email: 'docent@escola.cat', contrasenya: 'unabonacontrasenya', nom: 'Docent' });
    const r1 = await u.resolGoogle({ googleId: 'sub-123', email: 'Docent@Escola.cat', nom: 'Docent G' });
    comprova('no crea un compte nou, reaprofita el del correu', false, r1.nou);
    comprova('i hi enganxa el google_id', 'sub-123', db.estat.files[0].google_id);
    comprova('només hi ha UN compte', 1, db.estat.files.length);

    // 2. El mateix, un segon cop: ara entra pel google_id.
    const r2 = await u.resolGoogle({ googleId: 'sub-123', email: 'docent@escola.cat' });
    comprova('la segona vegada entra pel google_id', [false, 1], [r2.nou, db.estat.files.length]);

    // 3. Algú nou de trinca.
    const r3 = await u.resolGoogle({ googleId: 'sub-999', email: 'nou@escola.cat', nom: 'Nou' });
    comprova('algú nou sí que dona d\'alta', true, r3.nou);
    comprova('amb password_hash, que és NOT NULL', true, /^\$2[aby]\$/.test(db.estat.files[1].password_hash));
    comprova('i ningú pot entrar-hi per contrasenya', null,
      await u.perEmailIContrasenya('nou@escola.cat', ''));
    await llanca('sense googleId no es resol res', () => u.resolGoogle({ email: 'x@y.cat' }), 'google');
  }

  console.log('\nEsborrar el compte — ho exigeix Play:');
  {
    const db = baseFalsa();
    const u = crea(db);
    await u.crear({ email: 'adeu@exemple.cat', contrasenya: 'unabonacontrasenya' });
    comprova('esborra i diu que ha esborrat', true, await u.esborraCompte('ADEU@exemple.cat'));
    comprova('i no en queda res', 0, db.estat.files.length);
    comprova('esborrar el que no hi és torna fals', false, await u.esborraCompte('ningu@exemple.cat'));
  }

  console.log('\nCanviar la contrasenya:');
  {
    const db = baseFalsa();
    const u = crea(db);
    await u.crear({ email: 'a@b.cat', contrasenya: 'lavellabonissima' });
    const abans = db.estat.files[0].password_hash;
    await u.canviaContrasenya('a@b.cat', 'lanovabonissima');
    comprova('el hash canvia', false, abans === db.estat.files[0].password_hash);
    comprova('i la nova serveix', 'a@b.cat', (await u.perEmailIContrasenya('a@b.cat', 'lanovabonissima')).email);
    comprova('la vella ja no', null, await u.perEmailIContrasenya('a@b.cat', 'lavellabonissima'));
    await llanca('no s\'accepta una de curta', () => u.canviaContrasenya('a@b.cat', 'curta'), 'mínim');
  }

  console.log('\nGoogle OAuth — el que es pot provar sense sortir a la xarxa:');
  {
    const abans = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    comprova('sense les tres variables, Google no s\'ofereix', false, google.estaConfigurat());
    process.env.GOOGLE_CLIENT_ID = 'client-de-prova';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://exemple.cat/auth/google/callback';
    comprova('amb les tres, sí', true, google.estaConfigurat());

    const url = new URL(google.urlAutoritzacio('estat-abc'));
    comprova('l\'URL porta l\'estat anti-CSRF', 'estat-abc', url.searchParams.get('state'));
    comprova('demana openid, email i perfil', 'openid email profile', url.searchParams.get('scope'));
    comprova('i força triar compte (mòbils compartits)', 'select_account', url.searchParams.get('prompt'));
    comprova('dos estats seguits no es repeteixen', false, google.nouEstat() === google.nouEstat());

    const jwt = (payload) => 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.y';
    comprova('descodifica el payload de l\'id_token', 'sub-1',
      google.descodificaIdToken(jwt({ sub: 'sub-1', email: 'a@b.cat' })).sub);
    try { google.descodificaIdToken('nomes-una-part'); comprova('un JWT mal fet peta', true, false); }
    catch (e) { comprova('un JWT mal fet peta', true, /format inesperat/.test(e.message)); }
    if (abans === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = abans;
  }

  console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves d\'usuaris passen');
  process.exitCode = falles ? 1 : 0;
})();
