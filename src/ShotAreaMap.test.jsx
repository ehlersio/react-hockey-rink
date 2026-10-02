import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ShotAreaMap from './ShotAreaMap.jsx';
import { shotArea, SHOT_AREAS, SHOT_AREA_POLYGONS, SHOT_AREA_LABEL_AT, AREA_BOUNDS } from './shotAreas.js';

const NAMES = SHOT_AREAS.map((a) => a.name);

// Ray casting: is (x, y) inside the polygon?
function inside([x, y], pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('shotArea', () => {
  it('names the NHL areas at known spots (attacking right, net at x = 89)', () => {
    expect(shotArea(86, 0)).toBe('Crease');
    expect(shotArea(78, 2)).toBe('Low Slot');
    expect(shotArea(60, 0)).toBe('High Slot');
    expect(shotArea(69, 22)).toBe('L Circle');
    expect(shotArea(69, -22)).toBe('R Circle');
    expect(shotArea(80, 15)).toBe('L Net Side');
    expect(shotArea(86, -20)).toBe('Outside R');
    expect(shotArea(70, 40)).toBe('Outside L');
    expect(shotArea(30, 0)).toBe('Center Point');
    expect(shotArea(30, 30)).toBe('L Point');
    expect(shotArea(30, -30)).toBe('R Point');
    expect(shotArea(95, 5)).toBe('Behind the Net');
    expect(shotArea(95, 30)).toBe('L Corner');
    expect(shotArea(95, -30)).toBe('R Corner');
    expect(shotArea(10, 5)).toBe('Offensive Neutral Zone');
    expect(shotArea(-40, 5)).toBe('Beyond Red Line');
  });

  it('only ever answers with one of the 17 areas', () => {
    for (let x = -100; x <= 100; x += 3) {
      for (let y = -42; y <= 42; y += 3) expect(NAMES).toContain(shotArea(x, y));
    }
  });

  it('L is the shooter\'s left facing the net: the top (+y) of the rink', () => {
    expect(shotArea(69, 22)).toBe('L Circle');
  });
});

describe('the drawn areas match the classifier', () => {
  it('a point inside an area\'s outline is classified as that area', () => {
    let checked = 0;
    // A fine grid over the rink (off the straight boundary lines); every
    // point falls in exactly one outline, the one the classifier names
    for (let x = -99.7; x < 100; x += 0.9) {
      for (let y = -42.3; y < 42.5; y += 0.9) {
        // Arcs are drawn as short chords, so skip a hair either side of the
        // two curved boundaries (the crease and the 24-ft ring)
        const r = Math.hypot(89 - x, y);
        if (Math.abs(r - AREA_BOUNDS.creaseR) < 0.05 || Math.abs(r - AREA_BOUNDS.innerR) < 0.05) continue;
        const owners = NAMES.filter((n) => inside([x, y], SHOT_AREA_POLYGONS[n]));
        expect(owners).toHaveLength(1);
        expect(owners[0]).toBe(shotArea(x, y));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(18000);
  });

  it('puts every label inside its own area', () => {
    for (const n of NAMES) expect(shotArea(...SHOT_AREA_LABEL_AT[n])).toBe(n);
  });
});

describe('ShotAreaMap', () => {
  it('draws all 17 areas, filled and labelled only where given', () => {
    const { container } = render(
      <ShotAreaMap areas={{ 'Low Slot': { fill: '#1D9E75', label: '.850', title: 'Low Slot: .850' } }} />
    );
    const paths = container.querySelectorAll('path.rhr-area');
    expect(paths).toHaveLength(17);
    const low = container.querySelector('path[data-area="Low Slot"]');
    expect(low.getAttribute('fill')).toBe('#1D9E75');
    expect(container.querySelector('path[data-area="Crease"]').getAttribute('fill')).toBe('transparent');
    expect(container.querySelectorAll('text.rhr-area-label')).toHaveLength(1);
    expect(container).toHaveTextContent('.850');
  });

  it('is tappable with onSelect, and outlines the selected area', () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(<ShotAreaMap areas={{}} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('path[data-area="L Circle"]'));
    expect(onSelect).toHaveBeenCalledWith('L Circle');
    fireEvent.keyDown(container.querySelector('path[data-area="Crease"]'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('Crease');
    rerender(<ShotAreaMap areas={{}} onSelect={onSelect} selected="L Circle" />);
    expect(container.querySelector('path[data-area="L Circle"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('draws children on the same rink, and can leave empty outlines out', () => {
    const { container } = render(
      <ShotAreaMap areas={{ 'Low Slot': { fill: '#f87171' } }} outlines={false}>
        <circle className="dot" cx="500" cy="127" r="3" />
      </ShotAreaMap>
    );
    expect(container.querySelector('svg circle.dot')).not.toBeNull();
    // only the filled area is drawn
    expect(container.querySelectorAll('path.rhr-area')).toHaveLength(1);
  });

  it('is a plain picture without onSelect', () => {
    const { container } = render(<ShotAreaMap areas={{}} />);
    expect(container.querySelector('path[data-area="Crease"]').getAttribute('role')).toBeNull();
  });
});
