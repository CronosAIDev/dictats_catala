# Roadmap — dictats_catala

## Completado

| ID | Feature | Versión | Fecha |
|----|---------|---------|-------|
| F1 | Auth MySQL BrandWaiUserProfile | v1.0.0 | 2026-03-22 |
| F2 | Dictado por voz (Web Speech API) | v1.0.0 | 2026-03-22 |
| F3 | Corrección por texto (Claude) | v1.0.0 | 2026-03-22 |
| F4 | Modo papel + corrección por foto (Claude Vision) | v1.0.0 | 2026-03-22 |
| F5 | Nivell "Els meus textos" (textos personales) | v1.0.0 | 2026-03-22 |
| F6 | Escala motivadora por nº errores | v1.0.0 | 2026-03-22 |
| F7 | Vista móvil (/mobile) | v1.0.0 | 2026-03-22 |
| F8 | Perfil + historial (/profile) | v1.0.0 | 2026-03-22 |
| F9 | Deploy en mochi-vm (dictation.generaive.io) | v1.0.0 | 2026-03-22 |
| F13 | Revisar `npm audit` — 7 vulnerabilidades a 0 | v5 | 2026-08-26 |

## En Curso

| ID | Feature | Descripción | Estado | Asignado a |
|----|---------|-------------|--------|------------|
| F16 | Dictats en Google Play | [Gameplan](../sections/publicacio/GP_dictats_a_google_play.md) — PWA → TWA → ficha de Play. Bloqueado en Fase 0: decidir quién puede usar la app (hoy el login va contra la tabla de clientes de Trawlingweb) | En curso | gerard |

## Pendiente

| ID | Feature | Descripción | Estado | Prioridad |
|----|---------|-------------|--------|-----------|
| F10 | PWA / installable | Hacer la app instalable en móvil | Pendiente | Media |
| F11 | Más textos | Ampliar banco de textos por nivel | Pendiente | Alta |
| F12 | Estadísticas avanzadas | Gráficos de progreso por nivel y semana | Pendiente | Baja |
| F14 | Rate limit en `/api/correct` y `/api/correct-image` | Solo protegidos por `requireAuth`; sin límite de llamadas a la API de Anthropic (coste, no seguridad de datos) | Pendiente | Baja |
| F15 | Rotación de logs PM2 | `/var/dictats/logs/{out,err}-3.log` sin rotación configurada | Pendiente | Baja |
