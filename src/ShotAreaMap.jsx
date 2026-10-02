import { useId } from 'react';
import { W, H, toSvg } from './geometry.js';
import RinkMarkings from './RinkMarkings.jsx';
import { SHOT_AREAS, SHOT_AREA_POLYGONS, SHOT_AREA_LABEL_AT } from './shotAreas.js';

// The attacking half of the rink plus a strip past the red line, for
// "Beyond Red Line": x -10..100 ft.
const VIEW_X0 = toSvg(-10, 0).px;
const VIEW = `${VIEW_X0} 0 ${W - VIEW_X0} ${H}`;

// Small areas get smaller labels
const SMALL = new Set(['Crease', 'L Net Side', 'R Net Side', 'L Corner', 'R Corner', 'Behind the Net', 'Beyond Red Line']);

function pathOf(points) {
  return points.map(([x, y], i) => {
    const { px, py } = toSvg(x, y);
    return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
  }).join(' ') + ' Z';
}

const PATHS = Object.fromEntries(Object.entries(SHOT_AREA_POLYGONS).map(([name, pts]) => [name, pathOf(pts)]));

/**
 * The NHL's 17 shot areas on the attacking half of the rink, each filled and
 * labelled from `areas` -- e.g. a goalie's save percentage per area.
 *
 * @param {object}   props
 * @param {Object.<string, {fill?: string, label?: string, title?: string}>} props.areas
 *   keyed by area name (SHOT_AREAS' `name`, the NHL's own spelling). An area
 *   left out is drawn as an empty outline.
 * @param {string}   [props.selected]  area to outline as selected
 * @param {(name: string) => void} [props.onSelect]  makes the areas tappable
 * @param {string}   [props.ariaLabel]
 * @param {string}   [props.className]
 */
export default function ShotAreaMap({ areas = {}, selected = null, onSelect, ariaLabel = 'Shot areas', className = '' }) {
  const clipId = `rhr-area-clip-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const interactive = typeof onSelect === 'function';

  return (
    <svg
      className={`rhr-areas ${className}`.trim()}
      viewBox={VIEW}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={W} height={H} rx={84} ry={84} />
        </clipPath>
      </defs>
      <RinkMarkings showZoneLabels={false} />
      <g clipPath={`url(#${clipId})`}>
        {SHOT_AREAS.map(({ name }) => {
          const a = areas[name] || {};
          const isSelected = selected === name;
          return (
            <path
              key={name}
              d={PATHS[name]}
              className={`rhr-area${isSelected ? ' rhr-area-selected' : ''}`}
              data-area={name}
              fill={a.fill || 'transparent'}
              fillOpacity={a.fill ? 0.62 : 0}
              stroke={isSelected ? 'var(--rink-area-selected, #111)' : 'var(--rink-area-stroke, rgba(255,255,255,0.9))'}
              strokeWidth={isSelected ? 2.5 : 1.2}
              style={interactive ? { cursor: 'pointer' } : undefined}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? (a.title || name) : undefined}
              aria-pressed={interactive ? isSelected : undefined}
              onClick={interactive ? () => onSelect(name) : undefined}
              onKeyDown={interactive ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(name); }
              } : undefined}
            >
              {a.title && <title>{a.title}</title>}
            </path>
          );
        })}
      </g>
      <g pointerEvents="none">
        {SHOT_AREAS.map(({ name }) => {
          const label = areas[name]?.label;
          if (!label) return null;
          const { px, py } = toSvg(...SHOT_AREA_LABEL_AT[name]);
          return (
            <text
              key={name}
              x={px}
              y={py}
              textAnchor="middle"
              dominantBaseline="central"
              className="rhr-area-label"
              fontSize={SMALL.has(name) ? 8 : 11}
              fontWeight="700"
              fill="var(--rink-area-label, #111)"
              stroke="var(--rink-area-label-halo, rgba(255,255,255,0.85))"
              strokeWidth="2.5"
              paintOrder="stroke"
              fontFamily="var(--rink-font-mono, monospace)"
            >
              {label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
