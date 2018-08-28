import express from 'express';

import BallotController from '../controllers/ballot.controller';

const router = express.Router();

/* Base route: [/api/contract] */

router.route('/')
    .post(BallotController.postBallotInfo);

router.route('/')
    .get(BallotController.getBallotInfo);

router.route('/close')
    .get(BallotController.getCloseBallot);

router.route('/candidate')
    .post(BallotController.postCandidates);

router.route('/candidate')
    .get(BallotController.getCandidates);

router.route('/candidate/result')
    .post(BallotController.postCandidateVoterList);

router.route('/voteForCandidates')
    .post(BallotController.postVoteForCandidates);

router.route('/test').get(BallotController.test);

export default router;
