import { W, H, CX, CY } from './geometry.js';

/**
 * Pixel-accurate NHL rink markings (ice surface, lines, creases, trapezoid,
 * goal frames, faceoff circles/dots/hash-marks/restraint-lines, zone labels).
 * Renders into a 600x255 SVG viewBox — see geometry.js for the shared
 * coordinate system used by HockeyRink and HeatmapLayer.
 */
export default function RinkMarkings({ showHalf, flipPerspective = false, teamAbbr = 'TEAM', teamColor }) {
  return (
    <g>
      {/* ── Rink surface (corner radius 28ft = 84px) ── */}
      <rect width={W} height={H} rx={84} ry={84} fill="#d6eaf5" stroke="#9ab8cc" strokeWidth="1.5"/>

      {/* ── Center line (red) ── */}
      <line x1={CX} y1="0" x2={CX} y2={H} stroke="#cc2200" strokeWidth="3" opacity="0.5"/>

      {/* ── Blue lines (75px = 25ft from center) ── */}
      <line x1={CX-75} y1="0" x2={CX-75} y2={H} stroke="#2255aa" strokeWidth="3" opacity="0.55"/>
      <line x1={CX+75} y1="0" x2={CX+75} y2={H} stroke="#2255aa" strokeWidth="3" opacity="0.55"/>

      {/* ── Goal lines (33px = 11ft from end boards; y-span clipped to where the
           84px-radius corner arc actually is at that x, not a fixed inset —
           full straight-edge length would poke out past the curved boards) ── */}
      <line x1="33" y1={CY-110.25} x2="33" y2={CY+110.25} stroke="#cc2200" strokeWidth="1.5" opacity="0.6"/>
      <line x1={W-33} y1={CY-110.25} x2={W-33} y2={CY+110.25} stroke="#cc2200" strokeWidth="1.5" opacity="0.6"/>

      {/* ── Goal creases (NHL: 8ft wide at the goal line = ±12px, straight sides run
           6ft-radius-minus-4ft-half-width = sqrt(6²-4²)=√20ft ≈ 13.42px deep before
           curving into the 6ft-radius (18px) arc capped at the goal line's midpoint) ── */}
      <path d={`M 33 ${CY-12} L 46.42 ${CY-12} A 18 18 0 0 1 46.42 ${CY+12} L 33 ${CY+12}`}
        fill="rgba(68,119,238,0.15)" stroke="#2255aa" strokeWidth="1"/>
      <path d={`M ${W-33} ${CY-12} L ${W-46.42} ${CY-12} A 18 18 0 0 0 ${W-46.42} ${CY+12} L ${W-33} ${CY+12}`}
        fill="rgba(204,34,0,0.12)" stroke="#cc2200" strokeWidth="1"/>

      {/* ── Goaltender's restricted area ("trapezoid"): 22ft wide at goal line (±33px),
           28ft wide at the boards (±42px), 11ft deep (goal line to boards) ── */}
      <line x1="33" y1={CY-33} x2="0" y2={CY-42} stroke="#cc2200" strokeWidth="1" opacity="0.5"/>
      <line x1="33" y1={CY+33} x2="0" y2={CY+42} stroke="#cc2200" strokeWidth="1" opacity="0.5"/>
      <line x1={W-33} y1={CY-33} x2={W} y2={CY-42} stroke="#cc2200" strokeWidth="1" opacity="0.5"/>
      <line x1={W-33} y1={CY+33} x2={W} y2={CY+42} stroke="#cc2200" strokeWidth="1" opacity="0.5"/>

      {/* ── Goal frames (6ft wide=18px, 4ft deep=12px) ── */}
      <rect x="21" y={CY-9} width="12" height="18" fill="none" stroke="#2255aa" strokeWidth="1.5"/>
      <rect x={W-33} y={CY-9} width="12" height="18" fill="none" stroke="#cc2200" strokeWidth="1.5"/>

      {/* ── Center face-off circle (15ft radius = 45px) ── */}
      <circle cx={CX} cy={CY} r="45" fill="none" stroke="#9ab8cc" strokeWidth="1.2" opacity="0.7"/>
      <circle cx={CX} cy={CY} r="3" fill="#cc2200"/>

      {/* ── Zone face-off circles (15ft radius=45px, 20ft from goal line=60px, 22ft from centerline=66px) ── */}
      {/* Left zone (opponent) — cx=33+60=93, cy=CY±66 */}
      <circle cx="93" cy={CY-66} r="3" fill="#cc3333"/>
      <circle cx="93" cy={CY+66} r="3" fill="#cc3333"/>
      <circle cx="93" cy={CY-66} r="45" fill="none" stroke="#cc3333" strokeWidth="1" opacity="0.4"/>
      <circle cx="93" cy={CY+66} r="45" fill="none" stroke="#cc3333" strokeWidth="1" opacity="0.4"/>

      {/* Right zone (primary team) */}
      <circle cx={W-93} cy={CY-66} r="3" fill="#cc3333"/>
      <circle cx={W-93} cy={CY+66} r="3" fill="#cc3333"/>
      <circle cx={W-93} cy={CY-66} r="45" fill="none" stroke="#cc3333" strokeWidth="1" opacity="0.4"/>
      <circle cx={W-93} cy={CY+66} r="45" fill="none" stroke="#cc3333" strokeWidth="1" opacity="0.4"/>

      {/* ── End-zone hash marks (2ft long, parallel to goal line, entirely OUTSIDE the
           circle — starting at the circle's own top/bottom tangent point (±15ft=45px
           from center) and extending 2ft further out, not straddling the boundary;
           pair spacing 5ft7in=16.75px) ── */}
      {[[93, CY-66], [93, CY+66], [W-93, CY-66], [W-93, CY+66]].map(([ccx, ccy], i) => (
        <g key={`hash-${i}`}>
          <line x1={ccx-8.375} y1={ccy-45} x2={ccx-8.375} y2={ccy-51} stroke="#cc3333" strokeWidth="1.25"/>
          <line x1={ccx+8.375} y1={ccy-45} x2={ccx+8.375} y2={ccy-51} stroke="#cc3333" strokeWidth="1.25"/>
          <line x1={ccx-8.375} y1={ccy+45} x2={ccx-8.375} y2={ccy+51} stroke="#cc3333" strokeWidth="1.25"/>
          <line x1={ccx+8.375} y1={ccy+45} x2={ccx+8.375} y2={ccy+51} stroke="#cc3333" strokeWidth="1.25"/>
        </g>
      ))}

      {/* ── Player restraint lines (4 "L"-shaped marks surrounding each end-zone face-off
           spot, 2in wide, 4ft × 3ft, corner at the spot's own edge (1ft=3px radius)
           extending outward in a pinwheel — players must keep skates within these) ── */}
      {[[93, CY-66], [93, CY+66], [W-93, CY-66], [W-93, CY+66]].map(([ccx, ccy], i) => (
        <g key={`restraint-${i}`} stroke="#cc3333" strokeWidth="1" fill="none">
          <path d={`M ${ccx+3} ${ccy-3} L ${ccx+15} ${ccy-3} M ${ccx+3} ${ccy-3} L ${ccx+3} ${ccy-12}`}/>
          <path d={`M ${ccx+3} ${ccy+3} L ${ccx+15} ${ccy+3} M ${ccx+3} ${ccy+3} L ${ccx+3} ${ccy+12}`}/>
          <path d={`M ${ccx-3} ${ccy+3} L ${ccx-15} ${ccy+3} M ${ccx-3} ${ccy+3} L ${ccx-3} ${ccy+12}`}/>
          <path d={`M ${ccx-3} ${ccy-3} L ${ccx-15} ${ccy-3} M ${ccx-3} ${ccy-3} L ${ccx-3} ${ccy-12}`}/>
        </g>
      ))}

      {/* ── Neutral zone face-off dots (5ft inside blue lines = 15px, 22ft from centerline = 66px) ── */}
      <circle cx={CX-75+15} cy={CY-66} r="3" fill="#cc3333" opacity="0.7"/>
      <circle cx={CX-75+15} cy={CY+66} r="3" fill="#cc3333" opacity="0.7"/>
      <circle cx={CX+75-15} cy={CY-66} r="3" fill="#cc3333" opacity="0.7"/>
      <circle cx={CX+75-15} cy={CY+66} r="3" fill="#cc3333" opacity="0.7"/>

      {/* ── Zone labels (centered between where the corner radius starts, 84px from
           each end, and that side's blue line — not pinned to the corner itself) ── */}
      {!showHalf && (
        <>
          <text x="154.5" y="18" textAnchor="middle" fontSize="9" fill="#2255aa" opacity="0.6" fontFamily="sans-serif">Opponent offensive zone</text>
          <text x="445.5" y="18" textAnchor="middle" fontSize="9" fill={teamColor || 'var(--rink-team-primary)'} opacity="0.7" fontFamily="sans-serif">{teamAbbr} offensive zone</text>
        </>
      )}
      {showHalf && (
        <text x="445.5" y="18" textAnchor="middle" fontSize="9" fill={flipPerspective ? '#2255aa' : (teamColor || 'var(--rink-team-primary)')} opacity="0.8" fontFamily="sans-serif">
          {flipPerspective ? 'Opponent offensive zone' : `${teamAbbr} offensive zone`}
        </text>
      )}
    </g>
  );
}
