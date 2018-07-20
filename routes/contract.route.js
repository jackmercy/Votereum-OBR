import express from 'express';
import contractController from '../controller/contract.controller';

const router = express.Router();

/* Base route: [/api/contract] */

router.get('/update')
    .get(contractController.updateContractInfo);

export default router;
