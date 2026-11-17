import * as THREE from 'three';

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Dhaka weathered asphalt road with yellow center divider & dusty tire edges
export function createDhakaAsphaltTexture(maxAnisotropy: number, repeatX = 1, repeatY = 26): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);

  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, size, size);

  // Subtle asphalt grain and dust near edges
  for (let i = 0; i < 6000; i++) {
    const x = (i * 79) % size;
    const y = (i * 151) % size;
    const edgeDust = x < 42 || x > size - 42 ? 14 : 0;
    const v = 30 + (i % 24) + edgeDust;
    ctx.fillStyle = `rgb(${v + 4},${v + 2},${v})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // White edge lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.fillRect(16, 0, 8, size);
  ctx.fillRect(size - 24, 0, 8, size);

  // Dashed lane lines
  ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
  for (let y = 16; y < size; y += 96) {
    ctx.fillRect(size / 2 - 5, y, 10, 52);
  }

  return finalizeColorTexture(canvas, maxAnisotropy, repeatX, repeatY);
}

// Dhaka red brick / concrete tiled footpath
export function createDhakaSidewalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);

  ctx.fillStyle = '#9b8d82';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alt = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = alt ? '#a68b7c' : '#948f89';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = 'rgba(41, 37, 36, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 4, 28);
}

// Dhaka black-and-white striped concrete road divider texture
export function createDhakaCurbStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const seg = 64;
  for (let y = 0; y < size; y += seg) {
    ctx.fillStyle = (y / seg) % 2 === 0 ? '#e2e8f0' : '#18181b';
    ctx.fillRect(0, y, size, seg);
  }
  return finalizeColorTexture(canvas, maxAnisotropy, 1, 22);
}

// Realistic Dhaka residential & commercial apartment facade (red brick / concrete + grilled balconies + flower pots + Bengali shop shutters)
export function createDhakaBuildingTexture(
  wallColor: string,
  accentBand: string,
  isBrick: boolean,
  litWindows: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const [canvas, ctx] = createCanvas(size);

  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, size, size);

  if (isBrick) {
    // Realistic varied Dhaka terracotta brick courses
    for (let y = 0; y < size; y += 20) {
      const offset = (y / 20) % 2 === 0 ? 0 : 22;
      for (let x = offset; x < size; x += 44) {
        if ((x + y) % 3 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(x, y, 42, 18);
        } else if ((x * 3 + y) % 5 === 0) {
          ctx.fillStyle = 'rgba(255,210,180,0.06)';
          ctx.fillRect(x, y, 42, 18);
        }
      }
      ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
      ctx.fillRect(0, y, size, 2);
    }
  } else {
    // Subtle Dhaka monsoon weathering streaks under ledges
    for (let x = 0; x < size; x += 36) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.055)';
      ctx.fillRect(x, 0, 14, size);
    }
  }

  // Floor separator concrete slabs
  ctx.fillStyle = accentBand;
  for (let y = 0; y < size; y += 256) {
    ctx.fillRect(0, y, size, 20);
  }

  const cols = 4;
  const rows = 4;
  const cw = size / cols;
  const ch = size / rows;

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cw + 34;
      const wy = r * ch + 40;
      const ww = cw - 68;
      const wh = ch - 76;

      // Balcony recess
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);

      // Sliding window glass with sky reflection
      if (litWindows && (r + c) % 2 === 0) {
        ctx.fillStyle = '#fde68a';
      } else {
        const grad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh * 0.72);
        grad.addColorStop(0, '#1e3a5f');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
      }
      ctx.fillRect(wx, wy, ww, wh * 0.72);

      // Window metal grill bars (classic Dhaka safety grill)
      ctx.fillStyle = '#334155';
      for (let gx = wx + 18; gx < wx + ww; gx += 26) {
        ctx.fillRect(gx, wy, 4, wh);
      }
      ctx.fillRect(wx, wy + wh * 0.45, ww, 5);

      // Concrete balcony railing at bottom
      ctx.fillStyle = accentBand;
      ctx.fillRect(wx - 8, wy + wh * 0.66, ww + 16, wh * 0.34);

      // Balcony potted plants (টব ও ফুলগাছ)
      if ((r + c) % 2 === 1) {
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(wx + 12, wy + wh * 0.56, 22, 16);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(wx + 23, wy + wh * 0.52, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outdoor AC unit on alternate balconies
      if ((r + c) % 3 === 1) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(wx + ww - 46, wy + wh * 0.68, 42, 30);
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(wx + ww - 30, wy + wh * 0.68 + 15, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Ground floor (row 3): Corrugated roll-down Dhaka shop shutters + Bengali shop signboards
  const shopNames = ['ঢাকা ফার্মেসি', 'স্বপ্ন স্টোর', 'মায়ের দোয়া', 'গুলশান মার্ট'];
  const gy = 3 * ch;
  for (let c = 0; c < cols; c++) {
    const sx = c * cw + 24;
    const sw = cw - 48;
    // Signboard strip
    ctx.fillStyle = c % 2 === 0 ? '#0f766e' : '#b91c1c';
    ctx.fillRect(sx, gy + 16, sw, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shopNames[c % shopNames.length], sx + sw / 2, gy + 43);

    // Shutter ribs
    ctx.fillStyle = '#475569';
    ctx.fillRect(sx, gy + 64, sw, ch - 72);
    ctx.fillStyle = '#334155';
    for (let sy = gy + 74; sy < gy + ch - 10; sy += 14) {
      ctx.fillRect(sx, sy, sw, 5);
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = createCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
