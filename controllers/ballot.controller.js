import Config from '../config/config-key';
import EthereumTx from 'ethereumjs-tx';



const options = {
    from: Config.OWNER,
    gasPrice: 2000000000,
    gas: 2000000
};

/*--------------Utils------------------*/
function convertToBytes32(text) {
    return web3.utils.asciiToHex(text);
}

function hexToString(hex) {
    return web3.utils.hexToAscii(hex).replace(/\0/g, '');
}

function getErrorObject(error) {
    return { message: error.toString() };
}

function getResponseObject(data) {
    return {
        message: data,
        error: false
    };
}

function getErrorObject(message) {
    return {
        message: message,
        error: true
    };
}

function isAccountUnlocked(time) {
    return web3.eth.personal.unlockAccount(Config.OWNER, Config.PASSWORD, time)
        .then(function (response) {
            return true;
        }).catch(function (error) {
            console.log('isAccountUnlocked: ' + error);
            return false;
        });
}

function isValidAddress(address) {
    console.log(`isValidAddress: ${address}`);
    return web3.utils.isAddress(address);
}
/*-------------------------------------*/



/*--------------EA Section-----------------*/
/*
- GET: [/api/contract]
- Response:
{
    "ballotInfo": {
        "ballotName": "President Election",
        "isFinalized": false,
        "amount": 6000000000,
        "storedAmount": 60000000000,
        "address": "0x245fa4bafcd49393668490"
    },
    "phaseInfo": {
        "startRegPhase": "1543050000",
        "endRegPhase": "1543080000",
        "startVotingPhase": "1540370700",
        "endVotingPhase": "1543049100",
    },
    "voterInfo": {
         "registeredVoterCount": "0",
         "votedVoterCount": "0",
         "fundedVoterCount": "0",
    }
}
*/
function getBallotInfo() {
    var method = 'getBallotInfo';
    var ballotQueue = 'ballot_queue.' + method;
    amqpConn.createChannel(function(err, ch) {

        ch.assertQueue(ballotQueue, {durable: false});
        /* We might want to run more than one server process.
        In order to spread the load equally over multiple servers
        we need to set the prefetch setting on channel.*/
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');

        /* use Channel.consume to consume messages from the queue.
        Then enter the callback function where do the work
        and send the response back.*/
        ch.consume(ballotQueue, function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            ballotContract.methods.getBallotOverview().call()
                .then(function (data) {
                    const ballotInfo = {
                        ballotName: hexToString(data[0]),
                        limitCandidate: Number(data[1]),
                        isFinalized: data[2],
                        address: Config.CONTRACT_ADDRESS,
                        amount: Number(data[3]),
                        storedAmount: Number(data[4])
                    };

                    const phaseInfo = {
                        startRegPhase: data[5],
                        endRegPhase: data[6],
                        startVotingPhase: data[7],
                        endVotingPhase: data[8]
                    };

                    const voterInfo = {
                        registeredVoterCount: data[9],
                        votedVoterCount: data[10]
                    };

                    const ballotOverview = {
                        ballotInfo: ballotInfo,
                        phaseInfo: phaseInfo,
                        voterInfo: voterInfo
                    }

                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(ballotOverview))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });
            ch.ack(msg);
        });
    });
}

/**
 * GET: [/api/get-ballot-phases]
 */
/*  */
function getBallotPhases() {
    var method = 'getBallotPhases';
    var ballotQueue = 'ballot_queue.' + method;
    amqpConn.createChannel(function(err, ch) {

        ch.assertQueue(ballotQueue, {durable: false});
        
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');

        ch.consume(ballotQueue, function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');
            ballotContract.methods.getBallotPhases().call()
                .then(function(data){
                    const phaseInfo = {
                        startRegPhase: data[0],
                        endRegPhase: data[1],
                        startVotingPhase: data[2],
                        endVotingPhase: data[3]
                    };
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(phaseInfo))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });
            ch.ack(msg);
        });
    });
}
/*
- POST: [/api/contract]
- message.content:
Condition: startRegPhase < endRegPhase < startVotingPhase < endVotingPhase
{
    "ballotName": "President Election",
    "fundAmount": 1000000,
    "limitCandidate": 3,
    "startRegPhase": "1540370700",
    "endRegPhase": "1543049100",
    "startVotingPhase": "1543050000",
    "endVotingPhase": "1543080000",
    "candidateIDs": [
        "1",
        "2",
        "3",
        "4"
    ]
}
*/
function postBallotInfo() {
    var method = 'postBallotInfo';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            var candidateIds = data['candidateIds'].map(candidate => convertToBytes32(candidate));
            console.log(candidateIds);

            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                /* console.log(isUnlocked); */
                ballotContract.methods.setupBallot(
                    convertToBytes32(data['ballotName']),
                    data['fundAmount'],
                    data['limitCandidate'],
                    data['startVotingPhase'],
                    data['endVotingPhase'],
                    data['startRegPhase'],
                    data['endRegPhase'],
                    candidateIds
                ).send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}


/* - POST: [/api/contract/close]*/
function postCloseBallot() {
    var method = 'postCloseBallot';
    var ballotQueue = 'ballot_queue.' + method;
    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            var data = JSON.parse(msg.content.toString());
            const phrase = convertToBytes32(data['phrase'].toLowerCase().trim());

            //-----Request + response handle here------
            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                ballotContract.methods.close(phrase).send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}


/*
- POST: [/api/contract/candidate]
- req.body:
{
    "candidates": [ "1000", "1002", "1003"]
}
*/
 function postCandidates() {
    var method = 'postCandidates';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());


            var candidates = data['candidateIds'];
            /* console.log(candidates); */
            candidates = candidates.map(candidate => convertToBytes32(candidate));
            console.log(candidates);

            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                /* console.log(isUnlocked); */
                ballotContract.methods.addCandidates(candidates)
                    .send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}


/*
- GET: [/api/ballot/candidate]
- Response:
{
    "candidateIds": [
        "1",
        "2",
        "3",
        "4"
    ]
}
*/
function getCandidates() {
    var method = 'getCandidates';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            ballotContract.methods.getCandidateList().call()
                .then(function (result) {
                    var candidates = result.map(value => hexToString(value));
                    var response = {
                        candidateIds: candidates
                    };
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(response))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });
            //--------------------------------------

            ch.ack(msg);
        });
    });


}


/*
- GET: [/api/contract/ballot/isFinalized]
- Response:
{
    "isFinalized": true
}
*/
function getIsFinalized() {
    var method = 'getIsFinalized';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            ballotContract.methods.isBallotFinalized().call()
                .then(function (result) {
                    const response = {
                        isFinalized: result
                    }
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(response))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });
            //--------------------------------------

            ch.ack(msg);
        });
    });


}


/*
- POST: [/api/ballot/finalize]
- req.body:
{
    "phrase": "finalize"
}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postFinalizeBallot() {
    var method = 'postFinalizeBallot';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            const phrase = convertToBytes32(data['phrase'].toLowerCase().trim());
            console.log(phrase);


            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                /* console.log(isUnlocked); */
                ballotContract.methods.finalizeBallot(phrase)
                    .send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- POST: [/api/ballot/finalize]
- req.body:
{
    "voterAddress": "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410"
}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postGiveRightToVote() {
    var method = 'postGiveRightToVote';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            var address = data['voterAddress'];

            var isUnlocked = await isAccountUnlocked(600);

            if (!isValidAddress(address)) {
                ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(getErrorObject('Invalid address'))),
                    {
                        correlationId: msg.properties.correlationId
                    }
                );
                ch.ack(msg);
                return;
            }
            if (isUnlocked) {

                ballotContract.methods.giveRightToVote(address).send(options)
                    .on('transactionHash', function (hash) {

                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}


/*
- POST: [/api/ballot/hasRight]
- req.body:
{
    "address": "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410"
}
- Response:
{
    "hasRight": true
}
*/
function postHasRightToVote() {
    var method = 'postHasRightToVote';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            var address = data['address']
            if (!isValidAddress(address)) {
                ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(getErrorObject('Invalid address'))),
                    {
                        correlationId: msg.properties.correlationId
                    }
                );
                ch.ack(msg);
                return;
            }

            ballotContract.methods.hasRightToVote(address).call()
                .then(function (result) {
                    const response = {
                        hasRight: result
                    }
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(response))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });

            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- GET: [/api/ballot/voterAddressList]
- Response:
{
    "voterAddressList": [
        "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410",
        "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410"
        "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410"
    ]
}
*/
function getVoterAddressList() {
    var method = 'getVoterAddressList';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------

            ballotContract.methods.getVoterAddressList().call()
                .then(function (result) {
                    const response = {
                        voterAddressList: result
                    }
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getResponseObject(response))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch(function (error) {
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });

            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- POST: [/api/ballot/resetTime]
- req.body:
{
    "phrase": "startRegPhase"
}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postResetTime() {
    var method = 'postResetTime';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            const phrase = convertToBytes32(data['phrase'].trim());
            console.log(phrase);


            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                /* console.log(isUnlocked); */
                ballotContract.methods.resetTime(phrase)
                    .send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }
            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- POST: [/api/ballot/claimStoredAmount]
- req.body:
{
    "phrase": "startRegPhase"
}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postClaimStoredAmount() {
    var method = 'postClaimStoredAmount';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            const phrase = convertToBytes32(data['phrase'].trim());

            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                ballotContract.methods.claimStoredAmount(phrase)
                    .send(options)
                    .on('transactionHash', function (hash) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(hash))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .on('error', function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }
            //--------------------------------------

            ch.ack(msg);
        });
    });
}


/*--------------End EA Section-----------------*/



/*----------------General Section------------*/

/*
- POST: [/api/contract/candidate/result]
- req.body:
{
    "candidateID": "1001"
}
- Response:
{
    "voteCount": 12,
    "whoVoted": [
        "0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410",
        "0x6123cFfB3dDDfEA5e4445e1C1b5D53f0F502725C"
    ]
}
*/
function postCandidateResult() {
    var method = 'postCandidateResult';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            var isUnlocked = await isAccountUnlocked(600);

            if (isUnlocked) {
                console.log('result of ' + convertToBytes32(data['candidateID']));
                ballotContract.methods.getCandidateResult(convertToBytes32(data['candidateID'])).call()
                    .then(function (data) {
                        const result = {
                            voteCount: data[0],
                            whoVoted: data[1]
                        };
                        console.log(result);

                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(result))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .catch(function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });

}

/*----------------End General Section------------*/


/*-------------Voter Section------------------*/

/*
- POST: [/api/contract/voteForCandidates]
- req.body:
{
    "citizenIds": "2321"
    "chainPassword": "123465"
    "candidateIds": [
        "1145",
        "0327",
        "7272"
    ]
}
- req.body to OBR: {
    "citizenIds": "2321"
    "address": "0x2123154"
    "chainPassword": "123465"
    "candidateIds": [
        "1145",
        "0327",
        "7272"
    ]
}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function  postVoteForCandidates() {

    var method = 'postVoteForCandidates';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            var candidates = data['candidateIds'];
            console.log(candidates);

            web3.eth.getTransactionCount(data['address']).then(function (_nonce) {
                const txObject = {
                    from: data['address'],
                    to: Config.CONTRACT_ADDRESS,
                    gas: web3.utils.toHex(6000000),
                    gasPrice: web3.utils.toHex(2000000000),
                    value: web3.utils.toHex(0),
                    data: voteForCandidateEncode(candidates),
                    nonce: _nonce
                };
                console.log(`txObjext: ${txObject}`);
                web3.eth.personal.signTransaction(txObject, data['chainPassword'])
                    .then(result => {
                        const raw = result['raw'];
                        web3.eth.sendSignedTransaction(raw)
                            .on('transactionHash', function (hash) {
                                console.log(`hash is: ${hash}`);
                                ch.sendToQueue(
                                    msg.properties.replyTo,
                                    new Buffer(JSON.stringify(getResponseObject(hash))),
                                    {
                                        correlationId: msg.properties.correlationId
                                    }
                                );
                            })
                            .on('error', function (error) {
                                console.log(error + 'send transaction');
                                ch.sendToQueue(

                                    msg.properties.replyTo,
                                    new Buffer(JSON.stringify(getErrorObject(error.message))),
                                    {
                                        correlationId: msg.properties.correlationId
                                    }
                                );
                            });
                    })
                    .catch(error => {
                        console.log(error + 'signed transaction');
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            });

/*            console.log(txObject);
            getSignedTransaction(txObject, data['chainPassword'])
                .then(result => {
                    const raw = result['rawTransaction'];
                    web3.eth.sendSignedTransaction(raw)
                        .on('transactionHash', function (hash) {
                            ch.sendToQueue(
                                msg.properties.replyTo,
                                new Buffer(JSON.stringify(getResponseObject(hash))),
                                {
                                    correlationId: msg.properties.correlationId
                                }
                            );
                        })
                        .on('error', function (error) {
                            console.log(error + 'send transaction');
                            ch.sendToQueue(

                                msg.properties.replyTo,
                                new Buffer(JSON.stringify(getErrorObject(error.message))),
                                {
                                    correlationId: msg.properties.correlationId
                                }
                            );
                        });
                })
                .catch(error => {
                    console.log(error + 'signed transaction');
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(getErrorObject(error.message))),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });*/
            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- POST: [/api/contract/claimFund]
- req.body: {}
- Response:
{
    "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postClaimFund() {

    var method = 'postClaimFund';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------



            if (isUnlocked) {
                console.log(isUnlocked);
                ballotContract.methods.voteForCandidates(candidates).send(options)
                    .then(function (data) {
                        const result = {
                            voteCount: data[0],
                            whoVoted: data[1]
                        };

                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getResponseObject(result))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    })
                    .catch(function (error) {
                        ch.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(getErrorObject(error.message))),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                    });
            }

            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*
- req.body: {
    "citizenId": "0432",
    "password": "123456"
}
- Response:
{
    "address": "0xb69748c2df17e870b48366ca06942140071b5cb0d0f7757791134336dfa80716"
}
*/
function postStoreBlockchainAccount() {

    var method = 'postStoreBlockchainAccount';
    var ballotQueue = 'ballot_queue.' + method;

    amqpConn.createChannel(function (err, ch) {
        ch.assertQueue(ballotQueue, { durable: false });
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting ' + method + ' requests');
        ch.consume(ballotQueue, async function reply(msg) {
            console.log('[x] consume request from API ' + method + '()');

            //-----Request + response handle here------
            var data = JSON.parse(msg.content.toString());

            web3.eth.personal.newAccount(data['password']).then((_address) => {
                const address = {
                    address: _address
                };
                console.log(_address);

                ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(getResponseObject(address))),
                    {
                        correlationId: msg.properties.correlationId
                    }
                );
            }).catch(error => {
                ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(getErrorObject(error.message))),
                    {
                        correlationId: msg.properties.correlationId
                    }
                );
            });

            //--------------------------------------

            ch.ack(msg);
        });
    });
}

/*-------------Voter section -----------------*/

//Convert this method into string for 'data' section of transactionObject
function voteForCandidateEncode(_candidates) {
    console.log(_candidates);
    _candidates = _candidates.map(candidate => convertToBytes32(candidate));
    console.log(_candidates);

    return ballotContract.methods.voteForCandidates(_candidates).encodeABI(); //hex
}

//Generate trasactionObject
function getTransactionObject(_from, _to, _gas, _gasPrice, _value, _data) {
    let txObject;
    web3.eth.getTransactionCount(_from).then(function (value) {
        txObject = {
            from: _from,
            to: _to,
            gas: web3.utils.toHex(_gas),
            gasPrice: web3.utils.toHex(_gasPrice),
            value: web3.utils.toHex(_value),
            data: _data,
            nonce: value
        };
        return txObject;
    });

}

//Sign transaction
function getSignedTransaction(_txObject, _password) {
    return web3.eth.personal.signTransaction(_txObject, _password);
}

function createAccount() {
    return web3.eth.accounts.create();
}
/*No need to unlock to sign transaction
function unlockAccount(address, key, time) {
    return web3.eth.personal.unlockAccount(address, key, time);
}*/



async function test() {
    var isUnlock = await isAccountUnlocked(600);
    if (isUnlock) {
        console.log('unlocked')
    }
    /*    const txObject = getTransactionObject(
            Config.OWNER,
            '0x11a4c82c1e5CBE015c6d09df2F30fD1668a5E410',
            1000000,
            20000000000,
            1000000000000000000,
            ''
        );

        getSignedTransaction(txObject, Config.KEY)
            .then(result => {
                const raw = result['rawTransaction'];
                web3.eth.sendSignedTransaction(raw)
                    .on('transactionHash', function (hash) {
                        console.log(hash);
                    }).on('error', function (error) {
                    console.log(error);
                });
            });*/


}

export default {
    postBallotInfo,
    getBallotInfo,
    getBallotPhases,
    postCandidates,
    getCandidates,
    getIsFinalized,
    postFinalizeBallot,
    postCloseBallot,
    postGiveRightToVote,
    postHasRightToVote,
    postResetTime,
    postClaimStoredAmount,

    postCandidateResult,

    postVoteForCandidates,
    postStoreBlockchainAccount,

    test
};
