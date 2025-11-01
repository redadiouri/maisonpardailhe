const schedules = require('../data/schedules');

describe('schedules data', () => {
  it('contains expected locations and ranges', () => {
    expect(schedules).toBeDefined();
    expect(schedules.roquettes).toBeDefined();
    expect(schedules.toulouse).toBeDefined();
    expect(typeof schedules.roquettes.ranges).toBe('object');
  });
});
