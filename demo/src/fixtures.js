// Shape-compatible fixture data for the demo — same event schema HockeyRink
// expects in production: x/y in NHL ice coordinates (x: ±100, y: ±42.5),
// team: 'primary' | 'opponent'.
let id = 0;
const next = () => ++id;

export const demoEvents = [
  // Period 1
  { id: next(), team: 'primary', type: 'shot-on-goal', x: 72, y: 8, period: 1, timeInPeriod: '18:42', shooterId: 1, shooterName: 'A. Svechnikov', shotType: 'Wrist', shotSpeed: 88, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'missed-shot', x: 65, y: -20, period: 1, timeInPeriod: '15:03', shooterId: 2, shooterName: 'S. Aho', shotType: 'Slap', zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'shot-on-goal', x: -70, y: 5, period: 1, timeInPeriod: '12:51', shooterId: 101, shooterName: 'C. McDavid', shotType: 'Wrist', shotSpeed: 91, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'goal', x: 84, y: 3, period: 1, timeInPeriod: '9:14', shooterId: 1, shooterName: 'A. Svechnikov', assist1Name: 'S. Aho', assist2Name: 'J. Slavin', goalieName: 'S. Skinner', shotType: 'Wrist', shotSpeed: 94, zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'blocked-shot', x: -58, y: 12, period: 1, timeInPeriod: '6:37', shooterId: 102, shooterName: 'L. Draisaitl', blockerName: 'B. Pesce', zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'shot-on-goal', x: 60, y: -25, period: 1, timeInPeriod: '3:22', shooterId: 3, shooterName: 'S. Jarvis', shotType: 'Snap', shotSpeed: 82, zoneCode: 'O' },

  // Period 2
  { id: next(), team: 'opponent', type: 'goal', x: -80, y: -6, period: 2, timeInPeriod: '17:55', shooterId: 101, shooterName: 'C. McDavid', assist1Name: 'L. Draisaitl', goalieName: 'F. Andersen', shotType: 'Wrist', shotSpeed: 96, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'shot-on-goal', x: 55, y: 18, period: 2, timeInPeriod: '14:10', shooterId: 4, shooterName: 'M. Necas', shotType: 'Wrist', shotSpeed: 79, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'missed-shot', x: 90, y: -4, period: 2, timeInPeriod: '11:48', shooterId: 2, shooterName: 'S. Aho', shotType: 'Backhand', zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'shot-on-goal', x: -68, y: -18, period: 2, timeInPeriod: '9:02', shooterId: 103, shooterName: 'Z. Hyman', shotType: 'Slap', shotSpeed: 89, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'blocked-shot', x: 45, y: 30, period: 2, timeInPeriod: '5:19', shooterId: 5, shooterName: 'J. Slavin', blockerName: 'D. Nurse', zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'goal', x: 86, y: -2, period: 2, timeInPeriod: '2:47', shooterId: 3, shooterName: 'S. Jarvis', assist1Name: 'M. Necas', goalieName: 'S. Skinner', shotType: 'Tip-in', shotSpeed: 71, zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'missed-shot', x: -75, y: 15, period: 2, timeInPeriod: '0:38', shooterId: 102, shooterName: 'L. Draisaitl', shotType: 'Wrist', zoneCode: 'O' },

  // Period 3
  { id: next(), team: 'opponent', type: 'shot-on-goal', x: -62, y: 22, period: 3, timeInPeriod: '16:29', shooterId: 104, shooterName: 'E. Bouchard', shotType: 'Slap', shotSpeed: 97, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'shot-on-goal', x: 70, y: -10, period: 3, timeInPeriod: '13:15', shooterId: 1, shooterName: 'A. Svechnikov', shotType: 'Wrist', shotSpeed: 85, zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'goal', x: -85, y: 1, period: 3, timeInPeriod: '10:03', shooterId: 103, shooterName: 'Z. Hyman', assist1Name: 'C. McDavid', assist2Name: 'D. Nurse', goalieName: 'F. Andersen', shotType: 'Wrist', shotSpeed: 90, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'missed-shot', x: 58, y: 26, period: 3, timeInPeriod: '7:41', shooterId: 4, shooterName: 'M. Necas', shotType: 'Snap', zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'blocked-shot', x: 40, y: -32, period: 3, timeInPeriod: '4:12', shooterId: 2, shooterName: 'S. Aho', blockerName: 'E. Bouchard', zoneCode: 'O' },
  { id: next(), team: 'opponent', type: 'blocked-shot', x: -50, y: -8, period: 3, timeInPeriod: '1:58', shooterId: 101, shooterName: 'C. McDavid', blockerName: 'J. Slavin', zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'shot-on-goal', x: 78, y: 6, period: 3, timeInPeriod: '0:22', shooterId: 1, shooterName: 'A. Svechnikov', shotType: 'Wrist', shotSpeed: 92, zoneCode: 'O' },

  // Overtime
  { id: next(), team: 'opponent', type: 'shot-on-goal', x: -72, y: -3, period: 4, timeInPeriod: '3:40', shooterId: 101, shooterName: 'C. McDavid', shotType: 'Wrist', shotSpeed: 93, zoneCode: 'O' },
  { id: next(), team: 'primary', type: 'goal', x: 88, y: 0, period: 4, timeInPeriod: '1:12', shooterId: 2, shooterName: 'S. Aho', assist1Name: 'A. Svechnikov', goalieName: 'S. Skinner', shotType: 'Wrist', shotSpeed: 95, zoneCode: 'O' },
];
