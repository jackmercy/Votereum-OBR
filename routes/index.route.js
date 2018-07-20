import express from 'express';

const router = express.Router(); // eslint-disable-line new-cap

/* Base route: [/api] */

/** GET [/health-check]
*  - Check service health */
router.get('/check', (req, res) =>
  res.send('Hello hooman!')
);

export default router;
