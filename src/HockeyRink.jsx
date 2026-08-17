import { useState, useMemo, useRef, useEffect } from 'react';
import { useWindowWidth } from './hooks/useWindowWidth.js';
import { rinkButtonClasses } from './utils/rinkButtonClasses.js';
import { W, H, CX, CY, toSvg } from './geometry.js';
import RinkMarkings from './RinkMarkings.jsx';
import HeatmapLayer from './HeatmapLayer.jsx';
import HoverTooltip from './HoverTooltip.jsx';
import ShotPopup from './ShotPopup.jsx';

// Shot type → dot style (fill is set dynamically for the primary team's side)
const SHOT_STYLE = {
  'goal':         { r: 7,  stroke: '#333',   strokeWidth: 2,   opacity: 1    },
  'shot-on-goal': { r: 5,  stroke: 'none',   strokeWidth: 0,   opacity: 0.65 },
  'missed-shot':  { r: 4,  stroke: 'none',   strokeWidth: 0,   opacity: 0.32 },
  'blocked-shot': { r: 4,  fill: '#8899aa',  stroke: 'none',   strokeWidth: 0,   opacity: 0.45 },
};
const OPPONENT_SHOT_STYLE = {
  'goal':         { r: 7,  fill: '#4477ee', stroke: '#333',   strokeWidth: 2,   opacity: 1    },
  'shot-on-goal': { r: 5,  fill: '#4477ee', stroke: 'none',   strokeWidth: 0,   opacity: 0.55 },
  'missed-shot':  { r: 4,  fill: '#4477ee', stroke: 'none',   strokeWidth: 0,   opacity: 0.28 },
  'blocked-shot': { r: 4,  fill: '#8899aa', stroke: 'none',   strokeWidth: 0,   opacity: 0.40 },
};

const MAX_ZOOM = 5;
const MIN_ZOOM = 1;

/**
 * An interactive hockey rink shot chart — dots or heat map, zoom/pan,
 * period + player filtering, hover tooltip, click popup.
 *
 * Events use `team: 'primary' | 'opponent'` to indicate which side a shot
 * belongs to; the primary team always renders attacking right (unless
 * `flipPerspective` is set).
 */
export default function HockeyRink({
  events = [],
  hidePlayerFilter = false,
  readOnly = false,
  flipPerspective = false,
  teamAbbr = 'TEAM',
  teamColor,
}) {
  const displayAbbr  = teamAbbr;
  const displayColor = teamColor || 'var(--rink-team-primary)';

  const [halfRink,    setHalfRink]    = useState(false);
  const [period,      setPeriod]      = useState('all');
  const [viewMode,    setViewMode]    = useState('dots'); // 'dots' | 'heat'
  const [heatTeam,    setHeatTeam]    = useState('both'); // 'primary' | 'opponent' | 'both'
  const [selectedPlayer, setSelectedPlayer] = useState(null); // playerId string or null = all
  const [filterOpen,    setFilterOpen]    = useState(false);
  const filterRef = useRef(null);
  const [hovered,     setHovered]     = useState(null);   // { event, screenX, screenY }
  const [selected,    setSelected]    = useState(null);   // full event object for popup
  const [zoom,        setZoom]        = useState(1);
  const [pan,         setPan]         = useState({ x: 0, y: 0 });
  const [isPanning,   setIsPanning]   = useState(false);
  const panStart      = useRef(null);
  const svgRef        = useRef(null);
  const wrapRef       = useRef(null);
  const width         = useWindowWidth();

  // Close player filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const close = e => { if (!filterRef.current?.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [filterOpen]);
  const isMobile = width < 600;
  const showHalf = isMobile || halfRink;

  // Derive which OT periods actually have events — only show those buttons
  const otPeriods = useMemo(() => {
    const seen = new Set(events.map(e => e.period).filter(p => p >= 4));
    return [...seen].sort((a, b) => a - b); // [4, 5, 6, ...]
  }, [events]);

  // Filter events by selected period
  // period state is 'all' | '1' | '2' | '3' | 'ot4' | 'ot5' | ...
  const filtered = useMemo(() => {
    if (period === 'all') return events;
    if (period.startsWith('ot')) {
      const p = parseInt(period.slice(2));  // 'ot4' -> 4
      return events.filter(e => e.period === p);
    }
    return events.filter(e => e.period === parseInt(period));
  }, [events, period]);

  // Label for an OT period number: 4 -> 'OT', 5 -> 'OT2', 6 -> 'OT3', etc.
  function otLabel(periodNum) {
    return periodNum === 4 ? 'OT' : `OT${periodNum - 3}`;
  }

  // Normalize event coords so the primary team always attacks right (positive x).
  // When flipPerspective=true (e.g. a penalty-kill mini-rink), the opponent
  // attacks right instead, so the half-rink shows the opponent's offensive
  // zone (the primary team's defensive zone).
  function normalizeCoords(e) {
    let x = e.x, y = e.y;
    const isPrimary = e.team === 'primary';
    if (!flipPerspective) {
      if (isPrimary  && x < 0) { x = -x; y = -y; }
      if (!isPrimary && x > 0) { x = -x; y = -y; }
    } else {
      if (!isPrimary && x > 0) { x = -x; y = -y; }
      if (isPrimary  && x < 0) { x = -x; y = -y; }
    }
    return { x, y };
  }

  // ── Zoom helpers ──
  function clampZoom(z) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); }

  function zoomToward(delta, cx, cy) {
    setZoom(prev => {
      const next = clampZoom(prev + delta);
      const scale = next / prev;
      setPan(p => ({
        x: cx - scale * (cx - p.x),
        y: cy - scale * (cy - p.y),
      }));
      return next;
    });
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Scroll-to-zoom on desktop
  function handleWheel(e) {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    zoomToward(e.deltaY < 0 ? 0.25 : -0.25, cx, cy);
  }

  // Mouse pan
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }
  function handleMouseMove(e) {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }
  function handleMouseUp() { setIsPanning(false); }

  // Touch pinch-zoom
  const lastTouch = useRef(null);
  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouch.current = { dist: Math.sqrt(dx*dx + dy*dy), zoom };
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  }
  function handleTouchMove(e) {
    if (e.touches.length === 2 && lastTouch.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const scale = dist / lastTouch.current.dist;
      setZoom(clampZoom(lastTouch.current.zoom * scale));
    } else if (e.touches.length === 1 && isPanning) {
      setPan({ x: e.touches[0].clientX - panStart.current.x, y: e.touches[0].clientY - panStart.current.y });
    }
  }
  function handleTouchEnd() {
    setIsPanning(false);
    lastTouch.current = null;
  }

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoom, pan]);

  // ── Render a single shot dot ──
  function renderShot(e, isPrimary, index) {
    const { x, y } = normalizeCoords(e);
    if (showHalf && x < 0) return null;

    const { px, py } = toSvg(x, y);
    const styles = isPrimary ? SHOT_STYLE : OPPONENT_SHOT_STYLE;
    const s = styles[e.type] || styles['shot-on-goal'];
    const teamFill = isPrimary && !s.fill ? displayColor : s.fill;
    const isHov = hovered?.event?.id === e.id;
    const isSel = selected?.id === e.id;

    return (
      <circle
        key={`${e.id}-${index}`}
        cx={px}
        cy={py}
        r={!readOnly && (isHov || isSel) ? s.r * 1.6 : s.r}
        fill={teamFill}
        stroke={!readOnly && isSel ? '#fff' : !readOnly && isHov ? 'rgba(255,255,255,0.6)' : s.stroke}
        strokeWidth={!readOnly && isSel ? 2.5 : !readOnly && isHov ? 1.5 : s.strokeWidth}
        opacity={!readOnly && (isHov || isSel) ? 1 : s.opacity}
        style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'r 0.1s, opacity 0.1s' }}
        onMouseEnter={readOnly ? undefined : ev => {
          setHovered({ event: e, screenX: ev.clientX, screenY: ev.clientY });
        }}
        onMouseLeave={readOnly ? undefined : () => setHovered(null)}
        onClick={readOnly ? undefined : ev => {
          ev.stopPropagation();
          setSelected(prev => prev?.id === e.id ? null : e);
          setHovered(null);
        }}
      />
    );
  }

  const viewBox = showHalf ? `${CX} 0 ${W/2} ${H}` : `0 0 ${W} ${H}`;
  const primaryEvents = filtered.filter(e =>
    e.team === 'primary' && (selectedPlayer === null || String(e.shooterId) === selectedPlayer)
  );
  const opponentEvents = filtered.filter(e => e.team !== 'primary');
  // Unique primary-team shooters for the player filter chips
  const primaryShooters = useMemo(() => {
    const seen = new Set();
    return filtered
      .filter(e => e.team === 'primary' && e.shooterId && !seen.has(e.shooterId) && seen.add(e.shooterId))
      .map(e => ({ id: String(e.shooterId), name: e.shooterName || `#${e.shooterId}` }));
  }, [filtered]);

  return (
    <div className="rhr-wrap" ref={wrapRef}>

      {/* Toolbar */}
      {!readOnly && (
      <div className="rhr-toolbar">
        <div className="rhr-filters">
          {/* Regular periods always shown */}
          {['all','1','2','3'].map(p => (
            <button key={p} className={rinkButtonClasses({ active: period === p })}
              onClick={() => { setPeriod(p); setSelectedPlayer(null); }}>
              {p === 'all' ? 'All' : `P${p}`}
            </button>
          ))}
          {/* OT periods — only rendered if that period has events */}
          {otPeriods.map(p => (
            <button key={`ot${p}`} className={rinkButtonClasses({ active: period === `ot${p}`, variant: 'ot' })}
              onClick={() => setPeriod(`ot${p}`)}>
              {otLabel(p)}
            </button>
          ))}
        </div>
        <div className="rhr-controls">
          {/* Player filter popover */}
          {primaryShooters.length > 0 && !hidePlayerFilter && (
            <div className="rhr-filter-wrap" ref={filterRef}>
              <button
                className={rinkButtonClasses({ active: !!selectedPlayer, variant: 'filter' })}
                onClick={() => setFilterOpen(o => !o)}
                aria-expanded={filterOpen}
              >
                {selectedPlayer
                  ? <>{primaryShooters.find(s => s.id === selectedPlayer)?.name.split(' ').pop() || 'Player'} <span className="rhr-filter-clear" onClick={e => { e.stopPropagation(); setSelectedPlayer(null); setFilterOpen(false); }}>✕</span></>
                  : <>Player ▾</>
                }
              </button>
              {filterOpen && (
                <div className="rhr-filter-dropdown" role="listbox">
                  <button
                    className={`rhr-filter-option ${selectedPlayer === null ? 'rhr-filter-option-active' : ''}`}
                    onClick={() => { setSelectedPlayer(null); setFilterOpen(false); }}
                    role="option"
                  >All players</button>
                  {primaryShooters.map(s => (
                    <button
                      key={s.id}
                      className={`rhr-filter-option ${selectedPlayer === s.id ? 'rhr-filter-option-active' : ''}`}
                      onClick={() => { setSelectedPlayer(s.id); setFilterOpen(false); }}
                      role="option"
                    >
                      <span className="rhr-filter-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            className={rinkButtonClasses({ active: viewMode === 'heat', variant: 'heat' })}
            onClick={() => setViewMode(m => m === 'dots' ? 'heat' : 'dots')}
          >
            🔥 Heat
          </button>
          {!isMobile && (
            <button className={rinkButtonClasses({ active: false })} onClick={() => setHalfRink(h => !h)}>
              {showHalf ? 'Full rink' : 'Half rink'}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Zoom controls */}
      {!readOnly && (
      <div className="rhr-zoom-bar">
        <button className="rhr-zoom-btn" onClick={() => zoomToward(-0.5, 0, 0)} disabled={zoom <= MIN_ZOOM}>−</button>
        <div className="rhr-zoom-track">
          <div className="rhr-zoom-fill" style={{ width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }} />
        </div>
        <button className="rhr-zoom-btn" onClick={() => zoomToward(0.5, 0, 0)} disabled={zoom >= MAX_ZOOM}>+</button>
        {(zoom > 1 || pan.x !== 0 || pan.y !== 0) && (
          <button className="rhr-zoom-reset" onClick={resetView}>Reset</button>
        )}
        <span className="rhr-zoom-label">{Math.round(zoom * 100)}%</span>
      </div>
      )}

      {/* Heat team selector — only in heat mode */}
      {!readOnly && viewMode === 'heat' && (
        <div className="rhr-heat-controls">
          <span className="rhr-heat-label">Show:</span>
          {[['primary',`${displayAbbr} shots`],['opponent','Opp shots'],['both','Both']].map(([val, lbl]) => (
            <button
              key={val}
              className={rinkButtonClasses({ active: heatTeam === val })}
              onClick={() => setHeatTeam(val)}
            >{lbl}</button>
          ))}
          <span className="rhr-heat-scale">
            <span className="rhr-heat-scale-low">Low</span>
            <span className="rhr-heat-scale-bar" />
            <span className="rhr-heat-scale-high">High</span>
          </span>
        </div>
      )}

      {/* Legend — only in dots mode, not readOnly */}
      {!readOnly && viewMode === 'dots' && (
        <div className="rhr-legend">
          <div className="rhr-legend-item"><span className="rhr-leg-dot" style={{background:displayColor,opacity:0.65}} />{displayAbbr} shot</div>
          <div className="rhr-legend-item"><span className="rhr-leg-dot rhr-leg-goal" style={{background:displayColor}} />{displayAbbr} goal</div>
          <div className="rhr-legend-item"><span className="rhr-leg-dot" style={{background:'#4477ee',opacity:0.55}} />Opp shot</div>
          <div className="rhr-legend-item"><span className="rhr-leg-dot rhr-leg-goal" style={{background:'#4477ee'}} />Opp goal</div>
          <div className="rhr-legend-item"><span className="rhr-leg-dot" style={{background:'#8899aa',opacity:0.45}} />Blocked</div>
        </div>
      )}

      {/* SVG rink */}
      <div
        className="rhr-svg-container"
        style={{ cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setSelected(null)}
      >
        <svg
          ref={svgRef}
          className="rhr-svg"
          viewBox={viewBox}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'top left',
            transition: isPanning ? 'none' : 'transform 0.1s ease',
          }}
        >
          <RinkMarkings showHalf={showHalf} flipPerspective={flipPerspective} teamAbbr={teamAbbr} teamColor={teamColor} />
          {viewMode === 'heat' && (
            <HeatmapLayer
              primaryEvents={primaryEvents}
              opponentEvents={opponentEvents}
              heatTeam={heatTeam}
              showHalf={showHalf}
              flipPerspective={flipPerspective}
              W={W} H={H} CX={CX} CY={CY}
            />
          )}
          {viewMode === 'dots' && (
            <>
              {opponentEvents.map((e, i) => renderShot(e, false, i))}
              {primaryEvents.map((e, i)  => renderShot(e, true,  i))}
            </>
          )}
          {/* Always show goals on top even in heat mode */}
          {viewMode === 'heat' && (
            <>
              {opponentEvents.filter(e => e.type === 'goal').map((e, i) => renderShot(e, false, i))}
              {primaryEvents.filter(e => e.type === 'goal').map((e, i)  => renderShot(e, true,  i))}
            </>
          )}
        </svg>
      </div>

      {/* Hover tooltip — dots mode, plus goals in heat mode */}
      {!readOnly && (viewMode === 'dots' || (viewMode === 'heat' && hovered?.event?.type === 'goal')) && hovered && !selected && (
        <HoverTooltip event={hovered.event} screenX={hovered.screenX} screenY={hovered.screenY} wrapRef={wrapRef} />
      )}

      {/* Click popup — dots mode + goals in heat mode */}
      {!readOnly && (viewMode === 'dots' || viewMode === 'heat') && selected && (
        <ShotPopup event={selected} onClose={() => setSelected(null)} displayAbbr={displayAbbr} />
      )}

      {events.length === 0 && (
        <div className="rhr-empty">Shot data appears here during and after games.</div>
      )}
    </div>
  );
}
