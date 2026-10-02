// The NHL's 17 shot areas (NHL EDGE's shot-location breakdown), as rink
// geometry: classify a shot into one, or draw them.
//
// The NHL publishes per-area counts and save/shooting percentages by name
// ("Low Slot", "L Circle", ...) but not the areas' shapes. These boundaries
// are fitted to the NHL's own counts: for 30 NHL goalies' 2025-26 regular
// seasons (~69,000 shots on goal), classifying each shot's play-by-play
// coordinates with them puts on average 2.7% of a goalie's shots in a
// different area than the NHL counts there (at most 4.3%), the same on goalies
// held out of the fit as on the ones it was fitted to.
//
// Coordinates are the play-by-play feet this library uses everywhere
// (x -100..100, y -42.5..42.5, center ice at 0,0), with the shot ATTACKING
// RIGHT: the net is at x = 89. Flip a shot at the left net (x -> -x,
// y -> -y) before classifying it. "L" and "R" are the shooter's left and
// right facing that net -- the goalie's right and left -- which with y up
// is the top (+y) and bottom (-y) of the rink.

export const GOAL_LINE_X = 89;
export const BLUE_LINE_X = 25;
const BOARDS_Y = 42.5;
const END_X = 100;

// Fitted boundaries, in feet and degrees. Distances and angles are from the
// center of the goal line; 0 degrees points straight out from the net.
export const AREA_BOUNDS = {
  creaseR: 6, // the crease: within 6 ft, in front of the goal line
  innerR: 24, // low slot / net sides / inner outside: within 24 ft
  lowSlotDeg: 50, // low slot: within 50 degrees of straight out
  netSideDeg: 64, // net sides: 50-64 degrees; outside beyond
  highSlotDeg: 27, // past 24 ft: high slot within 27 degrees
  circleDeg: 52, // circles 27-52 degrees; outside beyond
  pointX: 50, // x below this (to the blue line): the points
  pointW: 14, // center point: |y| within 14 ft
  behindW: 14, // behind the net: |y| within 14 ft; corners outside
};

// name: the NHL's own area name, exactly as its data spells it.
// danger: the NHL's high/mid/long-range grouping; null for the rest.
export const SHOT_AREAS = [
  { name: 'Crease', danger: 'high' },
  { name: 'Low Slot', danger: 'high' },
  { name: 'L Net Side', danger: null },
  { name: 'R Net Side', danger: null },
  { name: 'High Slot', danger: 'mid' },
  { name: 'L Circle', danger: 'mid' },
  { name: 'R Circle', danger: 'mid' },
  { name: 'Outside L', danger: null },
  { name: 'Outside R', danger: null },
  { name: 'Center Point', danger: 'long' },
  { name: 'L Point', danger: 'long' },
  { name: 'R Point', danger: 'long' },
  { name: 'Behind the Net', danger: null },
  { name: 'L Corner', danger: null },
  { name: 'R Corner', danger: null },
  { name: 'Offensive Neutral Zone', danger: null },
  { name: 'Beyond Red Line', danger: null },
];

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * The NHL shot area a shot at (x, y) falls in, the shot attacking right
 * (net at x = 89). Returns one of SHOT_AREAS' names.
 */
export function shotArea(x, y) {
  const b = AREA_BOUNDS;
  const L = y > 0;
  if (x < 0) return 'Beyond Red Line';
  if (x < BLUE_LINE_X) return 'Offensive Neutral Zone';
  if (x > GOAL_LINE_X) {
    if (Math.abs(y) <= b.behindW) return 'Behind the Net';
    return L ? 'L Corner' : 'R Corner';
  }
  const d = GOAL_LINE_X - x;
  const r = Math.hypot(d, y);
  const deg = (Math.atan2(Math.abs(y), d) * 180) / Math.PI;
  if (r <= b.creaseR) return 'Crease';
  if (r <= b.innerR) {
    if (deg <= b.lowSlotDeg) return 'Low Slot';
    if (deg <= b.netSideDeg) return L ? 'L Net Side' : 'R Net Side';
    return L ? 'Outside L' : 'Outside R';
  }
  if (x >= b.pointX) {
    if (deg <= b.highSlotDeg) return 'High Slot';
    if (deg <= b.circleDeg) return L ? 'L Circle' : 'R Circle';
    return L ? 'Outside L' : 'Outside R';
  }
  if (Math.abs(y) <= b.pointW) return 'Center Point';
  return L ? 'L Point' : 'R Point';
}

// ── Geometry for drawing ─────────────────────────────────────────
// Each area as a polygon in feet (attacking right), for ShotAreaMap.
// Outlines run to the rink's straight edges; the rounded corners are left
// to a clip path.

// A point `r` ft from the center of the goal line, `deg` degrees off
// straight out, on side s (+1 L/top, -1 R/bottom).
const at = (r, deg, s = 1) => [GOAL_LINE_X - r * Math.cos(rad(deg)), s * r * Math.sin(rad(deg))];

function arc(r, from, to, s = 1, step = 3) {
  const pts = [];
  const n = Math.max(1, Math.ceil(Math.abs(to - from) / step));
  for (let i = 0; i <= n; i++) pts.push(at(r, from + ((to - from) * i) / n, s));
  return pts;
}

// Where a ray `deg` off straight out leaves the area past the inner ring:
// the line x = pointX, or the boards if it reaches them first.
function rayEnd(deg, s = 1) {
  const t = Math.tan(rad(deg));
  const toPointLine = GOAL_LINE_X - AREA_BOUNDS.pointX;
  if (toPointLine * t <= BOARDS_Y) return [AREA_BOUNDS.pointX, s * toPointLine * t];
  return [GOAL_LINE_X - BOARDS_Y / t, s * BOARDS_Y];
}

function sidePolygons(s) {
  const b = AREA_BOUNDS;
  const L = s > 0 ? 'L' : 'R';
  const [, highY] = rayEnd(b.highSlotDeg);
  const circleEnd = rayEnd(b.circleDeg, s);
  return {
    [`${L} Net Side`]: [...arc(b.innerR, b.lowSlotDeg, b.netSideDeg, s), ...arc(b.creaseR, b.netSideDeg, b.lowSlotDeg, s)],
    [`Outside ${L}`]: [
      ...arc(b.creaseR, 90, b.netSideDeg, s),
      ...arc(b.innerR, b.netSideDeg, b.circleDeg, s),
      circleEnd,
      [GOAL_LINE_X, s * BOARDS_Y],
    ],
    [`${L} Circle`]: [
      ...arc(b.innerR, b.highSlotDeg, b.circleDeg, s),
      circleEnd,
      ...(circleEnd[0] > b.pointX ? [[b.pointX, s * BOARDS_Y]] : []),
      [b.pointX, s * highY],
    ],
    [`${L} Point`]: [[BLUE_LINE_X, s * b.pointW], [b.pointX, s * b.pointW], [b.pointX, s * BOARDS_Y], [BLUE_LINE_X, s * BOARDS_Y]],
    [`${L} Corner`]: [[GOAL_LINE_X, s * b.behindW], [END_X, s * b.behindW], [END_X, s * BOARDS_Y], [GOAL_LINE_X, s * BOARDS_Y]],
  };
}

function buildPolygons() {
  const b = AREA_BOUNDS;
  const [, highY] = rayEnd(b.highSlotDeg);
  return {
    Crease: arc(b.creaseR, -90, 90),
    'Low Slot': [...arc(b.innerR, -b.lowSlotDeg, b.lowSlotDeg), ...arc(b.creaseR, b.lowSlotDeg, -b.lowSlotDeg)],
    'High Slot': [...arc(b.innerR, -b.highSlotDeg, b.highSlotDeg), [b.pointX, highY], [b.pointX, -highY]],
    'Center Point': [[BLUE_LINE_X, -b.pointW], [b.pointX, -b.pointW], [b.pointX, b.pointW], [BLUE_LINE_X, b.pointW]],
    'Behind the Net': [[GOAL_LINE_X, -b.behindW], [END_X, -b.behindW], [END_X, b.behindW], [GOAL_LINE_X, b.behindW]],
    'Offensive Neutral Zone': [[0, -BOARDS_Y], [BLUE_LINE_X, -BOARDS_Y], [BLUE_LINE_X, BOARDS_Y], [0, BOARDS_Y]],
    'Beyond Red Line': [[-END_X, -BOARDS_Y], [0, -BOARDS_Y], [0, BOARDS_Y], [-END_X, BOARDS_Y]],
    ...sidePolygons(1),
    ...sidePolygons(-1),
  };
}

/** Every area's outline as [[x, y], ...] in feet, attacking right. */
export const SHOT_AREA_POLYGONS = buildPolygons();

/** Where to put an area's label, in feet (attacking right). */
export const SHOT_AREA_LABEL_AT = {
  Crease: [86, 0],
  'Low Slot': [75, 0],
  'L Net Side': at(16, 57),
  'R Net Side': at(16, 57, -1),
  'High Slot': [58, 0],
  'L Circle': at(33, 40),
  'R Circle': at(33, 40, -1),
  'Outside L': [74, 36],
  'Outside R': [74, -36],
  'Center Point': [37.5, 0],
  'L Point': [37.5, 28],
  'R Point': [37.5, -28],
  'Behind the Net': [94.5, 0],
  'L Corner': [94.5, 26],
  'R Corner': [94.5, -26],
  'Offensive Neutral Zone': [12.5, 0],
  'Beyond Red Line': [-4.5, 0],
};
