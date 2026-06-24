# GeoRush — Game Design & Requirements Document
**Version 1.0 | Para Claude Code + Firebase**
**Clasificación: Documento de Requerimientos Completo**

---

## 0. Resumen Ejecutivo

**Nombre del juego:** GeoRush  
**Género:** Rhythm-based auto-runner / Plataformer de acción  
**Inspiración directa:** Geometry Dash (RobTop Games, 2013–2026)  
**Plataforma objetivo:** PWA (Progressive Web App) — Mobile-first, Desktop-compatible  
**Backend:** Firebase (Auth + Firestore + Hosting + Functions + Storage + FCM)  
**Stack frontend:** Vanilla JS + Canvas API (no frameworks pesados), Service Worker para offline  
**Motor de juego:** Custom game loop sobre `requestAnimationFrame` + Canvas 2D  
**Audiencia:** 12–30 años, jugadores casual-competitivo con afinidad por música electrónica  
**Modelo de monetización:** Freemium — cosméticos, niveles premium, sin pay-to-win  

---

## 1. Visión del Producto

GeoRush es un clon espiritual de Geometry Dash construido como PWA nativa. El jugador controla un ícono geométrico que avanza automáticamente por niveles generados con ritmo sincronizado a música electrónica. El toque/clic ejecuta saltos, cambios de gravedad, o activaciones de vehículo según el modo activo. Morir en cualquier obstáculo reinicia desde el inicio (o checkpoint en Practice Mode).

**Diferenciadores respecto al original:**
- PWA instalable — cero fricción de descarga
- Leaderboards globales en tiempo real (Firestore)
- Editor de niveles básico integrado (MVP) con compartir via URL
- IA generativa de sugerencias de obstáculos (Claude API) — feature premium
- Social: seguir jugadores, copiar niveles, challenges directos

---

## 2. Arquitectura de la Aplicación

### 2.1 Stack Tecnológico

```
FRONTEND
├── HTML5 Canvas API (game renderer)
├── Web Audio API (sincronización musical, efectos)
├── Service Worker (offline gameplay, caching de niveles)
├── IndexedDB (progreso local, niveles descargados)
├── Manifest.json (instalación PWA, splash screen)
└── Vanilla JS ES2022+ (modules, async/await)

BACKEND (Firebase)
├── Firebase Auth (Google, Email/Password, Anonymous)
├── Cloud Firestore (datos de usuario, niveles, scores)
├── Firebase Realtime DB (estado de sesión activa, presence)
├── Firebase Storage (assets de niveles, audio tracks)
├── Cloud Functions (validación de scores, ranking jobs)
├── Firebase Hosting (deploy PWA)
└── Firebase Cloud Messaging (notificaciones push)

IA (Opcional / Premium)
└── Claude API (claude-sonnet-4-6) — sugerencias de diseño de nivel
```

### 2.2 Estructura de Firestore

```
/users/{userId}
  ├── displayName: string
  ├── avatarUrl: string
  ├── iconKit: { cube, ship, color1, color2, trail }
  ├── stats: { totalAttempts, levelsCompleted, stars, moons, orbs }
  ├── achievements: [achievementId]
  ├── friends: [userId]
  ├── createdAt: timestamp
  └── lastActive: timestamp

/levels/{levelId}
  ├── name: string
  ├── authorId: string
  ├── authorName: string
  ├── difficulty: enum [auto, easy, normal, hard, harder, insane, demon]
  ├── stars: number (0–10)
  ├── musicTrack: { id, name, artist, url, bpm }
  ├── gameData: string (JSON comprimido del level layout)
  ├── isOfficial: boolean
  ├── isVerified: boolean
  ├── coins: [{ x, y, type }]  // 0–3 monedas secretas
  ├── plays: number
  ├── likes: number
  ├── publishedAt: timestamp
  └── tags: [string]

/scores/{levelId}/entries/{userId}
  ├── userId: string
  ├── displayName: string
  ├── bestPercent: number (0–100)
  ├── completed: boolean
  ├── attempts: number
  ├── normalCoins: number
  ├── secretCoins: number
  ├── updatedAt: timestamp
  └── replayHash: string (anti-cheat)

/leaderboard_cache/{levelId}
  ├── top100: [{ rank, userId, displayName, percent, timestamp }]
  └── updatedAt: timestamp

/events/{eventId}
  ├── type: enum [daily, weekly, challenge]
  ├── levelId: string
  ├── startAt: timestamp
  ├── endAt: timestamp
  └── reward: { orbs, diamonds, cosmetic }

/shop/{itemId}
  ├── type: enum [icon, trail, death_effect, color, ship, ball]
  ├── price: { orbs?: number, diamonds?: number }
  ├── unlockCondition?: string
  └── previewAsset: string
```

---

## 3. Mecánicas de Juego (Game Design)

### 3.1 Game Modes Implementables (por fase)

| Modo | MVP | V2 |
|------|-----|----|
| Cube (salto simple/hold) | ✅ | ✅ |
| Ship (vuelo vertical) | ✅ | ✅ |
| Ball (cambio de gravedad) | ✅ | ✅ |
| UFO (impulso por tap) | ✅ | ✅ |
| Wave (diagonal) | ✅ | ✅ |
| Robot (salto variable) | — | ✅ |
| Spider (teleport gravity) | — | ✅ |
| Swing Copter | — | ✅ |
| Platformer Mode | — | V3 |

### 3.2 Mecánicas Core (Fase MVP)

**Controles:**
- Desktop: `Space`, `Up Arrow`, `W`, `Click izquierdo` → acción principal
- Mobile: `Touch anywhere` → acción principal
- Doble tap: reservado para mecánicas especiales (robot)

**Física del Cube:**
- Auto-avance a velocidad constante (configurable por portal)
- Salto con altura fija: ~2.5 tiles
- Hold = salto sostenido (multi-jump hasta superficie)
- Colisión AABB (hitbox ligeramente más pequeña que el sprite visible)
- Gravedad: 9.8 tiles/s² (ajustable por portal)

**Portales y Triggers:**
- `Portal de modo`: cambia gamemode (cube → ship → ball, etc.)
- `Portal de velocidad`: 0.5x / 1x / 1.5x / 2x / 3x / 4x
- `Portal de gravedad`: invierte eje Y
- `Portal mini`: reduce tamaño del ícono (hitbox reducida)
- `Portal dual`: split-screen controlado simultáneamente
- `Portal de teletransporte`: salto de posición Y

**Obstáculos:**
- Spikes (triángulos simples — kill on contact)
- Bloques sólidos (plataforma y techo)
- Moving blocks (oscilación configurada en editor)
- Orbes (jump rings — requieren tap al pasar)
- Pads (jump pads — automáticos al tocar)
- Fake blocks (decorativos, sin colisión)

**Progresión en nivel:**
- Porcentaje de avance en tiempo real (0%–100%)
- Coins secretas (1–3 por nivel): activan rutas alternativas
- Completion = 100% sin morir (Normal Mode) o con checkpoints (Practice)

### 3.3 Sistema de Dificultad

```
N/A (sin rating) → Auto → Easy (1★) → Normal (2★) → Hard (3–4★)
→ Harder (5–6★) → Insane (7–8★) → Demon (9–10★)
  └── Easy Demon / Medium Demon / Hard Demon / Insane Demon / Extreme Demon
```

### 3.4 Monedas y Economía

| Moneda | Fuente | Uso |
|--------|--------|-----|
| **Stars** | Completar niveles rated | Unlock niveles, mostrar en perfil |
| **Moons** | Niveles Platformer | Unlock cosmetics especiales |
| **Orbs** | Daily rewards, completar | Comprar cosmetics en shop |
| **Diamonds** | Challenges, compra | Premium cosmetics |
| **Mana Orbs** | Drops en niveles | Abrir cofres secretos |

### 3.5 Ritmo y Audio

- **BPM detection**: extracción del BPM del track al subir audio
- **Beat markers**: el level editor puede snap-to-beat
- **Visual pulse**: el fondo y los efectos pulsan al BPM
- **Web Audio API**: tracks locales + streaming desde Firebase Storage
- **Formato recomendado**: OGG (fallback MP3) — max 10MB por track
- **Library de música**: NCS (NoCopyrightSounds) + tracks libres de derechos

---

## 4. Niveles Oficiales (MVP — 6 niveles)

| # | Nombre | Dificultad | Modos Usados | BPM aprox |
|---|--------|-----------|-------------|-----------|
| 1 | Stereo Rush | Auto | Cube | 140 |
| 2 | Back On Wave | Easy | Cube + Ship | 150 |
| 3 | Neon Pulse | Normal | Cube + Ball | 160 |
| 4 | Voltage | Hard | Cube + Ship + UFO | 175 |
| 5 | Gravity Storm | Harder | Cube + Ball + Wave | 185 |
| 6 | [DEMON] Zero Hour | Demon | Todos los modos | 200 |

---

## 5. Sistemas de Gamificación

### 5.1 Achievements (50 mínimo en MVP)

**Categorías:**
- **Progresión:** Completar X niveles, alcanzar X%
- **Skill:** Sin morir en primera intención, completar en <N intentos
- **Colección:** Recoger todas las coins de un nivel, unlock X íconos
- **Social:** Tener X seguidores, que tu nivel sea jugado X veces
- **Secretos:** Easter eggs en niveles, vault codes

**Ejemplos concretos:**
```
"First Blood"        — Completar tu primer nivel
"Persistent"         — 100 intentos en un mismo nivel
"Coin Hunter"        — Recolectar 10 secret coins totales
"Star Collector"     — Acumular 50 stars
"Level Creator"      — Publicar tu primer nivel
"Daily Grind"        — Login 7 días consecutivos
"Demon Slayer"       — Completar un nivel Demon
"Speed Runner"       — Completar un nivel en práctica y luego sin fallar
```

### 5.2 Daily & Weekly System

**Daily Level:**
- 1 nivel curado diferente cada día (rotación automática)
- Reward especial: +500 orbs + badge exclusivo de ese día
- Streak tracker: bonus por días consecutivos

**Weekly Demon:**
- Nivel extremo curado cada lunes
- Recompensa: cosmético exclusivo desbloqueado solo esa semana
- Aparece en sección especial del menú

**Challenge System:**
- Desafíos de 72h: alcanzar X% en un nivel específico
- Leaderboard temporal del challenge
- Reward: diamonds + badge temporal

### 5.3 Leaderboard Architecture

```
Global Leaderboard (por nivel):
  - Top 100 en Firestore (cached, actualizado cada 5 min via Cloud Function)
  - Posición exacta del usuario (server-side count query)
  - Filtros: Global / Amigos / País

Global Player Ranking:
  - Basado en: stars + completions + creator points
  - Actualizado diariamente via Cloud Function scheduled
  - Segmentado: Casual / Pro / Creator
```

### 5.4 Icon Kit & Customización

**Items desbloqueables:**
- 50 íconos cube (MVP: 10 iniciales)
- 20 íconos ship, ball, ufo, wave (5 cada uno MVP)
- 20 colores de primario/secundario
- 10 trail effects (estelas al moverse)
- 10 death effects (explosión al morir)
- 5 special effects (aura, glow, pulse)

**Unlock methods:**
- Stars acumuladas (progresión natural)
- Completar achievements específicos
- Compra con Orbs/Diamonds (sin pay-to-win en mecánicas)
- Eventos temporales (exclusivos de temporada)

---

## 6. Sistema Social

### 6.1 Perfiles de Jugador

```
URL: /player/{username}
Muestra:
  - Ícono actual con animación
  - Stats: stars, moons, coins, demons completados
  - Últimos niveles jugados
  - Niveles creados y publicados
  - Achievements desbloqueados
  - Rank global actual
```

### 6.2 Friends & Following

- Buscar por username
- Follow (asimétrico) o Friend request (simétrico)
- Feed de actividad: "X completó [Nivel]", "X publicó [Nivel]"
- Leaderboard de amigos en cada nivel

### 6.3 Level Sharing

- Cada nivel tiene URL única: `/level/{levelId}`
- Share via URL / QR code / copiar código
- Preview card con: nombre, autor, dificultad, plays, preview screenshot
- Embed preview para redes sociales (og:image generado en backend)

---

## 7. Level Editor (MVP Básico)

### 7.1 Funcionalidades MVP Editor

```
Canvas de edición:
  - Grid de 30x20 tiles visible
  - Scroll horizontal infinito
  - Zoom in/out
  - Snap-to-grid automático

Palette de objetos:
  - Bloques: solid, spike, moving block, orbe, pad
  - Portales: modo, velocidad, gravedad, mini
  - Triggers: color change, BG change, speed change

Herramientas:
  - Select + drag (mover objetos)
  - Delete
  - Copy/Paste
  - Undo/Redo (stack de 50 acciones)

Configuración del nivel:
  - Nombre, descripción
  - Seleccionar track musical
  - BG color + GND color
  - Dificultad sugerida

Testing:
  - Play desde editor (modo práctica automático)
  - Rewind a posición específica
  - Toggle hitboxes visibles

Publicación:
  - Validación mínima (tiene inicio y fin)
  - Submit para revisión (auto-approve si pasa heurísticas básicas)
  - Categorías/tags
```

### 7.2 IA en el Editor (Feature Premium — Claude API)

```javascript
// Integración Claude API en editor
POST /api/ai/suggest-obstacles
{
  "currentLayout": [...objects],  // 5 tiles de contexto
  "musicBPM": 150,
  "difficulty": "normal",
  "gameMode": "cube"
}

// Claude responde con sugerencias de objetos
// que se insertan como opciones visuales en el editor
```

**Casos de uso IA:**
- "Sugerir próximos 10 tiles" según patrón actual y BPM
- "Analizar dificultad" del nivel completo
- "Auto-generar decoración" para sección seleccionada
- "Balancear dificultad" — detectar spikes de muerte injustos

---

## 8. Flujos de Usuario (UX Flows)

### 8.1 Onboarding (First Time User)

```
1. Splash screen (logo animado al BPM) → 2s
2. "Tap anywhere to start" 
3. Tutorial interactivo:
   a. "Tap to jump" — primer spike simple
   b. "Hold to keep jumping" — secuencia de bloques
   c. "Reach the end!" — mini-nivel de 15 segundos
4. Selección de ícono inicial (3 opciones) + color
5. Crear cuenta O "Continue as Guest"
6. Si Guest: prompt suave en primer login "Save your progress!"
7. Pantalla principal del juego
```

### 8.2 Session Flow

```
Main Menu
├── Play → Level Select (Official / User Levels / Search)
│   └── Level Detail → Play → Game Over / Complete
│       ├── Game Over: intentos, % máximo, "Retry" / "Back"
│       └── Complete: stats, coins, rewards, share, "Next Level"
├── Profile → Ver stats, achievements, customize icon
├── Leaderboard → Global / Friends / Daily Challenge
├── Create → Level Editor
├── Shop → Cosmetics
└── Settings → Audio, notifications, account
```

### 8.3 Game Over Screen

```
- Porcentaje alcanzado (animado)
- Comparación con mejor intento personal
- Posición en leaderboard (si aplica)
- Número de intentos totales
- CTA: "Retry" (primary) / "Practice" / "Back"
- Easter egg: si llegas al 100% + morir en el portal final → mensaje especial
```

---

## 9. Requerimientos Técnicos del Motor de Juego

### 9.1 Game Loop

```javascript
// Target: 60 FPS locked, requestAnimationFrame
// Physics update: fixed timestep 16.67ms
// Render: interpolated

class GameLoop {
  constructor() {
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1000 / 60; // 16.67ms
  }
  
  tick(timestamp) {
    const delta = Math.min(timestamp - this.lastTime, 50); // cap a 50ms
    this.accumulator += delta;
    
    while (this.accumulator >= this.fixedStep) {
      this.physics.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
    
    const alpha = this.accumulator / this.fixedStep;
    this.renderer.render(alpha); // interpolación para suavidad
    
    this.lastTime = timestamp;
    requestAnimationFrame(this.tick.bind(this));
  }
}
```

### 9.2 Level Data Format

```json
{
  "version": 1,
  "meta": {
    "name": "Neon Pulse",
    "bpm": 160,
    "musicId": "track_001",
    "bgColor": "#001133",
    "gndColor": "#00FFCC",
    "speed": 1.0
  },
  "objects": [
    { "type": "block", "x": 10, "y": 0, "w": 1, "h": 1 },
    { "type": "spike", "x": 15, "y": 0, "rotation": 0 },
    { "type": "portal_ship", "x": 30, "y": 0 },
    { "type": "orb_yellow", "x": 45, "y": 3 },
    { "type": "coin_secret", "x": 60, "y": 5, "id": 1 }
  ],
  "triggers": [
    { "x": 20, "type": "bg_color", "color": "#003366", "duration": 0.5 },
    { "x": 40, "type": "speed", "value": 1.5 }
  ],
  "endX": 200
}
```

### 9.3 Anti-Cheat (Score Validation)

```
Client-side:
  - No exponer posición exacta de coins antes de llegar
  - Hash de replay (secuencia de inputs + timestamps)
  
Server-side (Cloud Function):
  - Validar que el tiempo de compleción sea físicamente posible
  - Validar que los inputs del replay reproduzcan el resultado declarado
  - Rate limiting: max 1 score submission por nivel cada 30s
  - Detección de outliers estadísticos (score imposiblemente alto)
  
Firebase Rules:
  - Usuarios no pueden escribir directamente en /scores
  - Solo Cloud Functions con admin SDK pueden validar y escribir scores
```

### 9.4 PWA Configuration

```json
// manifest.json
{
  "name": "GeoRush",
  "short_name": "GeoRush",
  "description": "Rhythm-based platformer. Tap to dash.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#000820",
  "theme_color": "#00FFCC",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/gameplay.png", "sizes": "1280x720", "type": "image/png" }
  ]
}
```

```javascript
// Service Worker — Cache Strategy
// Game assets (sprites, audio): Cache First
// API calls (scores, profiles): Network First con fallback offline
// Nivel data: Stale While Revalidate
// Workbox recomendado para gestión del SW
```

---

## 10. Diseño Visual & Identidad

### 10.1 Paleta de Color

```
PRIMARY (gameplay background): #000820 — Dark Navy, casi negro
ACCENT_1 (cyan neon — jump, coins): #00FFCC
ACCENT_2 (magenta — portales, events): #FF00AA  
ACCENT_3 (yellow — orbes, rewards): #FFD700
DANGER (spikes, death): #FF3333
GROUND (bloque base): #1A3A6B
GLOW (efecto neon): rgba(0,255,204,0.4) con CSS box-shadow
UI_BG: rgba(0,8,32,0.9) — panels con backdrop-blur
TEXT_PRIMARY: #FFFFFF
TEXT_SECONDARY: #8899BB
```

### 10.2 Tipografía

```
Display (títulos, score, %): "Press Start 2P" (Google Fonts) — pixelada, on-brand
Body (menus, descripiones): "Exo 2" (Google Fonts) — geométrica, clean
Mono (stats, debug): "JetBrains Mono" — datos técnicos
```

### 10.3 Visual Effects (Canvas)

```
- Parallax background: 3 capas a velocidades distintas
- Neon glow en obstáculos: shadow blur en canvas
- Pulse effect sincronizado al BPM: escala leve del BG (±2%)
- Death explosion: partículas radiales en color del ícono (40 partículas, 0.5s)
- Trail del ícono: últimas 8 posiciones con alpha decay
- Portal wave: efecto ripple al cruzar portal
- Screen flash: white flash 2 frames en muerte
- Stars en background: 50 puntos parpadeantes a velocidad 0.1x
```

### 10.4 UI Components

```
- Neon borders: 1px solid + box-shadow neon
- Botones: fondo sólido oscuro + border neon + hover glow
- Progress bar del nivel: barra en top del canvas, color según dificultad
- Percentage counter: esquina superior derecha, animado
- Attempt counter: esquina superior izquierda
- Coins colectadas: íconos en HUD
- Leaderboard cards: dark glass con avatar + rank badge
```

---

## 11. Sistema de Notificaciones (FCM)

### 11.1 Triggers de Notificación

```
Push Notifications (con permiso usuario):
  - "Daily level está disponible" (8am local)
  - "Tu nivel [X] fue jugado por 100 personas"
  - "Un amigo completó [nivel que te frustró]"
  - "Weekly Demon de esta semana: empieza ahora"
  - "Nuevo achievement desbloqueado"
  - "Alguien superó tu record en [nivel]"

In-App Notifications:
  - Badge counter en menú
  - Toast al desbloquear achievement (bottom de pantalla)
  - Toast al subir en leaderboard
```

---

## 12. Firebase Security Rules

### 12.1 Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users: solo el propio usuario puede escribir su perfil
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && !('stats' in request.resource.data) // stats solo via Functions
                   && !('achievements' in request.resource.data); // achievements solo via Functions
    }
    
    // Levels: cualquiera lee, autor puede editar los suyos (no publicados)
    match /levels/{levelId} {
      allow read: if true;
      allow create: if request.auth != null 
                    && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null 
                    && resource.data.authorId == request.auth.uid
                    && !resource.data.isVerified; // verificados son inmutables
      allow delete: if request.auth != null 
                    && resource.data.authorId == request.auth.uid
                    && !resource.data.isOfficial;
    }
    
    // Scores: solo lectura directa, escritura via Cloud Function
    match /scores/{levelId}/entries/{userId} {
      allow read: if true;
      allow write: if false; // SOLO Cloud Functions
    }
    
    // Leaderboard cache: solo lectura
    match /leaderboard_cache/{levelId} {
      allow read: if true;
      allow write: if false; // SOLO Cloud Functions
    }
  }
}
```

---

## 13. Cloud Functions Requeridas

### 13.1 Lista de Functions

```javascript
// 1. Score submission y validación
exports.submitScore = functions.https.onCall(async (data, context) => {
  // Valida auth
  // Valida replay hash
  // Valida tiempo físicamente posible
  // Escribe en /scores/{levelId}/entries/{userId}
  // Trigger update de leaderboard_cache si top 100
  // Actualiza stats del usuario (totalAttempts, completions, stars)
  // Evalúa achievements nuevos desbloqueados
});

// 2. Update leaderboard cache (trigger en scores)
exports.updateLeaderboardCache = functions.firestore
  .document('scores/{levelId}/entries/{userId}')
  .onWrite(async (change, context) => {
  // Recalcula top 100 para el nivel
  // Escribe en /leaderboard_cache/{levelId}
});

// 3. Daily level rotation (scheduled, 8am UTC)
exports.rotateDailyLevel = functions.pubsub
  .schedule('0 8 * * *').onRun(async () => {
  // Selecciona nivel del pool de candidatos
  // Crea evento en /events/daily_current
  // Envía FCM a todos los usuarios suscritos
});

// 4. Weekly demon rotation (scheduled, Monday 8am)
exports.rotateWeeklyDemon = functions.pubsub
  .schedule('0 8 * * 1').onRun(async () => {
  // Similar a daily pero con nivel Demon
  // Reward especial configurado
});

// 5. Global ranking update (scheduled, 2am UTC daily)
exports.updateGlobalRanking = functions.pubsub
  .schedule('0 2 * * *').onRun(async () => {
  // Recalcula ranking de jugadores basado en stars + completions + cp
  // Escribe en /global_ranking con rank por usuario
});

// 6. Level moderation heuristics (trigger en publicación)
exports.moderateLevel = functions.firestore
  .document('levels/{levelId}')
  .onUpdate(async (change, context) => {
  // Solo si isPublished cambia a true
  // Valida: tiene inicio y fin, no spam de objetos, nombre apropiado
  // Auto-approve o flag para revisión manual
});
```

---

## 14. Roadmap de Desarrollo

### Fase 1 — MVP Core (Semanas 1–6)
```
✅ Setup Firebase proyecto + Hosting + Auth
✅ PWA manifest + Service Worker básico
✅ Canvas game loop (60fps, fixed timestep)
✅ Cube mode con física básica (salto, gravedad, colisiones)
✅ Ship mode
✅ Ball mode
✅ Renderer con tiles, spikes, bloques
✅ 3 niveles oficiales hardcodeados
✅ Game Over / Complete flow
✅ Score básico guardado en Firestore
✅ Auth (Google + Anonymous)
✅ Perfil básico (username, stats)
```

### Fase 2 — Gamificación & Social (Semanas 7–10)
```
✅ Wave mode + UFO mode
✅ Portales de velocidad y gravedad
✅ Sistema de coins (normales y secretas)
✅ Leaderboard global por nivel (top 100)
✅ Sistema de achievements (primeros 20)
✅ Icon Kit básico (10 íconos + colores)
✅ Shop con orbs básico
✅ Daily Level system + FCM básico
✅ 3 niveles oficiales adicionales (total 6)
✅ Practice Mode con checkpoints
```

### Fase 3 — Level Editor & Community (Semanas 11–16)
```
✅ Level Editor MVP (grid, palette, test, publish)
✅ Búsqueda de niveles de usuario
✅ Sistema de likes y comentarios
✅ Perfiles públicos + following
✅ Weekly Demon + Challenge system
✅ Robot mode + Spider mode
✅ Más achievements (total 50)
✅ Cloud Functions anti-cheat
✅ Moderación de niveles
```

### Fase 4 — IA & Premium (Semanas 17–20)
```
✅ Claude API integrado en editor (sugerencias)
✅ IA de dificultad analysis
✅ Premium cosmetics (diamonds)
✅ Monetización (Google Ads SDK o IAP via web)
✅ Performance optimization (sprite sheets, audio pooling)
✅ Swing Copter mode
✅ Platformer Mode (experimental)
✅ Analytics avanzado (Firebase Analytics + eventos custom)
```

---

## 15. Métricas de Éxito (KPIs)

```
ENGAGEMENT:
  - D1 Retention: >40%
  - D7 Retention: >20%
  - D30 Retention: >10%
  - Session length promedio: >8 minutos
  - Sessions/day/user: >2

GAMEPLAY:
  - Tasa de completion nivel 1 (tutorial): >85%
  - Promedio de intentos por nivel: 15–50 (sweet spot de frustración positiva)
  - % usuarios que crean un nivel: >5%

MONETIZACIÓN:
  - ARPPU: $2–5 USD/mes
  - Conversión Free→Paying: >3%

VIRAL:
  - Niveles compartidos/semana: crecimiento 10%/semana
  - Orgánico (sin paid): >60% de nuevos usuarios
```

---

## 16. Consideraciones de Implementación para Claude Code

### 16.1 Estructura de Archivos del Proyecto

```
georush/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js (Service Worker)
│   ├── icons/ (192, 512, maskable)
│   └── screenshots/
├── src/
│   ├── core/
│   │   ├── GameLoop.js
│   │   ├── Physics.js
│   │   ├── Renderer.js
│   │   ├── AudioManager.js
│   │   └── InputManager.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── Obstacle.js
│   │   ├── Portal.js
│   │   ├── Orb.js
│   │   └── Coin.js
│   ├── modes/
│   │   ├── CubeMode.js
│   │   ├── ShipMode.js
│   │   ├── BallMode.js
│   │   ├── WaveMode.js
│   │   └── UFOMode.js
│   ├── levels/
│   │   ├── LevelLoader.js
│   │   ├── LevelParser.js
│   │   └── official/ (JSON niveles)
│   ├── ui/
│   │   ├── MainMenu.js
│   │   ├── LevelSelect.js
│   │   ├── HUD.js
│   │   ├── GameOver.js
│   │   ├── Profile.js
│   │   ├── Leaderboard.js
│   │   └── Shop.js
│   ├── editor/
│   │   ├── LevelEditor.js
│   │   ├── EditorCanvas.js
│   │   ├── ObjectPalette.js
│   │   └── AIAssistant.js (Claude API)
│   ├── firebase/
│   │   ├── config.js
│   │   ├── auth.js
│   │   ├── scores.js
│   │   ├── levels.js
│   │   ├── users.js
│   │   └── leaderboard.js
│   ├── systems/
│   │   ├── AchievementSystem.js
│   │   ├── EconomySystem.js
│   │   ├── NotificationSystem.js
│   │   └── AnalyticsSystem.js
│   └── utils/
│       ├── LevelCompressor.js
│       ├── BPMDetector.js
│       ├── AntiCheat.js
│       └── constants.js
├── functions/
│   ├── index.js (Cloud Functions)
│   ├── scoreValidator.js
│   ├── leaderboardUpdater.js
│   ├── scheduler.js
│   └── levelModerator.js
├── firebase.json
├── .firebaserc
├── firestore.rules
├── firestore.indexes.json
└── storage.rules
```

### 16.2 Configuración Firebase (firebase.json)

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000" }]
      },
      {
        "source": "/sw.js",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 16.3 Firestore Indexes Requeridos

```json
{
  "indexes": [
    {
      "collectionGroup": "scores",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "levelId", "order": "ASCENDING" },
        { "fieldPath": "bestPercent", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "levels",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isVerified", "order": "ASCENDING" },
        { "fieldPath": "plays", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "levels",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isVerified", "order": "ASCENDING" },
        { "fieldPath": "difficulty", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 16.4 Variables de Entorno

```bash
# .env (NO subir a git — usar Firebase Remote Config o env functions)
FIREBASE_PROJECT_ID=georush-prod
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=georush-prod.firebaseapp.com
FIREBASE_STORAGE_BUCKET=georush-prod.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxx
FIREBASE_APP_ID=xxx

# Claude API (solo en Cloud Functions — NUNCA en frontend)
CLAUDE_API_KEY=xxx
CLAUDE_MODEL=claude-sonnet-4-6
```

### 16.5 Nota Crítica de Seguridad

> **NUNCA exponer `CLAUDE_API_KEY` en código frontend.** Toda llamada a la Claude API debe ser proxied a través de una Cloud Function autenticada. El frontend llama a `functions.httpsCallable('getAISuggestion')` y la Function internamente llama a la API.

---

## 17. Criterios de Aceptación (Definition of Done)

### MVP Ready cuando:
1. El juego corre a 60fps estables en Chrome mobile (Pixel 7) y Desktop
2. Cube + Ship + Ball + Wave implementados con física correcta
3. 3 niveles oficiales completables de inicio a fin
4. Score submission funciona sin trampas obvias (validación básica)
5. Auth con Google + Guest funcionan
6. PWA instalable en Android e iOS (Safari)
7. Offline: si hay nivel cacheado, se puede jugar sin internet
8. Leaderboard carga en <2 segundos
9. 10 achievements funcionando
10. Level Editor puede publicar un nivel simple (solo bloques y spikes)

---

*Documento generado para uso exclusivo de Claude Code.*  
*Versión: 1.0 | Fecha: 2026-06-23*
