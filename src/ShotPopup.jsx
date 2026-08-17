import { distFromGoal, zoneLabel } from './geometry.js';

const TYPE_LABELS = {
  'goal':         'Goal',
  'shot-on-goal': 'Shot on goal',
  'missed-shot':  'Missed shot',
  'blocked-shot': 'Blocked shot',
};

function popupHeaderClasses(isGoal, isPrimary) {
  const classes = ['rhr-popup-header'];
  if (isGoal) classes.push('rhr-popup-goal');
  classes.push(isPrimary ? 'rhr-popup-primary' : 'rhr-popup-opponent');
  return classes.join(' ');
}

export default function ShotPopup({ event: e, onClose, displayAbbr = 'TEAM' }) {
  const isPrimary   = e.team === 'primary';
  const shooterName = e.shooterName || (isPrimary ? `Unknown ${displayAbbr}` : 'Unknown');
  const goalieName  = e.goalieName  || null;
  const blockerName = e.blockerName || null;
  const assists = [e.assist1Name, e.assist2Name].filter(Boolean);

  const dist   = distFromGoal(e.x, e.y);
  const angle  = Math.abs(Math.atan2(Math.abs(e.y), Math.abs(Math.abs(e.x) - 89)) * (180 / Math.PI)).toFixed(1);
  const zone   = zoneLabel(e.x, e.y);
  const isGoal = e.type === 'goal';

  let danger = 'Low danger';
  const distNum = parseFloat(dist);
  if (distNum < 15)                                danger = '🔴 High danger';
  else if (distNum < 30 && parseFloat(angle) > 20)  danger = '🟡 Medium danger';
  else if (distNum < 25)                            danger = '🟡 Medium danger';

  return (
    <div className="rhr-popup-backdrop" onClick={onClose}>
      <div className="rhr-popup" onClick={e2 => e2.stopPropagation()}>

        <div className={popupHeaderClasses(isGoal, isPrimary)}>
          <div className="rhr-popup-type-row">
            <span className="rhr-popup-type-icon">{isGoal ? '🚨' : e.type === 'blocked-shot' ? '🛡' : e.type === 'missed-shot' ? '↗' : '🏒'}</span>
            <span className="rhr-popup-type-label">{TYPE_LABELS[e.type] || e.type}</span>
            <span className={`rhr-popup-team-badge ${isPrimary ? 'rhr-popup-badge-primary' : 'rhr-popup-badge-opponent'}`}>{isPrimary ? displayAbbr : 'OPP'}</span>
          </div>
          <button className="rhr-popup-close" onClick={onClose}>✕</button>
        </div>

        <div className="rhr-popup-body">
          <div className="rhr-popup-section">
            <div className="rhr-popup-section-label">When</div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Period</span>
              <span className="rhr-popup-value">{
                e.period <= 3
                  ? `Period ${e.period}`
                  : e.period === 4 ? 'Overtime'
                  : `OT${e.period - 3}`
              }</span>
            </div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Time</span>
              <span className="rhr-popup-value">{e.timeInPeriod}</span>
            </div>
          </div>

          <div className="rhr-popup-section">
            <div className="rhr-popup-section-label">Players</div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">{isGoal ? 'Goal scorer' : 'Shot by'}</span>
              <span className="rhr-popup-value rhr-popup-name">{shooterName}</span>
            </div>
            {isGoal && assists.length > 0 && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Assists</span>
                <span className="rhr-popup-value rhr-popup-name">{assists.join(', ')}</span>
              </div>
            )}
            {blockerName && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Blocked by</span>
                <span className="rhr-popup-value rhr-popup-name">{blockerName}</span>
              </div>
            )}
            {goalieName && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Goalie</span>
                <span className="rhr-popup-value rhr-popup-name">{goalieName}</span>
              </div>
            )}
          </div>

          <div className="rhr-popup-section">
            <div className="rhr-popup-section-label">Location</div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Distance</span>
              <span className="rhr-popup-value">{dist} ft from goal</span>
            </div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Angle</span>
              <span className="rhr-popup-value">{angle}°</span>
            </div>
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Zone</span>
              <span className="rhr-popup-value">{zone}</span>
            </div>
          </div>

          <div className="rhr-popup-section">
            <div className="rhr-popup-section-label">Shot details</div>
            {e.shotType && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Shot type</span>
                <span className="rhr-popup-value">{e.shotType}</span>
              </div>
            )}
            {e.shotSpeed != null && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Shot speed</span>
                <span className="rhr-popup-value rhr-popup-speed">{e.shotSpeed} mph</span>
              </div>
            )}
            {e.shotSpeed == null && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Shot speed</span>
                <span className="rhr-popup-value rhr-popup-untracked">Not tracked</span>
              </div>
            )}
            <div className="rhr-popup-row">
              <span className="rhr-popup-field">Danger</span>
              <span className="rhr-popup-value">{danger}</span>
            </div>
            {e.zoneCode && (
              <div className="rhr-popup-row">
                <span className="rhr-popup-field">Zone code</span>
                <span className="rhr-popup-value">{e.zoneCode === 'O' ? 'Offensive' : e.zoneCode === 'D' ? 'Defensive' : 'Neutral'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
