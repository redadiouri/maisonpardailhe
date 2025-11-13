const express = require('express');
const router = express.Router();

const schedules = require('../data/schedules');

router.get('/', async (req, res) => {
  try {
    const out = Object.fromEntries(
      Object.entries(schedules).map(([k, v]) => [
        k,
        {
          ranges: v.ranges || {},
          hint: v.hint || '',
          label: v.label || ''
        }
      ])
    );
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: 'Unable to load schedules' });
  }
});

module.exports = router;
