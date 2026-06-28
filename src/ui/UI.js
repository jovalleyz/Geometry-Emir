// UI — gestiona todas las pantallas DOM sobre el canvas.
import { el, formatPercent } from '../utils/helpers.js';
import { DIFFICULTY } from '../utils/constants.js';
import { drawAvatarPreview } from '../game/Avatars.js';

export class UI {
  constructor(root, ctl) {
    this.root = root;
    this.ctl = ctl;            // controlador inyectado desde main.js
    this.hudRefs = null;
    this.current = null;       // pantalla actual (para evitar re-render indeseado)
  }

  clear() { if (this._avRaf) { cancelAnimationFrame(this._avRaf); this._avRaf = null; } this.root.innerHTML = ''; this.hudRefs = null; }

  _topBar() {
    const a = this.ctl.getAuth();
    const name = a.user ? (a.profile?.displayName || a.user.displayName || 'Invitado') : '—';
    const av = this.ctl.getAvatar();
    const avCanvas = el('canvas', { width: '44', height: '44', class: 'topbar-avatar', title: `Avatar: ${av.name}`, onClick: () => this.showAvatars() });
    drawAvatarPreview(avCanvas.getContext('2d'), av, 22, 23, 32, { t: performance.now() / 1000 });
    return el('div', { class: 'top-bar' },
      avCanvas,
      el('span', { class: 'user-chip' }, a.user ? `👤 ${name}` : '👤 ...'),
      el('button', { class: 'btn small secondary', onClick: () => this.showSettings() }, '⚙'),
    );
  }

  // ---------- MENÚ PRINCIPAL ----------
  showMenu() {
    this.clear(); this.current = 'menu';
    const a = this.ctl.getAuth();
    const header = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' } },
      el('div', { class: 'logo', html: 'GEOMETRY<br><span class="em">EMIR</span>' }),
      el('div', { class: 'subtitle' }, 'Neon Rhythm Runner'),
    );
    const body = a.user
      ? el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', marginTop: '18px' } },
          el('button', { class: 'btn', onClick: () => this.showLevelSelect() }, '▶ Jugar'),
          el('button', { class: 'btn secondary', onClick: () => this.showAvatars() }, '🎭 Avatars'),
          el('button', { class: 'btn gold', onClick: () => this.showLeaderboardPicker() }, '🏆 Leaderboard'),
          el('button', { class: 'btn secondary', onClick: () => this.showSettings() }, '⚙ Ajustes'),
          el('button', { class: 'btn small secondary', style: { marginTop: '4px', opacity: '0.8' }, onClick: () => this.ctl.exitApp() }, '⏏ Salir del juego'),
          el('div', { class: 'hint', style: { marginTop: '8px' } }, 'Toca / Click / Espacio para saltar. Cruza los portales para cambiar de modo.'),
        )
      : el('div', { class: 'panel', style: { maxWidth: '380px', marginTop: '20px' } },
          el('h2', {}, 'Bienvenido'),
          el('p', { class: 'hint', style: { marginBottom: '18px' } }, 'Inicia sesión para guardar tu progreso y competir en el leaderboard global.'),
          el('div', { class: 'btn-row', style: { flexDirection: 'column' } },
            el('button', { class: 'btn', onClick: async () => { await this.ctl.signInGoogle().catch(() => this.toast('Error con Google')); this.showMenu(); } }, '🔓 Entrar con Google'),
            el('button', { class: 'btn secondary', onClick: async () => { await this.ctl.signInGuest(); this.showMenu(); } }, '👻 Jugar como invitado'),
          ),
        );
    const screen = el('div', { class: 'screen' }, header, body, this._topBar());
    this.root.appendChild(screen);
  }

  // ---------- SELECCIÓN DE NIVEL ----------
  showLevelSelect() {
    this.clear(); this.current = 'levels';
    const cards = this.ctl.levels.map((lv) => {
      const d = DIFFICULTY[lv.difficulty];
      const score = this.ctl.scores.getLocalScore(lv.id);
      const totalCoins = lv.objects.filter((o) => o.type === 'coin').length;
      const gotCoins = score?.coins?.length || 0;
      const coinDots = el('div', { class: 'coins-row' },
        ...Array.from({ length: totalCoins }, (_, i) => el('span', { class: `coin-dot ${i < gotCoins ? 'on' : ''}` })));
      return el('div', { class: 'level-card', style: { borderColor: d.color, boxShadow: `0 0 12px ${d.color}55` }, onClick: () => this.ctl.startLevel(lv.id, { practice: false }) },
        score?.completed ? el('div', { class: 'best' }, '✔') : el('div', { class: 'best' }, score ? formatPercent(score.bestPercent) : ''),
        el('h3', { style: { color: d.color } }, lv.name),
        el('span', { class: 'diff', style: { background: d.color + '22', color: d.color } }, `${d.label} · ${'★'.repeat(Math.min(5, d.stars))}`),
        el('div', { class: 'meta' }, el('span', {}, `♪ ${lv.bpm} BPM`), el('span', {}, `◇ ${totalCoins} coins`)),
        totalCoins ? coinDots : null,
        el('div', { class: 'btn-row', style: { marginTop: '12px' } },
          el('button', { class: 'btn small', onClick: (e) => { e.stopPropagation(); this.ctl.startLevel(lv.id, { practice: false }); } }, 'Jugar'),
          el('button', { class: 'btn small secondary', onClick: (e) => { e.stopPropagation(); this.ctl.startLevel(lv.id, { practice: true }); } }, 'Práctica'),
        ),
      );
    });
    const screen = el('div', { class: 'screen' },
      el('div', { class: 'back-link', onClick: () => this.showMenu() }, '← Menú'),
      el('div', { class: 'logo', style: { fontSize: '26px' } }, 'Niveles'),
      el('div', { class: 'levels-grid' }, ...cards),
    );
    this.root.appendChild(screen);
  }

  // ---------- AVATARS ----------
  showAvatars() {
    this.clear(); this.current = 'avatars';
    const selId = this.ctl.getAvatar().id;
    const cards = this.ctl.avatars.map((av) => {
      const canvas = el('canvas', { width: '120', height: '104', class: 'avatar-canvas' });
      const card = el('div', { class: `level-card avatar-card ${av.id === selId ? 'selected' : ''}`, style: { textAlign: 'center', borderColor: av.c1 }, onClick: () => { this.ctl.setAvatar(av.id); this.showMenu(); this.toast(`Avatar: ${av.name} ✔`); } },
        canvas, el('h3', { style: { color: av.c1, fontSize: '16px', marginTop: '6px' } }, av.name),
        av.id === selId ? el('div', { class: 'diff', style: { background: av.c1 + '22', color: av.c1 } }, '✔ Elegido') : null,
      );
      card._canvas = canvas; card._av = av;
      return card;
    });
    this.root.appendChild(el('div', { class: 'screen' },
      el('div', { class: 'back-link', onClick: () => this.showMenu() }, '← Menú'),
      el('div', { class: 'logo', style: { fontSize: '24px' } }, 'Elige tu Avatar'),
      el('div', { class: 'hint' }, 'Tienen gestos y reaccionan al saltar.'),
      el('div', { class: 'levels-grid' }, ...cards),
    ));
    const draw = () => {
      const t = performance.now() / 1000;
      for (const c of cards) {
        const ctx = c._canvas.getContext('2d');
        ctx.clearRect(0, 0, 120, 104);
        const excited = (t * 1.3 + (c._av.id.length)) % 2.6 < 0.5;
        drawAvatarPreview(ctx, c._av, 60, 52, 62, { t, excited });
      }
      this._avRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  // ---------- HUD EN JUEGO ----------
  showHUD(level) {
    this.clear(); this.current = 'hud';
    const fill = el('div', { class: 'progress-fill' });
    const pct = el('div', { class: 'progress-pct' }, '0%');
    const attempts = el('div', { class: 'attempts' }, 'Intento 1');
    const modeTag = el('div', { class: 'mode-tag' }, 'CUBE');
    const coins = el('div', { class: 'coins-hud' });
    const hud = el('div', { class: 'hud' },
      el('div', { class: 'progress-wrap' }, el('div', { class: 'progress-bar' }, fill), pct),
      attempts, modeTag, coins,
      el('button', { class: 'pause-btn', onClick: () => this.ctl.pause() }, '❚❚'),
    );
    this.root.appendChild(hud);
    this.hudRefs = { fill, pct, attempts, modeTag, coins, level };
    if (level.practice) attempts.textContent = 'Práctica';
  }

  updateProgress(p) { if (this.hudRefs) { this.hudRefs.fill.style.width = `${p}%`; this.hudRefs.pct.textContent = formatPercent(p); } }
  setAttempts(n) { if (this.hudRefs && !this.hudRefs.level.practice) this.hudRefs.attempts.textContent = `Intento ${n}`; }
  setMode(m) { if (this.hudRefs) this.hudRefs.modeTag.textContent = m.toUpperCase(); }
  setCoins(collected, total) {
    if (!this.hudRefs || !total) return;
    this.hudRefs.coins.innerHTML = '';
    for (let i = 0; i < total; i++) this.hudRefs.coins.appendChild(el('span', { class: `coin-dot ${i < collected ? 'on' : ''}` }));
  }

  // ---------- PAUSA ----------
  showPause(stats) {
    const overlay = el('div', { class: 'screen' },
      el('div', { class: 'panel' },
        el('h2', {}, 'Pausa'),
        el('div', { class: 'stats-grid' },
          stat('Progreso', formatPercent(stats.progress)),
          stat('Mejor', formatPercent(stats.best)),
          stat('Intentos', stats.attempts),
          stat('Modo', stats.practice ? 'Práctica' : 'Normal'),
        ),
        el('div', { class: 'btn-row', style: { flexDirection: 'column' } },
          el('button', { class: 'btn', onClick: () => { overlay.remove(); this.ctl.resume(); } }, '▶ Continuar'),
          el('button', { class: 'btn secondary', onClick: () => { overlay.remove(); this.ctl.retry(); } }, '↻ Reiniciar'),
          el('button', { class: 'btn gold', onClick: () => { overlay.remove(); this.ctl.togglePractice(); } }, stats.practice ? '🎮 Modo Normal' : '🎯 Modo Práctica'),
          el('button', { class: 'btn secondary', onClick: () => { overlay.remove(); this.ctl.exitToMenu(); } }, '☰ Salir al menú'),
          el('button', { class: 'btn small secondary', style: { opacity: '0.8' }, onClick: () => { overlay.remove(); this.ctl.exitApp(); } }, '⏏ Salir del juego'),
        ),
      ),
    );
    this.root.appendChild(overlay);
    this._pauseOverlay = overlay;
  }
  closePause() { this._pauseOverlay?.remove(); this._pauseOverlay = null; }

  // ---------- COMPLETADO ----------
  showComplete(result, level) {
    this.clear(); this.current = 'complete';
    const totalCoins = level.objects.filter((o) => o.type === 'coin').length;
    const screen = el('div', { class: 'screen' },
      el('div', { class: 'panel' },
        el('h2', { class: 'win' }, '¡NIVEL COMPLETADO!'),
        el('div', { class: 'logo', style: { fontSize: '20px', marginBottom: '14px' } }, level.name),
        el('div', { class: 'stats-grid' },
          stat('Progreso', '100%'),
          stat('Intentos', result.attempts),
          stat('Coins', `${result.coins.length}/${totalCoins}`),
          stat('Dificultad', DIFFICULTY[level.difficulty].label),
        ),
        el('div', { class: 'btn-row' },
          this.ctl.hasNext(level.id) ? el('button', { class: 'btn', onClick: () => this.ctl.nextLevel(level.id) }, '▶ Siguiente') : null,
          el('button', { class: 'btn secondary', onClick: () => this.ctl.retry() }, '↻ Repetir'),
          el('button', { class: 'btn gold', onClick: () => this.showLeaderboard(level.id) }, '🏆 Ranking'),
          el('button', { class: 'btn secondary', onClick: () => this.showLevelSelect() }, '☰ Niveles'),
        ),
      ),
    );
    this.root.appendChild(screen);
  }

  // ---------- LEADERBOARD ----------
  async showLeaderboard(levelId) {
    this.clear(); this.current = 'leaderboard';
    const level = this.ctl.levels.find((l) => l.id === levelId);
    const list = el('div', { class: 'lb-list' }, el('div', { class: 'hint' }, 'Cargando…'));
    const screen = el('div', { class: 'screen' },
      el('div', { class: 'back-link', onClick: () => this.showLevelSelect() }, '← Niveles'),
      el('div', { class: 'panel' },
        el('h2', {}, '🏆 Ranking'),
        el('div', { class: 'logo', style: { fontSize: '18px', marginBottom: '14px' } }, level?.name || levelId),
        list,
        el('button', { class: 'btn secondary', onClick: () => this.showLevelSelect() }, 'Volver'),
      ),
    );
    this.root.appendChild(screen);
    const rows = await this.ctl.scores.getLeaderboard(levelId, 50);
    const myUid = this.ctl.getAuth().user?.uid;
    list.innerHTML = '';
    if (!rows.length) { list.appendChild(el('div', { class: 'hint' }, 'Aún no hay registros. ¡Sé el primero!')); return; }
    rows.forEach((r, i) => {
      list.appendChild(el('div', { class: `lb-row ${r.userId === myUid ? 'me' : ''}` },
        el('span', { class: 'rank' }, `#${i + 1}`),
        el('span', { class: 'name' }, r.displayName || 'Player'),
        el('span', { class: 'pct' }, `${r.completed ? '✔ ' : ''}${formatPercent(r.bestPercent)}`),
      ));
    });
  }

  showLeaderboardPicker() {
    this.clear(); this.current = 'lbpicker';
    const cards = this.ctl.levels.map((lv) =>
      el('div', { class: 'level-card', onClick: () => this.showLeaderboard(lv.id) },
        el('h3', { style: { color: DIFFICULTY[lv.difficulty].color } }, lv.name),
        el('div', { class: 'meta' }, el('span', {}, 'Ver ranking →')),
      ));
    this.root.appendChild(el('div', { class: 'screen' },
      el('div', { class: 'back-link', onClick: () => this.showMenu() }, '← Menú'),
      el('div', { class: 'logo', style: { fontSize: '24px' } }, '🏆 Leaderboards'),
      el('div', { class: 'levels-grid' }, ...cards),
    ));
  }

  // ---------- AJUSTES ----------
  showSettings() {
    this.clear(); this.current = 'settings';
    const a = this.ctl.getAuth();
    const music = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: this.ctl.audio.musicVol });
    const sfx = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: this.ctl.audio.sfxVol });
    music.addEventListener('input', () => this.ctl.audio.setMusicVol(parseFloat(music.value)));
    sfx.addEventListener('input', () => this.ctl.audio.setSfxVol(parseFloat(sfx.value)));
    const authBtn = a.user
      ? el('button', { class: 'btn secondary', onClick: async () => { await this.ctl.signOut(); this.showSettings(); } }, `Cerrar sesión (${a.profile?.displayName || 'Invitado'})`)
      : el('button', { class: 'btn', onClick: async () => { await this.ctl.signInGoogle().catch(() => this.toast('Error')); this.showSettings(); } }, 'Entrar con Google');
    // Perfil: avatar (clic -> cambiar).
    const av = this.ctl.getAvatar();
    const avCanvas = el('canvas', { width: '76', height: '76', class: 'settings-avatar' });
    const profileRow = el('div', { class: 'profile-row', title: 'Cambiar avatar', onClick: () => this.showAvatars() },
      avCanvas,
      el('div', { class: 'profile-info' },
        el('div', { class: 'profile-name' }, a.profile?.displayName || (a.user ? 'Invitado' : '—')),
        el('div', { class: 'profile-sub' }, `Avatar: ${av.name}  ·  cambiar ▸`),
      ),
    );
    this.root.appendChild(el('div', { class: 'screen' },
      el('div', { class: 'back-link', onClick: () => this.showMenu() }, '← Menú'),
      el('div', { class: 'panel' },
        el('h2', {}, 'Ajustes'),
        profileRow,
        el('div', { class: 'setting-row' }, el('label', {}, 'Música'), music),
        el('div', { class: 'setting-row' }, el('label', {}, 'Efectos'), sfx),
        el('div', { style: { marginTop: '6px' } }, el('button', { class: 'btn gold', onClick: () => this.ctl.fullscreen() }, '⛶ Pantalla completa')),
        el('div', { style: { marginTop: '10px' } }, authBtn),
        el('div', { class: 'hint', style: { marginTop: '18px' } }, 'Geometry-Emir · PWA instalable. Añádela a tu pantalla de inicio.'),
      ),
    ));
    const actx = avCanvas.getContext('2d');
    const draw = () => {
      const t = performance.now() / 1000;
      actx.clearRect(0, 0, 76, 76);
      drawAvatarPreview(actx, av, 38, 40, 56, { t, excited: (t * 1.3) % 2.6 < 0.5 });
      this._avRaf = requestAnimationFrame(draw);
    };
    draw();
  }

  // ---------- TOAST ----------
  toast(msg, ms = 2200) {
    let wrap = this.root.querySelector('.toast-wrap');
    if (!wrap) { wrap = el('div', { class: 'toast-wrap' }); this.root.appendChild(wrap); }
    const t = el('div', { class: 'toast' }, msg);
    wrap.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
}

function stat(label, value) {
  return el('div', { class: 'stat' }, el('div', { class: 'label' }, label), el('div', { class: 'value' }, String(value)));
}
