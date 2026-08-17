import { useState, useRef, useEffect } from 'react';
import { distFromGoal } from './geometry.js';

const TYPE_LABELS = {
  'goal':         'Goal',
  'shot-on-goal': 'Shot on goal',
  'missed-shot':  'Missed shot',
  'blocked-shot': 'Blocked shot',
};

export default function HoverTooltip({ event: e, screenX, screenY, wrapRef }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const wrap = wrapRef.current?.getBoundingClientRect();
    const tip  = ref.current?.getBoundingClientRect();
    if (!wrap || !tip) return;

    let left = screenX - wrap.left + 12;
    let top  = screenY - wrap.top  - tip.height / 2;

    // Keep inside wrap
    if (left + tip.width  > wrap.width  - 8) left = screenX - wrap.left - tip.width - 12;
    if (top  < 4)                             top  = 4;
    if (top  + tip.height > wrap.height - 4)  top  = wrap.height - tip.height - 4;

    setPos({ top, left });
  }, [screenX, screenY]);

  const dist   = distFromGoal(e.x, e.y);
  const isGoal = e.type === 'goal';
  const isPrimary = e.team === 'primary';

  return (
    <div ref={ref} className="rhr-tip" style={{ top: pos.top, left: pos.left }}>
      <div className={`rhr-tip-type ${isPrimary ? 'rhr-tip-primary' : 'rhr-tip-opponent'}`}>
        {isGoal ? '🚨 ' : ''}{TYPE_LABELS[e.type] || e.type}
      </div>
      {e.shooterName && <div className="rhr-tip-row"><span className="rhr-tip-label">{isGoal ? 'Scorer' : 'Shooter'}</span><span className="rhr-tip-val">{e.shooterName}</span></div>}
      {isGoal && e.assist1Name && <div className="rhr-tip-row"><span className="rhr-tip-label">Assist</span><span className="rhr-tip-val">{e.assist1Name}{e.assist2Name ? `, ${e.assist2Name}` : ''}</span></div>}
      <div className="rhr-tip-row">
        <span className="rhr-tip-label">Period</span>
        <span className="rhr-tip-val">
          {e.period <= 3 ? `P${e.period}` : e.period === 4 ? 'OT' : `OT${e.period - 3}`} · {e.timeInPeriod}
        </span>
      </div>
      <div className="rhr-tip-row"><span className="rhr-tip-label">Distance</span><span className="rhr-tip-val">{dist} ft</span></div>
      {e.shotType && <div className="rhr-tip-row"><span className="rhr-tip-label">Type</span><span className="rhr-tip-val">{e.shotType}</span></div>}
      {e.shotSpeed && <div className="rhr-tip-row"><span className="rhr-tip-label">Speed</span><span className="rhr-tip-val rhr-tip-speed">{e.shotSpeed} mph</span></div>}
      <div className="rhr-tip-footer">Click for full details</div>
    </div>
  );
}
