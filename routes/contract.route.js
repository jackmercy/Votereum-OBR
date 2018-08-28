import express from 'express';
import ContractController from '../controllers/contract.controller';

const router = express.Router();

/* Base route: [/api/contract] */

router.route('/')
    .post(ContractController.postBallotInfo);

router.route('/')
    .get(ContractController.getBallotInfo);

router.route('/close')
    .get(ContractController.getCloseBallot);

router.route('/candidate')
    .post(ContractController.postCandidates);

router.route('/candidate')
    .get(ContractController.getCandidates);

router.route('/candidate/result')
    .post(ContractController.postCandidateVoterList);

router.route('/voteForCandidates')
    .post(ContractController.postVoteForCandidates);

router.route('/test').get(ContractController.test);

export default router;
