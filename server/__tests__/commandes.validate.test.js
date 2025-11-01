const schedules = require('../data/schedules');

describe('schedules data', () => {
  it('exports roquettes and toulouse', () => {
    expect(schedules).toBeDefined();
    expect(schedules.roquettes).toBeDefined();
    expect(schedules.toulouse).toBeDefined();
    expect(Array.isArray(schedules.roquettes.ranges[0])).toBe(true);
  });
});
