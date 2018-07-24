import express from 'express';
import ContractController from '../controllers/contract.controller';

const router = express.Router();

/* Base route: [/api/contract] */

router.route('/')
    .post(ContractController.setContractInfo);

router.route('/candidate')
    .post(ContractController.setCandidate);

export default router;
