import express from 'express';
import ContractController from '../controllers/contract.controller';

const router = express.Router();

/* Base route: [/api/contract] */

router.route('/update')
    .get(ContractController.updateContractInfo);

export default router;
