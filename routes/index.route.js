import express from 'express';
import contractRoutes from './contract.route';

const router = express.Router(); // eslint-disable-line new-cap

/* Base route: [/api] */

/** GET [/health-check]
*  - Check service health */

router.get('/health-check', (req, res) =>
    res.send('Hello hooman!')
);

router.use('/contract', contractRoutes);

export default router;
