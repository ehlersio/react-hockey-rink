import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HockeyRink from './HockeyRink.jsx';

const events = [
  { id: 1, team: 'primary',  type: 'goal',         x: 84, y: 3,   period: 1, timeInPeriod: '9:14',  shooterId: 1, shooterName: 'A. Player' },
  { id: 2, team: 'primary',  type: 'shot-on-goal',  x: 72, y: 8,   period: 1, timeInPeriod: '15:00', shooterId: 1, shooterName: 'A. Player' },
  { id: 3, team: 'opponent', type: 'shot-on-goal',  x: -70, y: 5,  period: 2, timeInPeriod: '12:51', shooterId: 101, shooterName: 'B. Opp' },
  { id: 4, team: 'primary',  type: 'missed-shot',   x: 65, y: -20, period: 2, timeInPeriod: '3:22',  shooterId: 2, shooterName: 'C. Second' },
];

describe('HockeyRink', () => {
  it('renders without crashing', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" />);
    expect(container.querySelector('.rhr-svg')).toBeInTheDocument();
  });

  it('renders an empty state with no events', () => {
    render(<HockeyRink events={[]} teamAbbr="CAR" />);
    expect(screen.getByText(/shot data appears here/i)).toBeInTheDocument();
  });

  it('narrows the rendered dots when filtering by period', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" />);
    const allCircles = container.querySelectorAll('.rhr-svg circle').length;

    fireEvent.click(screen.getByRole('button', { name: 'P1' }));
    const p1Circles = container.querySelectorAll('.rhr-svg circle').length;

    // Period 1 has 2 of the 4 fixture events; fewer circles once filtered.
    expect(p1Circles).toBeLessThan(allCircles);
  });

  it('narrows the rendered dots when filtering by player', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" />);
    const allCircles = container.querySelectorAll('.rhr-svg circle').length;

    fireEvent.click(screen.getByRole('button', { name: /Player/ }));
    fireEvent.click(screen.getByText('A. Player'));
    const filteredCircles = container.querySelectorAll('.rhr-svg circle').length;

    expect(filteredCircles).toBeLessThan(allCircles);
  });

  it('opens the popup when a dot is clicked', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" />);
    const dot = container.querySelector('.rhr-svg circle[style*="cursor: pointer"]');
    fireEvent.click(dot);
    expect(container.querySelector('.rhr-popup')).toBeInTheDocument();
  });

  it('switches to heat mode without throwing', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" />);
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /Heat/ }));
    }).not.toThrow();
    expect(container.querySelector('.rhr-heat-controls')).toBeInTheDocument();
  });

  it('renders in readOnly mode without a toolbar', () => {
    const { container } = render(<HockeyRink events={events} teamAbbr="CAR" readOnly />);
    expect(container.querySelector('.rhr-toolbar')).not.toBeInTheDocument();
    expect(container.querySelector('.rhr-svg')).toBeInTheDocument();
  });
});
