#!/usr/bin/env node
// F60, opció 1 — Migrar els comptes existents de BrandWaiUserProfile (brandwaiapp,
// contrasenyes en text pla) a dictats_usuarios (cronosai, bcrypt).
//
// El progrés de SQLite està indexat per email, així que migrar el compte amb el
// MATEIX correu conserva tot l'historial. La contrasenya actual es re-hasheja amb
// bcrypt: l'usuari entra amb la mateixa d'abans i el text pla no viatja enlloc.
//
// Per defecte NO ESCRIU RES (assaig): diu què faria. Per executar-ho de debò:
//
//   node scripts/db/002_migrar_usuaris.js --fes-ho
//
// Necessita al .env les dues connexions:
//   - Origen:  MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD (brandwaiapp)
//   - Destí:   DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME   (cronosai)
//
// És idempotent: un correu que ja existeixi a dictats_usuarios es deixa estar
// (no es toca ni la contrasenya ni el nom). Es pot rellançar sense por.

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const RONDES = 12; // les mateixes que src/lib/usuaris.js
const FES_HO = process.argv.includes('--fes-ho');

async function main() {
  for (const v of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'DB_HOST', 'DB_USER', 'DB_PASSWORD']) {
    if (!process.env[v]) throw new Error(`Falta ${v} al .env`);
  }

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
     WHERE p.email IS NOT NULL AND p.email <> ''`
  );
  console.log(`Comptes a BrandWaiUserProfile: ${files.length}`);
  if (!FES_HO) console.log('(assaig: no s\'escriurà res; afegeix --fes-ho per migrar)\n');

  let migrats = 0, saltats = 0, sense = 0;
  for (const fila of files) {
    const email = fila.email.trim().toLowerCase();
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

  console.log(`\n${FES_HO ? 'Migrats' : 'Es migrarien'}: ${migrats} · ja existien: ${saltats} · sense contrasenya: ${sense}`);
  await origen.end();
  await desti.end();
}

main().catch((e) => {
  console.error('✗ FALLO:', e.code || '', e.sqlMessage || e.message);
  process.exit(1);
});
