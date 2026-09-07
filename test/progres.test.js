// Proves del progrés normalitzat (F36).
//
// Tot són funcions pures: ni base de dades ni rellotge de veritat —la data
// «d'ara» s'hi passa—, igual que a `motivacio.test.js`.

const P = require('../src/lib/progres');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  if (!ok) falles += 1;
  console.log(`  ${ok ? 'OK   ' : 'FALLA'}  ${nom}`);
  if (!ok) console.log(`         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`);
}

// Un dictat: dia del setembre de 2026, errors, paraules.
const d = (dia, errors, paraules) => ({
  completed_at: `2026-09-${String(dia).padStart(2, '0')} 12:00:00`,
  errors_count: errors,
  total_words: paraules,
});

console.log('\nErrors per 100 paraules, que és el que es pot comparar:');
comprova('3 errors en 34 paraules', 8.8, P.taxa(3, 34));
comprova('els mateixos 3 en 84 ja no són el mateix', 3.6, P.taxa(3, 84));
comprova('cap error és zero, no un buit', 0, P.taxa(0, 50));
comprova('sense saber les paraules no s\'inventa res', null, P.taxa(2, null));
comprova('ni amb zero paraules', null, P.taxa(2, 0));

console.log('\nLes xifres de tot l\'historial:');
{
  const r = P.resum([d(1, 2, 34), d(2, 3, 84)]);
  comprova('compta els dictats', 2, r.dictats);
  // 5 errors sobre 118 paraules = 4,24 → 4,2. NO és la mitjana de 8,8 i 3,6.
  comprova('la taxa pesa per paraules, no per dictats', 4.2, r.taxa);
  comprova('la mitjana d\'errors va amb un decimal', 2.5, r.mitjanaErrors);
}
comprova('2,4 i 2,6 ja no es veuen igual', [2.4, 2.6], [
  P.resum([d(1, 2, 50), d(2, 2, 50), d(3, 2, 50), d(4, 2, 50), d(5, 4, 50)]).mitjanaErrors,
  P.resum([d(1, 2, 50), d(2, 3, 50), d(3, 2, 50), d(4, 2, 50), d(5, 4, 50)]).mitjanaErrors,
]);
comprova('un historial buit no dona cap xifra',
  { dictats: 0, comptats: 0, mitjanaErrors: null, taxa: null }, P.resum([]));

console.log('\nEls dictats vells, que no saben quantes paraules tenien:');
{
  const r = P.resum([d(1, 2, 34), { completed_at: '2026-09-02 12:00:00', errors_count: 8, total_words: null }]);
  comprova('segueixen comptant com a dictats fets', 2, r.dictats);
  comprova('però no entren a la taxa', 1, r.comptats);
  comprova('i la taxa surt només dels que sí que se sap', 5.9, r.taxa);
  comprova('la mitjana d\'errors sí que els compta tots', 5, r.mitjanaErrors);
}
comprova('si cap dictat sap les paraules, no hi ha taxa', null,
  P.resum([{ completed_at: '2026-09-01 12:00:00', errors_count: 3, total_words: null }]).taxa);

console.log('\nLa setmana comença en dilluns:');
comprova('un dimarts cau a la seva setmana', '2026-09-07', P.dilluns('2026-09-08'));
comprova('el mateix dilluns es queda on és', '2026-09-07', P.dilluns('2026-09-07'));
comprova('un diumenge encara és de la setmana anterior', '2026-09-07', P.dilluns('2026-09-13'));

console.log('\nLa corba per setmanes:');
{
  // 07-09 és dilluns. Dues setmanes seguides.
  const s = P.setmanes([d(7, 4, 50), d(9, 2, 50), d(14, 1, 50)], { ara: new Date('2026-09-16T12:00:00Z') });
  comprova('una entrada per setmana', 2, s.length);
  comprova('ordenades de la més antiga a la més recent', ['2026-09-07', '2026-09-14'], s.map(x => x.setmana));
  comprova('amb els dictats de cada una', [2, 1], s.map(x => x.dictats));
  comprova('i la taxa de cada una', [6, 2], s.map(x => x.taxa));
}
{
  // Una setmana pel mig sense fer res: el forat s'ha de veure.
  const s = P.setmanes([d(7, 4, 50), d(21, 2, 50)], { ara: new Date('2026-09-23T12:00:00Z') });
  comprova('les setmanes buides del mig no s\'amaguen', 3, s.length);
  comprova('i es veuen com un forat, no com un zero', [8, null, 4], s.map(x => x.taxa));
  comprova('sense inventar-se dictats', [1, 0, 1], s.map(x => x.dictats));
}
{
  // No es fabrica passat: si vas començar fa dues setmanes, són dues.
  const s = P.setmanes([d(7, 4, 50)], { ara: new Date('2026-09-16T12:00:00Z'), quantes: 8 });
  comprova('no s\'inventen setmanes anteriors a la primera', 2, s.length);
}
comprova('sense cap dictat no hi ha corba', [], P.setmanes([], { ara: new Date('2026-09-16T12:00:00Z') }));

console.log('\nLa tendència només parla quan ha anat a millor:');
{
  const puja = P.setmanes([d(7, 1, 50), d(14, 5, 50)], { ara: new Date('2026-09-16T12:00:00Z') });
  comprova('si ha anat a pitjor, no diu res', null, P.tendencia(puja).text);
  const baixa = P.setmanes([d(7, 5, 50), d(14, 1, 50)], { ara: new Date('2026-09-16T12:00:00Z') });
  comprova('si ha anat a millor, sí', true, P.tendencia(baixa).millora);
  comprova('i ho diu amb els dos nombres',
    'Aquesta setmana vas a 2 errors per 100 paraules; de mitjana anaves a 10.',
    P.tendencia(baixa).text);
  comprova('amb una sola setmana no hi ha res a comparar', false,
    P.tendencia(P.setmanes([d(7, 1, 50)], { ara: new Date('2026-09-09T12:00:00Z') })).millora);
  comprova('igual tampoc és millorar', false,
    P.tendencia(P.setmanes([d(7, 2, 50), d(14, 2, 50)], { ara: new Date('2026-09-16T12:00:00Z') })).millora);
}

console.log(falles === 0
  ? '\nEl progrés ja es pot comparar amb un mateix\n'
  : `\n${falles} comprovacions fallen\n`);
process.exit(falles === 0 ? 0 : 1);
