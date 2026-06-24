// Genera los iconos PWA de Geometry-Emir (cubo neón sobre navy) sin dependencias externas.
// PNG encoder mínimo basado en zlib (Node built-in).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const navy = [0, 8, 32];
  const navy2 = [8, 20, 56];
  const cyan = [0, 255, 204];
  const magenta = [255, 0, 170];
  const cx = size / 2, cy = size / 2;
  const R = size * 0.34;       // radio del diamante exterior
  const border = size * 0.055; // grosor del borde neón
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // fondo: gradiente radial navy
      const dr = Math.hypot(x - cx, y - cy) / (size * 0.7);
      let col = mix(navy2, navy, Math.min(1, dr));
      // diamante (rombo): distancia L1 rotada
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const d = dx + dy;
      if (d <= R) {
        if (d >= R - border) {
          col = cyan; // borde
        } else if (d >= R - border * 1.8) {
          col = mix(cyan, navy, 0.5); // glow interior
        } else {
          // relleno con leve gradiente cyan->magenta
          col = mix([0, 40, 38], mix(cyan, magenta, 0.15).map(v => v * 0.28), 1 - d / R);
        }
      } else if (d <= R + border * 1.2) {
        // halo glow externo
        const g = 1 - (d - R) / (border * 1.2);
        col = mix(col, cyan, g * 0.35);
      }
      buf[i] = Math.round(col[0]);
      buf[i + 1] = Math.round(col[1]);
      buf[i + 2] = Math.round(col[2]);
      buf[i + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), drawIcon(size));
  console.log(`icon-${size}.png`);
}
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180));
console.log('apple-touch-icon.png');

// favicon SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#000820"/>
  <g transform="rotate(45 32 32)">
    <rect x="16" y="16" width="32" height="32" rx="4" fill="none" stroke="#00FFCC" stroke-width="4"/>
    <rect x="24" y="24" width="16" height="16" rx="2" fill="#00FFCC" opacity="0.25"/>
  </g>
</svg>`;
writeFileSync(join(OUT, 'favicon.svg'), svg);
console.log('favicon.svg');
