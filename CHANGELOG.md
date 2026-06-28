# Changelog — Geometry-Emir

Registro de cambios del proyecto. Esquema de versionado definido por el cliente:

- **`MAJOR`** (`1.x` → `2.x`): cambios **mayores** — nuevas fases del GDD, hitos grandes de producto.
- **`MEDIO`** (`1.0` → `1.1`): cambios **medios** — features significativas (un modo de juego, leaderboard, editor de niveles).
- **`MENOR`** (`1.1.0` → `1.1.1`): cambios **menores** — fixes, ajustes, pulido, tweaks.

Formato: `MAJOR.MEDIO.MENOR`. Las fechas usan formato ISO (YYYY-MM-DD).

---

## [Sin publicar]

---

## [1.3.2] — 2026-06-28

### Cambiado
- En Ajustes se muestra el avatar del perfil (animado) con el nombre; al hacer clic abre la selección de avatars para cambiarlo.

---

## [1.3.1] — 2026-06-28

### Cambiado
- Al seleccionar un avatar ahora vuelve al menú con el avatar aplicado (+ aviso).
- El avatar elegido se muestra en la esquina superior derecha (junto al usuario); al tocarlo abre la selección.

---

## [1.3.0] — 2026-06-28

### Añadido
- **10 niveles oficiales** (antes 4): + City Lights, Stardust, Retrowave, Deep Cavern, Tidal y Final Rush [Demon]. Todos verificados 100% completables con bot multimodo (Playwright).
- **Sistema de avatars** (10) seleccionables con **caras animadas y gestos** estilo Geometry Dash: Classic, Devil (cuernos+colmillos), Happy, Cool (gafas), Robot (antena), Ghost, Ninja (banda), Star (ojos estrella), Toxic, Aqua. Parpadeo, boca que se abre al saltar, ojos. Pantalla de selección con previews animados + persistencia.
- **Fondos temáticos con parallax multicapa** que se desplazan según avanza el nivel: `city` (rascacielos + luna), `space` (planeta anillado + nebulosa), `synthwave` (sol retro + rejilla + montañas), `cave` (estalactitas + cristales), `ocean` (atardecer + mar). Cada nivel con su tema.
- 5 tracks musicales CC0 adicionales (9 en total).

### Cambiado
- **Arquitectura de render desacoplada** (interfaz `renderer`): `Canvas2DRenderer` (motor activo, verificado) y `PixiRenderer` (WebGL/PixiJS v8, disponible vía flag `USE_WEBGL` para reactivar en dispositivos con GPU verificable).

---

## [1.2.0] — 2026-06-23

### Añadido
- **Música real (CC0):** 5 tracks electrónicos de OpenGameArt (dominio público) — uno por nivel + menú — servidos desde Firebase Hosting con caché offline (Workbox CacheFirst).
- **Detección de beats en tiempo real** (AnalyserNode): el pulso visual se sincroniza con cualquier track por energía de graves. Sintetizador procedural conservado como *fallback* offline.
- **Pantalla completa en móvil:** canvas dimensionado al `visualViewport` real, soporte de *safe-area* (notch), modo inmersivo (Fullscreen API + bloqueo a horizontal) al jugar, y botón manual en Ajustes.
- Layout responsive para pantallas bajas (landscape de móvil) con *media query* compacto; pantallas con scroll.

### Corregido
- **Salto por toque/clic no funcionaba:** el HUD a pantalla completa interceptaba los punteros (regla CSS) → ahora `pointer-events: none`. Verificado con mouse y touch.
- El cubo ahora salta también con el *flanco* de pulsación (tap rápido), no solo manteniendo pulsado.
- Condición de carrera: un evento tardío de auth re-renderizaba el menú sobre otras pantallas → se rastrea la pantalla actual.

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

[Sin publicar]: https://github.com/jovalleyz/Geometry-Emir/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.3.2
[1.3.1]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.3.1
[1.3.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.3.0
[1.2.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.2.0
[1.1.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.1.0
[1.0.0]: https://github.com/jovalleyz/Geometry-Emir/releases/tag/v1.0.0
