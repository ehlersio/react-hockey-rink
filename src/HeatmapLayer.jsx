import { useMemo } from 'react';

const BANDWIDTH = 28; // px — controls blur radius; higher = smoother

/**
 * Kernel-density-estimation heat map, rendered as a canvas-generated PNG
 * inside the SVG. Pure 2D Gaussian kernel, no extra dependencies.
 */
export default function HeatmapLayer({ primaryEvents, opponentEvents, heatTeam, showHalf, flipPerspective = false, W, H, CX, CY }) {
  const dataUrl = useMemo(() => {
    let pts = [];
    if (heatTeam === 'primary' || heatTeam === 'both') {
      pts = pts.concat(primaryEvents.map(e => ({ x: e.x, y: e.y, isPrimary: true })));
    }
    if (heatTeam === 'opponent' || heatTeam === 'both') {
      pts = pts.concat(opponentEvents.map(e => ({ x: e.x, y: e.y, isPrimary: false })));
    }
    if (!pts.length) return null;

    // Canvas size: half-rink on mobile (W/2 × H), full rink otherwise
    const cw = showHalf ? W / 2 : W;
    const ch = H;
    const canvas = document.createElement('canvas');
    canvas.width  = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    const grid = new Float32Array(cw * ch);

    pts.forEach(({ x, y, isPrimary }) => {
      let nx = x, ny = y;
      if (!flipPerspective) {
        if (isPrimary  && nx < 0) { nx = -nx; ny = -ny; }
        if (!isPrimary && nx > 0) { nx = -nx; ny = -ny; }
      } else {
        if (!isPrimary && nx < 0) { nx = -nx; ny = -ny; }
        if (isPrimary  && nx > 0) { nx = -nx; ny = -ny; }
      }
      if (showHalf && nx < 0) return; // outside half-rink view

      const px = showHalf
        ? ((nx / 100) * (W / 2))           // 0-based for half-rink canvas
        : (CX + (nx / 100) * (W / 2));     // CX-based for full rink canvas
      const py = CY - (ny / 42.5) * (H / 2);

      const r = Math.ceil(BANDWIDTH * 2.5);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const gx = Math.round(px) + dx;
          const gy = Math.round(py) + dy;
          if (gx < 0 || gx >= cw || gy < 0 || gy >= ch) continue;
          const dist2 = dx * dx + dy * dy;
          const val   = Math.exp(-dist2 / (2 * BANDWIDTH * BANDWIDTH));
          grid[gy * cw + gx] += val;
        }
      }
    });

    let maxVal = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] > maxVal) maxVal = grid[i];
    if (maxVal === 0) return null;

    const imageData = ctx.createImageData(cw, ch);
    const d = imageData.data;

    const powered = new Float32Array(grid.length);
    for (let i = 0; i < grid.length; i++) {
      powered[i] = Math.pow(grid[i] / maxVal, 0.55); // < 1 = boost mid/high contrast
    }

    for (let i = 0; i < powered.length; i++) {
      const t = powered[i]; // 0..1 after power curve
      if (t < 0.08) continue; // skip very low density — reduces noise on white rink

      // Colour ramp designed for a white/light background:
      // low → deep blue, mid → gold/orange, high → bright red
      let r2, g, b, a;
      if (t < 0.3) {
        const s = t / 0.3;
        r2 = Math.round(20  + 20  * s);
        g  = Math.round(20  + 60  * s);
        b  = Math.round(160 + 40  * s);
        a  = Math.round(160 + 80  * s);
      } else if (t < 0.6) {
        const s = (t - 0.3) / 0.3;
        r2 = Math.round(40  + 215 * s);
        g  = Math.round(80  + 80  * s);
        b  = Math.round(200 - 200 * s);
        a  = Math.round(230 + 15  * s);
      } else if (t < 0.85) {
        const s = (t - 0.6) / 0.25;
        r2 = 255;
        g  = Math.round(160 - 140 * s);
        b  = 0;
        a  = 245;
      } else {
        const s = (t - 0.85) / 0.15;
        r2 = Math.round(255 - 50  * s);
        g  = Math.round(20  - 20  * s);
        b  = 0;
        a  = 255;
      }
      const base = i * 4;
      d[base]     = r2;
      d[base + 1] = g;
      d[base + 2] = b;
      d[base + 3] = Math.min(255, a);
    }

    ctx.putImageData(imageData, 0, 0);

    // Smooth the pixelated grid with a blur pass
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width  = cw;
    blurCanvas.height = ch;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = `blur(${Math.round(BANDWIDTH * 0.55)}px)`;
    blurCtx.drawImage(canvas, 0, 0);

    return blurCanvas.toDataURL('image/png');
  }, [primaryEvents, opponentEvents, heatTeam, showHalf, flipPerspective, W, H, CX, CY]);

  if (!dataUrl) return null;

  return (
    <image
      href={dataUrl}
      x={showHalf ? CX : 0}
      y={0}
      width={showHalf ? W / 2 : W}
      height={H}
      opacity={0.88}
      preserveAspectRatio="none"
    />
  );
}
