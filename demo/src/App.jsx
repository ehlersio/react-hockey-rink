import { useState } from 'react';
import HockeyRink from '../../src/HockeyRink.jsx';
import ShotAreaMap from '../../src/ShotAreaMap.jsx';
import { demoGoalieAreas } from './goalieAreas.js';
import '../../src/styles.css';
import { demoEvents } from './fixtures.js';

const wrapStyle = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '32px 16px 64px',
  fontFamily: 'system-ui, sans-serif',
  color: 'var(--rink-text)',
};

const cardStyle = {
  background: 'var(--rink-bg1)',
  border: '1px solid var(--rink-border-2)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 24,
};

const toggleRowStyle = { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 };

export default function App() {
  const [flipPerspective, setFlipPerspective] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [hidePlayerFilter, setHidePlayerFilter] = useState(false);
  const [noEvents, setNoEvents] = useState(false);
  const [area, setArea] = useState(null);

  return (
    <div style={wrapStyle}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>react-hockey-rink</h1>
      <p style={{ color: 'var(--rink-text-muted)', fontSize: 13, marginBottom: 24 }}>
        Local demo — real component, fixture data. Exercises dots/heat, zoom/pan,
        period + player filtering, hover tooltip, click popup, half-rink (resize
        below 600px width).
      </p>

      <div style={toggleRowStyle}>
        <label><input type="checkbox" checked={flipPerspective} onChange={e => setFlipPerspective(e.target.checked)} /> flipPerspective</label>
        <label><input type="checkbox" checked={readOnly} onChange={e => setReadOnly(e.target.checked)} /> readOnly</label>
        <label><input type="checkbox" checked={hidePlayerFilter} onChange={e => setHidePlayerFilter(e.target.checked)} /> hidePlayerFilter</label>
        <label><input type="checkbox" checked={noEvents} onChange={e => setNoEvents(e.target.checked)} /> empty state</label>
      </div>

      <div style={cardStyle} id="capture-target">
        <HockeyRink
          events={noEvents ? [] : demoEvents}
          flipPerspective={flipPerspective}
          readOnly={readOnly}
          hidePlayerFilter={hidePlayerFilter}
          teamAbbr="CAR"
          teamColor="#cc2200"
        />
      </div>

      <h2 style={{ fontSize: 16, margin: '8px 0' }}>ShotAreaMap</h2>
      <p style={{ color: 'var(--rink-text-muted)', fontSize: 13, marginBottom: 12 }}>
        The NHL's 17 shot areas, here one goalie's save % per area, coloured by
        its percentile among NHL goalies. Tap an area.
      </p>
      <div style={cardStyle} id="capture-areas">
        <ShotAreaMap
          areas={Object.fromEntries(Object.entries(demoGoalieAreas).map(([name, a]) => {
            // An area the goalie faced no shots from has no save % at all
            const ok = a.shots >= 5 && a.svPct != null && a.pct != null;
            return [name, {
              fill: ok ? (a.pct >= 0.67 ? '#4ade80' : a.pct >= 0.34 ? '#fbbf24' : '#f87171') : undefined,
              label: ok ? a.svPct.toFixed(3).replace(/^0/, '') : undefined,
              title: a.svPct != null ? `${name}: ${a.shots} shots, ${a.svPct.toFixed(3)} SV%` : `${name}: no shots`,
            }];
          }))}
          selected={area}
          onSelect={setArea}
        />
        <p style={{ fontSize: 13, marginTop: 8, color: 'var(--rink-text-muted)' }}>
          {!area ? 'No area selected' : demoGoalieAreas[area].svPct == null ? `${area}: no shots` : `${area}: ${demoGoalieAreas[area].shots} shots, ${demoGoalieAreas[area].svPct.toFixed(3)} SV%, ${Math.round(demoGoalieAreas[area].pct * 100)}th percentile`}
        </p>
      </div>
    </div>
  );
}
