import { useState } from 'react';
import HockeyRink from '../../src/HockeyRink.jsx';
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

      <div style={cardStyle}>
        <HockeyRink
          events={noEvents ? [] : demoEvents}
          flipPerspective={flipPerspective}
          readOnly={readOnly}
          hidePlayerFilter={hidePlayerFilter}
          teamAbbr="CAR"
          teamColor="#cc2200"
        />
      </div>
    </div>
  );
}
