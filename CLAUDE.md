# CLAUDE.md — Dictats Català

Instruccions per a Claude Code en treballar en aquest projecte. Es llegeix a l'inici de
cada sessió.

## Què és

App web per practicar dictats en català amb correcció automàtica via Claude API. L'usuari
escolta el text per síntesi de veu, l'escriu (o el fa en paper i puja una foto), i Claude
retorna la correcció amb errors classificats i una escala motivadora per nombre d'errors
(no per percentatge).

És un side project personal d'Óscar (no un producte de Trawlingweb), tot i que comparteix
autenticació amb FeedScale Console (`BrandWaiUserProfile`).

## Stack

- Node.js 22+, Express 5, vanilla JS/HTML/CSS (sense build ni transpilació)
- Auth: MySQL `brandwaiapp` → `BrandWaiUserProfile` (compartida amb FeedScale)
- Progrés local: SQLite (`better-sqlite3`), fora de l'arbre del repo
- IA: `@anthropic-ai/sdk`, model `claude-opus-4-6`
- Deploy: `kairos-vm` (GCP `kairos-family-app`) amb PM2 + nginx + certbot

Detall complet: `docs/guides/DEVELOPER_HANDBOOK.md`.

## Propietari

- Óscar Trabazos Claveria (`otc@trawlingweb.app`, `oscar@prioritygate.com`)
- Repo GitHub: `git@github.com:CronosAIDev/dictats_catala.git` (traslladat de `OTRABAZOS` el 2026-08-20)

---

## Normes de treball (obligatòries)

Aquest repo segueix el mètode transversal de Cronos: **la còpia local**
`C:\Users\oscar\Dev\Cronos\wiki-cronos\AI_CODE_INSTRUCTIONS.md` — **no** l'original de
Trawlingweb (veure avís més avall). Rellevant aquí:

| Document | Per a què |
|---|---|
| `README.md` | Què és el projecte, stack, estructura, ús |
| `CHANGELOG.md` | El passat: què es va fer i en quina versió (Keep a Changelog) |
| `changelogs/` | Un fragment per commit significatiu |
| `docs/project/ROADMAP.md` | El futur: features, estat, prioritat |
| `docs/guides/DEVELOPER_HANDBOOK.md` | Sempre vigent: setup, arquitectura, convencions, deploy |
| `docs/shell/SECURITY_PROTOCOL.md` | Protocol de seguretat (pendent de crear — veure ROADMAP) |

### Git flow (§9.6)

- Treball significatiu → branch `vN` (següent número segons `git branch -r`), **mai directe a `main`**.
- Merge a `main` amb `--no-ff` només quan està complet i verificat. Deploy només des de `main`.
- **Mai esborrar branches mergeades**: són l'històric i el punt de rollback.

### Deploy a `kairos-vm`

Service account nominal `otc-dev@kairos-family-app.iam.gserviceaccount.com` (mai el compte
personal `oscar@prioritygate.com`, que caduca). **`kairos-vm` NO porta `--tunnel-through-iap`**
(IP pública, port 22 obert) — és una particularitat pròpia d'aquest projecte GCP, no
copiar-la ni treure-la sense mirar quin projecte és cada VM. Detall:
`docs/guides/DEVELOPER_HANDBOOK.md` § Despliegue i `wiki-cronos/docs/acceso_kairos_vm.md`.

---

## Coordinació amb altres devs (OBLIGATORIO)

**Centre de comandament**: `CronosAIDev/wiki-cronos`
**Organització dels Projects**: `CronosAIDev`
**Plantilla de Project**: #2

> Aquestes tres línies diuen a quin món pertany aquest repo (§32.11). No les esborris:
> sense elles `/sync` para i pregunta.

**Si reps un enllaç a un Project, o el treball toca un altre dev o repo, ja saps què fer
— ningú t'ho ha d'explicar cada vegada.**

### On viu tot

- **Les tasques i la conversa**: Issues al **centre de comandament** d'amunt. SEMPRE
  allà, **mai** en aquest repo — una sola safata per a tothom.
- **El tauler**: un Project propi per gameplan, a l'organització.
- **El pla escrit**: el `GP_*.md`, al repo que el posseeix. Es llegeix per la seva URL
  raw amb `curl`; **mai clonar el repo d'un altre dev**.

### Requisit, una sola vegada per màquina

```bash
gh auth refresh -s project
```

Treu un codi d'un sol ús que s'autoritza a `github.com/login/device` des de **qualsevol**
navegador. Sense això, `gh project` falla amb `missing required scopes`.

### En començar a treballar

1. `git pull` al repo `wiki-cronos`: el protocol viu allà i canvia.
2. `/sync <numero-de-Project>` → les Issues d'**aquest gameplan** assignades a tu. Sense
   número, `/sync` les agrupa per gameplan i pregunta en quin treballem.
3. Deixa't vigilant, per no haver de preguntar:

   ```
   /loop 10m /sync <numero-de-Project>
   ```

   Cada 10 minuts consulta GitHub i **avisa aquí mateix** si algú t'ha reassignat una
   Issue o ha respost. Sense Telegram, sense correu, sense copiar i enganxar.

### Mentre treballes

- Treballa **només les teves** Issues. Les dels altres no són teves, ni les llegeixis per sobre.
- Verifica **per execució real**, mai per suposició. Si no ho has comprovat, escriu "sense verificar".
- Un comment = una intervenció. Una pregunta per comment.

### En respondre — reassignar és OBLIGATORI

Capçalera de cada comment, i després text lliure:

```
**<el-teu-login-github>** · repo: `<repo on has treballat>` · estat: info | pregunta | decisió | tancament
```

**NO escriguis la data ni l'hora a mà**: GitHub ja segella cada comment.

```bash
gh issue comment <N> --repo CronosAIDev/wiki-cronos --body-file resposta.md
gh issue edit <N> --repo CronosAIDev/wiki-cronos --remove-assignee @me --add-assignee <qui-segueix>
```

**Respondre sense reassignar deixa el fil mort i ningú se n'assabenta.**

### Els altres tres finals

| Situació | Què fas |
|---|---|
| Necessites decisió humana o algo extern | `gh issue edit <N> --repo CronosAIDev/wiki-cronos --add-label "gp:bloqueado" --remove-assignee @me` |
| La teva part està acabada | `gh issue close <N> --repo CronosAIDev/wiki-cronos` |
| El gameplan sencer està acabat | Tanca la Issue mare amb label `gp:cerrado`, tanca el seu Project i mou el `GP_*.md` a `docs/archive/` |

### Per crear un gameplan que toqui un altre dev o repo

`/gameplan` — crea el `GP_*.md`, el seu Project (còpia de la plantilla #2), la Issue mare
i una sub-issue per front de treball.

Doctrina i protocol complet: `wiki-cronos/AI_CODE_INSTRUCTIONS.md` §32.

### I l'altra wiki: la de Trawlingweb només es LLEGEIX

`CronosAIDev` i `trawlingweb` són **mons separats a propòsit**. El centre de comandament
d'amunt és `CronosAIDev/wiki-cronos`, que és **nostra**: allà s'escriu. `trawlingweb/wiki`
és de l'empresa i **només es llegeix**.

D'ella es cull el mètode de treball —deploy, accés a VMs, patrons de codi, convencions de
git— i s'aplica. El que **mai** es fa, sense excepció:

- **No s'escriu cap fitxer a `trawlingweb/wiki`.** Ni un changelog, ni un fragment, ni
  una correcció a una secció.
- **No s'obren Issues allà** ni s'usen els seus Projects, plantilles o labels.
- **No es documenta res d'aquest projecte** al coneixement general de Trawlingweb, encara
  que sembli interessant o que una norma seva sembli demanar-ho.

Si es veu que aquella wiki està equivocada, es diu a Óscar i decideix ell.

**Per què està escrit**: el 19-08-2026 una sessió va aplicar §32.10 de la wiki de
Trawlingweb a repos que no eren de l'empresa, i va arribar a publicar documentació
d'aquest mateix repo (`docs/dictats_catala.md`) a `trawlingweb/wiki`, indexada pel bot que
la reenvia per Telegram a tota l'empresa. Es va retirar en detectar-ho (§33 d'aquella
wiki) i es va recrear a `wiki-cronos/docs/dictats_catala.md`, que és on ha de viure. Cap
sessió va fer res estrany: van llegir «cada repo» i ho van aplicar. **El fallo va ser no
preguntar-se de qui era el repo.**

<!-- AI_CODE_INSTRUCTIONS-sync: 2026-08-20 -->
