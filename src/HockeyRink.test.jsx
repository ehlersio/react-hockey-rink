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

  it('shows the shot speed when the event has one', () => {
    const speedEvents = [
      { id: 7, team: 'primary', type: 'shot-on-goal', x: 70, y: 5, period: 1, timeInPeriod: '5:00', shooterId: 1, shooterName: 'A. Player', shotSpeed: 94 },
    ];
    const { container } = render(<HockeyRink events={speedEvents} teamAbbr="CAR" />);
    fireEvent.click(container.querySelector('.rhr-svg circle[style*="cursor: pointer"]'));
    expect(container.querySelector('.rhr-popup')).toHaveTextContent('94 mph');
  });

  it('leaves the shot speed row out when the event has none', () => {
    const plainEvents = [
      { id: 8, team: 'primary', type: 'shot-on-goal', x: 70, y: 5, period: 1, timeInPeriod: '5:00', shooterId: 1, shooterName: 'A. Player' },
    ];
    const { container } = render(<HockeyRink events={plainEvents} teamAbbr="CAR" />);
    fireEvent.click(container.querySelector('.rhr-svg circle[style*="cursor: pointer"]'));
    const popup = container.querySelector('.rhr-popup');
    expect(popup).not.toHaveTextContent('Shot speed');
    expect(popup).not.toHaveTextContent('Not tracked');
  });

  it('renders the goal video as the first popup section when the event has a videoUrl', () => {
    const videoEvents = [
      { id: 5, team: 'primary', type: 'goal', x: 84, y: 3, period: 1, timeInPeriod: '9:14', shooterId: 1, shooterName: 'A. Player', videoUrl: 'https://example.com/clip.html' },
    ];
    const { container } = render(<HockeyRink events={videoEvents} teamAbbr="CAR" />);
    const dot = container.querySelector('.rhr-svg circle[style*="cursor: pointer"]');
    fireEvent.click(dot);
    const iframe = container.querySelector('.rhr-popup-video');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://example.com/clip.html');
    // First child of the popup body, ahead of the "When" section.
    expect(container.querySelector('.rhr-popup-body > :first-child .rhr-popup-video')).toBeInTheDocument();
  });

  it('omits the video section for a goal with no videoUrl', () => {
    const noVideoEvents = [
      { id: 5, team: 'primary', type: 'goal', x: 84, y: 3, period: 1, timeInPeriod: '9:14', shooterId: 1, shooterName: 'A. Player' },
    ];
    const { container } = render(<HockeyRink events={noVideoEvents} teamAbbr="CAR" />);
    const dot = container.querySelector('.rhr-svg circle[style*="cursor: pointer"]');
    fireEvent.click(dot);
    expect(container.querySelector('.rhr-popup')).toBeInTheDocument();
    expect(container.querySelector('.rhr-popup-video')).not.toBeInTheDocument();
  });

  it('renderMedia replaces the default video at the top of the popup', () => {
    const videoEvents = [
      { id: 5, team: 'primary', type: 'goal', x: 84, y: 3, period: 1, timeInPeriod: '9:14', shooterId: 1, shooterName: 'A. Player', videoUrl: 'https://example.com/clip.html' },
    ];
    const seen = [];
    const renderMedia = (ev) => { seen.push(ev); return <div className="my-media">tracking replay</div>; };
    const { container } = render(<HockeyRink events={videoEvents} teamAbbr="CAR" renderMedia={renderMedia} />);
    fireEvent.click(container.querySelector('.rhr-svg circle[style*="cursor: pointer"]'));
    expect(container.querySelector('.rhr-popup-body > :first-child .my-media')).toBeInTheDocument();
    expect(container.querySelector('.rhr-popup-video')).not.toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe(5);
  });

  it('renderMedia returning null keeps the default video', () => {
    const videoEvents = [
      { id: 5, team: 'primary', type: 'goal', x: 84, y: 3, period: 1, timeInPeriod: '9:14', shooterId: 1, shooterName: 'A. Player', videoUrl: 'https://example.com/clip.html' },
    ];
    const { container } = render(<HockeyRink events={videoEvents} teamAbbr="CAR" renderMedia={() => null} />);
    fireEvent.click(container.querySelector('.rhr-svg circle[style*="cursor: pointer"]'));
    expect(container.querySelector('.rhr-popup-video')).toHaveAttribute('src', 'https://example.com/clip.html');
  });

  it('renderMedia can add media to a shot that is not a goal', () => {
    const shotEvents = [
      { id: 6, team: 'opponent', type: 'shot-on-goal', x: 60, y: -10, period: 2, timeInPeriod: '4:02', shooterId: 2, shooterName: 'B. Player' },
    ];
    const { container } = render(
      <HockeyRink events={shotEvents} teamAbbr="CAR" renderMedia={(ev) => <div className="my-media">{ev.type}</div>} />,
    );
    fireEvent.click(container.querySelector('.rhr-svg circle[style*="cursor: pointer"]'));
    expect(container.querySelector('.my-media')).toHaveTextContent('shot-on-goal');
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
