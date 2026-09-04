#!/usr/bin/env node
// Genera public/.well-known/assetlinks.json per al TWA (Fase 2 del gameplan).
//
//   node scripts/assetlinks.js <empremta-de-pujada> <empremta-de-Play>
//
// Existeix per una raó concreta: **són dues empremtes SHA-256, no una**, i
// posar-ne només una és el fallo que el gameplan documenta com a trampa 2 —
// l'app s'instal·la, s'obre, i surt amb la barra de Chrome a sobre **sense
// donar cap error**. Passar-hi una sola empremta aquí és un error, a posta.
//
//   1. La del keystore de pujada, la que generes tu:
//      keytool -list -v -keystore <el-teu.keystore> -alias <alias>
//   2. La que genera Google amb Play App Signing, que NOMÉS existeix després de
//      pujar el primer AAB:
//      Play Console -> Configuració -> Integritat de l'aplicació

const fs = require('fs');
const path = require('path');

// L'`applicationId` es congela per sempre amb el primer AAB (trampa 3). La
// recomanació i les alternatives són a docs/sections/publicacio/FITXA_PLAY.md.
const PAQUET = process.env.TWA_PACKAGE || 'io.generaive.dictats';
const DESTI = path.join(__dirname, '../public/.well-known/assetlinks.json');

const FORMA = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i;   // 32 bytes en hexadecimal separats per dos punts

function plega(motiu) {
  console.error(`\n  ${motiu}\n`);
  console.error('  Ús: node scripts/assetlinks.js <empremta-de-pujada> <empremta-de-Play>\n');
  console.error('  Les empremtes són SHA-256, 32 parells hexadecimals separats per dos punts:');
  console.error('  AB:CD:EF:...:12  (64 caràcters hexadecimals, 95 amb els separadors)\n');
  process.exit(1);
}

const empremtes = process.argv.slice(2).map((e) => e.trim().toUpperCase());

if (empremtes.length === 0) plega('Falten les empremtes.');
if (empremtes.length === 1) {
  plega('Només has donat UNA empremta, i en calen DUES.\n\n'
    + '  Amb una sola, l\'app s\'instal·la i s\'obre amb la barra de Chrome a sobre,\n'
    + '  i no dona cap error enlloc. És la trampa que costa el dia sencer.\n\n'
    + '  Si encara no tens la de Play App Signing és perquè no has pujat el primer\n'
    + '  AAB: puja\'l, agafa-la de Play Console i torna a passar per aquí.');
}
if (empremtes.length > 2) plega(`Has donat ${empremtes.length} empremtes i n'esperava dues.`);

for (const e of empremtes) {
  if (!FORMA.test(e)) {
    plega(`Aquesta empremta no té la forma d'una SHA-256:\n    ${e}`);
  }
}
if (empremtes[0] === empremtes[1]) {
  plega('Les dues empremtes són la mateixa. Han de ser la de pujada i la de Play,\n'
    + '  que són diferents.');
}

const contingut = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: PAQUET,
    sha256_cert_fingerprints: empremtes,
  },
}];

fs.writeFileSync(DESTI, JSON.stringify(contingut, null, 2) + '\n');

console.log(`\n  Escrit ${path.relative(process.cwd(), DESTI)}`);
console.log(`  Paquet: ${PAQUET}`);
console.log(`  Empremtes: ${empremtes.length}\n`);
console.log('  Un cop desplegat, comprova que se serveix SENSE sessió:');
console.log('    curl -s https://dictation.generaive.io/.well-known/assetlinks.json\n');
