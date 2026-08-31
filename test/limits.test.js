// Proves dels límits de crides (src/lib/limits.js).
//
//   node test/limits.test.js
//
// El que es prova aquí és **de qui es compta cada crida**, que és tota la
// decisió. Que express-rate-limit sàpiga comptar no és cosa nostra.

const limits = require('../src/lib/limits');

let falles = 0;
function comprova(nom, esperat, obtingut) {
  const ok = JSON.stringify(esperat) === JSON.stringify(obtingut);
  console.log((ok ? '  OK   ' : '  FALLA') + '  ' + nom
    + (ok ? '' : `\n         esperat ${JSON.stringify(esperat)}, obtingut ${JSON.stringify(obtingut)}`));
  if (!ok) falles++;
}
const peticio = (email, ip) => ({ ip, session: email ? { profile: { email } } : {} });

console.log('La clau és la persona, no la IP:');
{
  // El cas que ho motiva: una sala de professors surt a internet per una sola
  // IP. Si es comptés per IP, el tercer docent del matí es menjaria el bloqueig
  // d'un company.
  const a = limits.perPersona(peticio('anna@escola.cat', '203.0.113.7'));
  const b = limits.perPersona(peticio('bernat@escola.cat', '203.0.113.7'));
  comprova('dues persones darrere de la mateixa IP no es trepitgen', false, a === b);
  comprova('i la clau porta el correu', 'u:anna@escola.cat', a);

  const casa = limits.perPersona(peticio('anna@escola.cat', '198.51.100.4'));
  comprova('la mateixa persona des d\'una altra xarxa compta igual', a, casa);
}

console.log('\nSense sessió, es cau a la IP:');
{
  const clau = limits.perPersona(peticio(null, '203.0.113.7'));
  comprova('la clau és una cadena, no un objecte', 'string', typeof clau);
  comprova('i no és buida', true, clau.length > 0);
  comprova('dues peticions de la mateixa IP donen la MATEIXA clau',
    clau, limits.perPersona(peticio(null, '203.0.113.7')));
  comprova('i de IPs diferents, claus diferents',
    false, clau === limits.perPersona(peticio(null, '198.51.100.4')));

  // Regressió: `ipKeyGenerator` rep la IP, no la petició. Passant-li `req`
  // tornava el mateix objecte, així que cada petició estrenava cubell i el
  // límit no saltava mai. Que la clau sigui una cadena és el que ho detecta.
  const ipv6 = limits.perPersona(peticio(null, '2001:db8::1'));
  comprova('també amb IPv6 la clau és una cadena', 'string', typeof ipv6);
  comprova('dues adreces del mateix prefix IPv6 compten juntes',
    ipv6, limits.perPersona(peticio(null, '2001:db8::99')));
}

console.log('\nLes dues rutes porten dues capes cadascuna:');
comprova('correcció: ràfega i sostre diari', 2, limits.correccio.length);
comprova('foto: igual', 2, limits.foto.length);
comprova('i són middlewares', ['function', 'function'],
  limits.correccio.concat(limits.foto).slice(0, 2).map((f) => typeof f));

console.log(falles ? `\n${falles} FALLES` : '\nTotes les proves dels límits passen');
process.exitCode = falles ? 1 : 0;
