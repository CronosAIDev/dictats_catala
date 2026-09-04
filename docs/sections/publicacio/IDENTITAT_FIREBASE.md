# Identitat d'usuaris a les apps de Cronos: Firebase i la base de dades

> Document d'arquitectura per a **totes les apps de Cronos**, no només per a una.
> Escrit el 2026-09-04 a petició de l'Óscar, per deixar per escrit uns quants fets que
> hem anat trobant aquests dies i que afecten les dues apps alhora.
>
> **No decideix res.** Explica el terreny; la tria és d'en Gerard i en Xavi.

## 1. Firebase Auth NO és una base de dades

És la confusió més fàcil de tenir i la que més cara surt, així que va primer.

**Firebase Authentication** només respon una pregunta: **qui ets**. Guarda el correu, la
contrasenya (xifrada per ells), l'enllaç amb el compte de Google, i emet un identificador
únic per persona: el **`uid`**. Res més. No guarda dictats, ni rutes, ni progrés, ni
vehicles, ni res del que fa l'app.

Firebase **sí** que té bases de dades pròpies —Firestore i Realtime Database— però **no
són SQL**: són NoSQL, de documents tipus JSON, sense taules ni files. **No entren en aquest
document**: aquí es parla només d'Auth.

| | Què fa | Què NO fa |
|---|---|---|
| **Firebase Auth** | Verificar identitat, emetre `uid`, recuperació de contrasenya, verificació d'email, protecció contra força bruta | Guardar dades de l'app |
| **La vostra taula MySQL** | Progrés, textos, rutes, vehicle — tot el que és de l'app | Verificar contrasenyes |

## 2. Per tant: calen LES DUES coses

No és "Firebase **o** taula d'usuaris". És Firebase **i** taula, cadascuna per al seu:

```
Persona → Firebase Auth → uid  ────┐
                                   ├──> taula MySQL de l'app, indexada per uid
Dades de l'app  ───────────────────┘     (progrés, rutes, vehicle...)
```

El que canvia respecte d'avui **no és que desaparegui la taula**: és que deixa de guardar
contrasenyes i deixa d'inventar-se el seu propi id d'usuari. Passa a fer servir el `uid`
de Firebase com a clau.

**El que es descarta**: `bcrypt`, el client OAuth propi, i la gestió manual de sessions.
**El que es conserva**: la taula, tot el que hi penja, i els endpoints que no són d'auth.

## 3. El fet que decideix l'arquitectura de tot Cronos

L'Óscar ha explicat l'objectiu a mitjà termini: **saber si un usuari d'una app també ho és
d'una altra, i explotar aquesta base d'usuaris per retroalimentar tot l'univers Cronos.**

Això té una conseqüència tècnica dura, i és el motiu principal d'aquest document:

> **Un únic projecte de Firebase per a totes les apps de Cronos, no un per app.**

Per què. El `uid` és únic **dins d'un projecte de Firebase**. Dues apps que comparteixen
projecte i on la mateixa persona entra amb el mateix compte de Google reben **el mateix
`uid`** — i llavors saber que és la mateixa persona és immediat, és una comparació d'un
camp.

Si cada app munta el seu projecte propi, cada una té la seva bossa de `uid`s
**incompatible** amb la de l'altra. La mateixa persona té dos identificadors diferents i no
hi ha manera de saber que és la mateixa sense un procés de fusió posterior (creuar correus,
resoldre duplicats, decidir què passa amb qui va canviar d'adreça).

**Això s'ha de decidir abans de muntar-ho, no després.** És una decisió del tipus que no té
marxa enrere barata — la mateixa categoria que l'`applicationId` de Play.

## 4. On ha de viure la base de dades: dins o fora de Google?

Pregunta oberta de l'Óscar, i és pertinent perquè avui **la resposta és "fora"**.

**Fet verificat**: les dues apps escriuen a `DB_HOST=db1.bwai.cc`, base `cronosai`. Això
**no és Google Cloud** — és un servidor de Trawlingweb. Avui la identitat aniria a Google
(Firebase) i les dades es quedarien a infraestructura de Trawlingweb.

| Opció | A favor | En contra |
|---|---|---|
| **Quedar-se a `db1.bwai.cc`** | Ja funciona, cost zero, cap migració | Cronos depèn d'infraestructura de Trawlingweb, que és un altre món (§33). Si algun dia se separa de debò, cal migrar igualment |
| **Cloud SQL** (MySQL gestionat de Google) | Tot dins de Google, backups i rèpliques gestionats, coherent amb la directriz de l'Óscar | **Té cost mensual real** — a diferència de Firebase Auth, que és gratis. Cal mirar preus abans |

**No cal decidir-ho ara** per publicar Dictats: es pot llançar amb la BD on és i moure-la
després — moure una base de dades és una migració coneguda i acotada, no com el `uid`, que
s'ha de fer bé des del principi. Però convé tenir-ho present, sobretot en Xavi, que és qui
va fer la migració a MySQL.

## 5. Cap dels dos ha muntat Firebase abans

Fet, sense drama. Per això la proposta de coordinació:

1. **Un de vosaltres el munta una sola vegada**, sobre el projecte GCP que ja existeix
   (`kairos-family-app`), activa els proveïdors (Google, email+contrasenya) i **ho
   documenta a `wiki-cronos`**.
2. **L'altre el reutilitza.** La configuració de client de Firebase **no és secreta** —
   és pública per disseny, va al frontend—, així que es pot documentar sense por.
3. Com que en Gerard arrenca ara amb Dictats, el més pràctic és que el munti ell i en Xavi
   el reaprofiti quan decideixi què fa amb aicamper ([wiki-cronos#32](https://github.com/CronosAIDev/wiki-cronos/issues/32)).

## 6. El que ha de quedar decidit entre vosaltres dos

- [ ] **Un sol projecte de Firebase per a tot Cronos** (recomanat pel punt 3) o un per app
- [ ] Qui el munta i el documenta
- [ ] Quins proveïdors s'activen: Google, email+contrasenya, els dos
- [ ] Si la taula de perfil per app es queda a `db1.bwai.cc` o es planteja Cloud SQL (punt 4)
- [ ] Si aicamper migra o es queda amb el que té (#32) — ara amb el context del punt 3, que
      canvia el càlcul: no migrar també vol dir quedar-se fora de la base d'usuaris comuna

---

**Preus, verificats a [cloud.google.com/identity-platform/pricing](https://cloud.google.com/identity-platform/pricing)**:
Firebase Auth és **gratis sense límit d'usuaris** per a email+contrasenya i OAuth federat.
Només es paga amb funcions empresarials (SAML/OIDC, multi-tenant), que aquí no calen.
