#!/usr/bin/env node
// F60, opció 1 — Migrar els comptes que HAN FET SERVIR DICTATS de
// BrandWaiUserProfile (brandwaiapp, contrasenyes en text pla) a
// dictats_usuarios (cronosai, bcrypt).
//
// ⚠ BrandWaiUserProfile NO són «els usuaris de Dictats»: són els 200+ clients de
// FeedScale/Trawlingweb, que hi entraven de rebot perquè l'auth era compartida.
// Copiar les credencials de tots ells a la base de Dictats seria un disbarat.
// Per això aquest script NOMÉS migra els correus que tenen progrés real al
// SQLite de Dictats (user_progress, user_texts o user_errors) — o els que es
// passin explícitament amb --correus. Migrar-ho tot no és una opció que existeixi.
//
// El progrés està indexat per email, així que migrar el compte amb el MATEIX
// correu conserva tot l'historial. La contrasenya actual es re-hasheja amb
// bcrypt: l'usuari entra amb la mateixa d'abans i el text pla no viatja enlloc.
//
// Per defecte NO ESCRIU RES (assaig): diu què faria. Per executar-ho de debò:
//
//   node scripts/db/002_migrar_usuaris.js --fes-ho
//   node scripts/db/002_migrar_usuaris.js --correus otc@trawlingweb.app,altre@x.y --fes-ho
//
// Necessita al .env les dues connexions i la ruta del SQLite:
//   - Origen:  MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD (brandwaiapp)
//   - Destí:   DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME   (cronosai)
//   - Filtre:  DICTATS_DB_PATH (o <repo>/data/dictats.db)
//
// És idempotent: un correu que ja existeixi a dictats_usuarios es deixa estar.

require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const RONDES = 12; // les mateixes que src/lib/usuaris.js
const FES_HO = process.argv.includes('--fes-ho');

function correusDemanats() {
  const i = process.argv.indexOf('--correus');
  if (i === -1) return null;
  const llista = (process.argv[i + 1] || '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (!llista.length) throw new Error('--correus demana una llista: --correus a@b.c,d@e.f');
  return llista;
}

function correusAmbProgres() {
  const ruta = process.env.DICTATS_DB_PATH || path.join(__dirname, '..', '..', 'data', 'dictats.db');
  const db = new Database(ruta, { readonly: true, fileMustExist: true });
  const files = db.prepare(
    `SELECT email FROM user_progress
     UNION SELECT email FROM user_texts
     UNION SELECT email FROM user_errors`
  ).all();
  db.close();
  return files.map((f) => f.email.trim().toLowerCase());
}

async function main() {
  for (const v of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'DB_HOST', 'DB_USER', 'DB_PASSWORD']) {
    if (!process.env[v]) throw new Error(`Falta ${v} al .env`);
  }

  const volguts = correusDemanats() || correusAmbProgres();
  if (!volguts.length) {
    console.log('Cap correu amb progrés a Dictats i cap --correus: no hi ha res a migrar.');
    return;
  }
  console.log(`Correus candidats (${correusDemanats() ? '--correus' : 'amb progrés a Dictats'}): ${volguts.length}`);
  if (!FES_HO) console.log("(assaig: no s'escriurà res; afegeix --fes-ho per migrar)\n");

  const origen = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'brandwaiapp',
    connectTimeout: 8000,
  });
  const desti = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'cronosai',
    connectTimeout: 8000,
  });

  const [files] = await origen.query(
    `SELECT p.email, p.password, u.first_name
     FROM BrandWaiUserProfile p
     LEFT JOIN BrandWaiUsers u ON p.user_id = u.id
     WHERE LOWER(TRIM(p.email)) IN (${volguts.map(() => '?').join(',')})`,
    volguts
  );

  let migrats = 0, saltats = 0, sense = 0;
  const trobats = new Set();
  for (const fila of files) {
    const email = fila.email.trim().toLowerCase();
    trobats.add(email);
    if (!fila.password) {
      console.log(`  ∅ ${email} — sense contrasenya a l'origen, es salta`);
      sense++;
      continue;
    }
    const [ja] = await desti.query('SELECT id FROM dictats_usuarios WHERE email = ? LIMIT 1', [email]);
    if (ja.length) {
      console.log(`  = ${email} — ja existeix a dictats_usuarios, no es toca`);
      saltats++;
      continue;
    }
    if (FES_HO) {
      const hash = await bcrypt.hash(fila.password, RONDES);
      await desti.query(
        'INSERT INTO dictats_usuarios (email, password_hash, nombre) VALUES (?, ?, ?)',
        [email, hash, fila.first_name || null]
      );
      console.log(`  ✓ ${email} — migrat (bcrypt, nom: ${fila.first_name || '—'})`);
    } else {
      console.log(`  → ${email} — es migraria (nom: ${fila.first_name || '—'})`);
    }
    migrats++;
  }
  for (const c of volguts) {
    if (!trobats.has(c)) console.log(`  ? ${c} — té progrés a Dictats però no és a BrandWaiUserProfile`);
  }

  console.log(`\n${FES_HO ? 'Migrats' : 'Es migrarien'}: ${migrats} · ja existien: ${saltats} · sense contrasenya: ${sense}`);
  await origen.end();
  await desti.end();
}

main().catch((e) => {
  console.error('✗ FALLO:', e.code || '', e.sqlMessage || e.message);
  process.exit(1);
});
