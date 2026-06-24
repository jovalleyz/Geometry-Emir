# Changelog — Geometry-Emir

Registro de cambios del proyecto. Esquema de versionado definido por el cliente:

- **`MAJOR`** (`1.x` → `2.x`): cambios **mayores** — nuevas fases del GDD, hitos grandes de producto.
- **`MEDIO`** (`1.0` → `1.1`): cambios **medios** — features significativas (un modo de juego, leaderboard, editor de niveles).
- **`MENOR`** (`1.1.0` → `1.1.1`): cambios **menores** — fixes, ajustes, pulido, tweaks.

Formato: `MAJOR.MEDIO.MENOR`. Las fechas usan formato ISO (YYYY-MM-DD).

---

## [Sin publicar]

---

## [1.1.0] — 2026-06-23

### Añadido — MVP jugable completo
- **Motor de juego:** game loop a 60 FPS con fixed timestep + render interpolado.
- **Modos:** Cube, Ship, Ball, Wave y UFO con física propia.
- **Portales:** cambio de modo, velocidad y gravedad. Orbes, jump-pads y monedas secretas.
- **Render neón (Canvas 2D):** parallax, estrellas, glow, partículas de muerte, pulso al BPM, estela del ícono, screen shake/flash.
- **Audio procedural (Web Audio API):** música electrónica sincronizada al BPM (kick/snare/hat/bajo/arpegio/lead por seed) + SFX (salto, orbe, pad, portal, coin, muerte, victoria).
- **4 niveles oficiales** (Stereo Rush, Neon Pulse, Voltage, Gravity Storm) — verificados 100% completables.
- **UI completa:** menú, selección de niveles, HUD (progreso/intentos/modo/coins), pausa, pantalla de victoria, leaderboard, ajustes, toasts.
- **Modo Práctica** con checkpoints automáticos y auto-retry estilo GD.
- **Firebase:** Auth (Google + Anónimo/invitado), scores y leaderboard en Firestore (con fallback local offline), perfil de usuario.
- **PWA:** instalable, offline vía service worker (Workbox), iconos neón generados.
- **Verificación automatizada** con Playwright (bot multimodo + capturas).

### Desplegado
- Firebase Hosting: https://geometry-emir.web.app
- Reglas de Firestore y Storage publicadas.

---

## [1.0.0] — 2026-06-23

### Añadido
- Inicialización del repositorio y estructura base del proyecto.
- Esquema de versionado y `CHANGELOG.md`.
- Memoria de proyecto (objetivo, stack, versionado).
- Configuración de build con Vite + `vite-plugin-pwa`.
- Configuración de Firebase (Hosting, Firestore rules/indexes, Storage rules).

## [1.0.0] — 2026-06-23

### Añadido
- Inicialización del repositorio y estructura base del proyecto.
- Esquema de versionado y `CHANGELOG.md`.
- Memoria de proyecto (objetivo, stack, versionado).
- Configuración de build con Vite + `vite-plugin-pwa`.
- Configuración de Firebase (Hosting, Firestore rules/indexes, Storage rules).

[Sin publicar]: https://github.com/jovalleyz/Geometry-Emir/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.1.0
[1.0.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.0.0
