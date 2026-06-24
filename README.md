<div align="center">

# ◈ Geometry-Emir ◈

**Rhythm-based neon auto-runner — un clon espiritual de Geometry Dash como PWA instalable.**

Vanilla JS + Canvas 2D · Web Audio API · Firebase · Vite

</div>

---

## 🎮 Qué es

Geometry-Emir es un plataformero de acción sincronizado al ritmo: controlas un ícono geométrico que avanza solo por niveles neón. Un toque ejecuta saltos, vuelos, cambios de gravedad y activaciones de vehículo según el modo activo. Cada muerte reinicia el nivel (o el último checkpoint en modo práctica).

Construido sobre el GDD [`georush_gdd.md`](./georush_gdd.md).

## ✨ Características (MVP)

- ⚙️ Motor propio: game loop a 60 FPS con *fixed timestep* + interpolación.
- 🟦 Modos de juego: **Cube, Ship, Ball, Wave, UFO**.
- 🌀 Portales: cambio de modo, velocidad y gravedad. Orbes, jump-pads y monedas secretas.
- 🎵 Música **procedural** sincronizada al BPM (Web Audio API) + efectos.
- 💥 Efectos neón: parallax, glow, partículas de muerte, pulso al beat.
- ☁️ Firebase: Auth (Google + invitado), scores y leaderboard en Firestore.
- 📱 PWA instalable, jugable offline.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Render | HTML5 Canvas 2D |
| Audio | Web Audio API (síntesis procedural) |
| Build | Vite + vite-plugin-pwa (Workbox) |
| Backend | Firebase Auth · Firestore · Hosting · Storage |
| Lenguaje | Vanilla JS (ES2022, módulos) |

## 🚀 Desarrollo

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo (Vite)
npm run build        # build de producción -> dist/
npm run preview      # previsualizar el build
npm run deploy       # build + deploy a Firebase Hosting
```

## 📦 Despliegue

El hosting se sirve desde `dist/` en el proyecto Firebase `geometry-emir`.

```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage   # reglas de seguridad
```

## 🗂️ Estructura

```
src/
├── core/      GameLoop, InputManager, AudioManager
├── game/      Game, Player, física y modos
├── levels/    formato de nivel, parser, niveles oficiales
├── ui/        pantallas (menú, level select, HUD, game over)
├── firebase/  config, auth, scores, leaderboard
└── utils/     constantes, helpers
```

## 🔖 Versionado

`MAJOR.MEDIO.MENOR` — mayores (fases), medios (features), menores (fixes). Ver [`CHANGELOG.md`](./CHANGELOG.md).

---

<div align="center">
<sub>🤖 Desarrollado con <a href="https://claude.com/claude-code">Claude Code</a></sub>
</div>
