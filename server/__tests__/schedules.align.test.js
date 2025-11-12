const schedules = require('../data/schedules');

function minutesFromHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

describe('schedules ranges are 15-minute aligned', () => {
  Object.keys(schedules).forEach((loc) => {
    test(`${loc} ranges are 15-minute aligned`, () => {
      const cfg = schedules[loc];
      Object.values(cfg.ranges).forEach((dayRanges) => {
        dayRanges.forEach(([start, end]) => {
          const s = minutesFromHHMM(start);
          const e = minutesFromHHMM(end);
          expect(s % 15).toBe(0);
          expect(e % 15).toBe(0);
          expect(e).toBeGreaterThan(s);
        });
      });
    });
  });
});
