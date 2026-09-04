// Proves del que anima (#23): ratxa, fites i comparació amb un mateix.
//
// Les funcions són pures a posta, així que això no toca cap base de dades ni
// cap rellotge de veritat: la data «d'avui» s'hi passa.

const M = require('../src/lib/motivacio');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}

// Migdia, per no dependre de l'horari d'estiu en cap direcció.
const a = (dia, hora = '12:00:00') => `2026-09-${String(dia).padStart(2, '0')} ${hora}`;
const AVUI = new Date('2026-09-10T12:00:00Z');

console.log('\nLa ratxa de dies seguits:');
comprova('sense cap dictat, zero', { dies: 0, avuiFet: false, enPerill: false }, M.ratxa([], AVUI));
comprova('només avui, un dia', 1, M.ratxa([a(10)], AVUI).dies);
comprova('tres dies seguits acabats avui', 3, M.ratxa([a(8), a(9), a(10)], AVUI).dies);
comprova('els repetits del mateix dia no compten dos cops', 2, M.ratxa([a(9), a(9, '18:00:00'), a(10)], AVUI).dies);
comprova('un dia buit al mig la trenca', 1, M.ratxa([a(7), a(8), a(10)], AVUI).dies);
comprova('l\'ordre de les dates no importa', 3, M.ratxa([a(10), a(8), a(9)], AVUI).dies);

console.log('\nLa ratxa no es trenca a mitjanit, sinó al cap d\'un dia sencer:');
{
  const r = M.ratxa([a(8), a(9)], AVUI);            // ahir sí, avui encara no
  comprova('ve d\'ahir i segueix viva', 2, r.dies);
  comprova('i diu que avui encara no s\'ha fet', false, r.avuiFet);
  comprova('per poder convidar-hi sense renyar', true, r.enPerill);
}
comprova('dos dies sense fer-ne cap sí que la trenca', 0, M.ratxa([a(7), a(8)], AVUI).dies);

console.log('\nLes fites de volum:');
comprova('el desè dictat és fita', 10, M.fita(10).numero);
comprova('el novè no', null, M.fita(9));
comprova('el 25è i el 50è també', [25, 50], [M.fita(25).numero, M.fita(50).numero]);
comprova('a partir de 100 van de cent en cent', 300, M.fita(300).numero);
comprova('i el 150 no és fita', null, M.fita(150));
comprova('zero dictats no és cap fita', null, M.fita(0));

console.log('\nLa comparació és amb un mateix, i mai renya:');
comprova('amb menys de tres dictats abans, no es diu res', null, M.comparativa(3, 5, 2));
comprova('sense historial tampoc', null, M.comparativa(3, null, 0));
{
  const c = M.comparativa(3, 5, 10);
  comprova('millor que la mitjana ho diu', true, c.millor);
  comprova('i porta la mitjana arrodonida a un decimal', 5, c.mitjana);
}
{
  const c = M.comparativa(7, 4.25, 10);
  comprova('pitjor que la mitjana NO es marca com a dolent', false, c.millor);
  comprova('i la mitjana s\'arrodoneix, no es talla', 4.3, c.mitjana);
  comprova('el text no jutja: només diu la xifra', 'La teva mitjana és 4,3.', c.text);
}
comprova('igual que la mitjana no és «millor»', [false, true],
  [M.comparativa(4, 4, 10).millor, M.comparativa(4, 4, 10).igual]);

console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves del que anima passen');
process.exitCode = falles ? 1 : 0;
