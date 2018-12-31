/* Import libarys */
import express from 'express';
import Web3    from 'web3';
import amqp    from 'amqplib/callback_api';
import router     from './routes/index.route';
/* Import libarys */

import Config     from './config/config-key';
import UrlConfig  from './config/url.config';
import votingJson from './truffle/build/contracts/BallotContract';
/* Import controllers */
import CitizenController   from './controllers/citizen.controller';
import CandidateController from './controllers/candidate.controller';
import BallotController from './controllers/ballot.controller';
/* Import controllers */

/* Init variable */

global.app = express();
global.amqpConn = null;
var port = process.env.port || 8000;

/* Init variable */

function startAMQP() {
    amqp.connect('amqp://localhost', function(err, conn) {
        if (err) {
            console.error('[AMQP-ERR]', err.message);

            return setTimeout(startAMQP(), 1500);
        }
        conn.on('error', function (err) {
            if (err.message !== 'Connection closing') {
                console.error('[AMQP] conn error: ', err.message);
            }
        });
        conn.on('close', function() {
            console.error('[AMQP] reconnecting in 1s');

            return setTimeout(startAMQP(), 1500);
        });

        amqpConn = conn;

        setupAMQPControllers();

        console.log(`[AMQP] connected at ${UrlConfig.amqpURL}`);
    });
}

/* Routes ---------------------- */
//app.use('/api', router);
/* Routes ---------------------- */

function setupAMQPControllers() {
    /* Candidate controller */
    //CandidateController.voteForCandidates();
    /* End of Candidate controller */

    /* Citizen controller */
    //CitizenController.isAccountUnlocked();
    /* End of Citizen controller */
    BallotController.getBallotPhases();
    BallotController.getBallotInfo();
    BallotController.postBallotInfo();
    BallotController.postCloseBallot();
    BallotController.postCandidates();
    BallotController.getCandidates();
    BallotController.getIsFinalized();
    BallotController.postFinalizeBallot();
    BallotController.postGiveRightToVote();
    BallotController.postHasRightToVote();
    BallotController.postResetTime();
    BallotController.postClaimStoredAmount();
    BallotController.postVoteForCandidates();
    BallotController.postStoreBlockchainAccount();

    BallotController.postCandidateResult();
}


// start server on port
app.listen(port, function() {
    console.log(`OBR is running on port ${port}`);
    startAMQP();
});


//Connecting to blockchain
var abiDefinition;
var ballotContract;
var contractOption = {
    from: Config.OWNER,
    gasPrice: '10000000000000', //1Gwei
    gas: 1000000
};

abiDefinition = votingJson.abi;

//Testnet
global.web3 = new Web3('http://localhost:8545');
global.ballotContract = new web3.eth.Contract(
    abiDefinition,
    Config.CONTRACT_ADDRESS,
    contractOption
);

//Ganache

/*global.web3 = new Web3('http://localhost:8545');
global.ballotContract = new web3.eth.Contract(
    abiDefinition,
    "0x345ca3e014aaf5dca488057592ee47305d9b3e10",
    contractOption);*/


if (web3) {
    //console.log(global.ballotContract.option);
    console.log('successfully connected to blockchain. Address: ' + Config.CONTRACT_ADDRESS);
}
else {
    console.log('error on connecting blockchain');
}

export default app;
