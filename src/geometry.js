// NHL ice: 200ft x 85ft. Origin (0,0) = center ice.
// x: -100 (left goal) → +100 (right goal)
// y: -42.5 (bottom boards) → +42.5 (top boards)
export const W = 600;
export const H = 255;
export const CX = W / 2;
export const CY = H / 2;

// Convert NHL ice coords → SVG pixel coords
export function toSvg(x, y) {
  return {
    px: CX + (x / 100) * (W / 2),
    py: CY - (y / 42.5) * (H / 2),
  };
}

// Distance from goal mouth (right goal at x=89, y=0)
export function distFromGoal(x, y) {
  const dx = Math.abs(x) - 89;
  const dy = y;
  return Math.sqrt(dx * dx + dy * dy).toFixed(1);
}

// Zone label from coordinates
export function zoneLabel(x, y = 0) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  // Behind the net: x > 89 (goal line) — never the slot
  if (ax > 89) return 'Behind net';
  // Slot: in front of net, inside the faceoff dots
  // NHL: faceoff dots at x≈69, y≈±22; goal line at x=89
  // True slot = x 69–89, y within ±17 (tighter than dot width)
  if (ax > 69 && ay < 17) return 'Slot';
  // High slot: top of circles toward blue line, still central
  if (ax > 54 && ay < 17) return 'High slot';
  // Wider offensive zone areas (corners, half-wall)
  if (ax > 25) return 'Offensive zone';
  if (ax > 0)  return 'Neutral zone';
  return 'Defensive zone';
}
