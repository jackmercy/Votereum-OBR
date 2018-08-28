import Config from '../config-key';
import EthereumTx from 'ethereumjs-tx';


const options = {
    from: Config.OWNER,
    gasPrice: 20000000000,
    gas: 2000000
};

/*--------------Utils------------------*/
function convertToBytes32(text) {
    return web3.utils.asciiToHex(text);
}

function hexToString(hex) {
    return web3.utils.hexToAscii(hex).replace(/\0/g, '');
}
/*-------------------------------------*/

/*
- POST: [/api/contract]
- req.body:
Condition: startRegPhase < endRegPhase < startVotingPhase < endVotingPhase
{
    "ballotName": "President Election",
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
function postBallotInfo(req, res) {
    var data = req.body;
    var candidateIDs = data['candidateIDs'].map(candidate => convertToBytes32(candidate));
    try {
        ballotContract.methods.setupBallot(
            convertToBytes32(data['ballotName']),
            data['startRegPhase'],
            data['endRegPhase'],
            data['startVotingPhase'],
            data['endVotingPhase'],
            candidateIDs
        ).send(options)
            .on('transactionHash', function (hash) {
                console.log(hash);
                res.send('Contract info was set!');
            })
            .on('error', function (error) {
                console.log(error);
                res.send(error);
            })
            .on('receipt', function (receipt) {
                console.log(receipt);
            });
    }
    catch (e) {
        res.status(400);
        res.send(e.toString());
    }

}

/*
- GET: [/api/contract]
- Response:
{
    "ballotName": "President Election",
    "startRegPhase": "1543050000",
    "endRegPhase": "1543080000",
    "startVotingPhase": "1540370700",
    "endVotingPhase": "1543049100",
    "isFinalized": false,
    "registeredVoterCount": "0",
    "votedVoterCount": "0"
}
*/
function getBallotInfo(req, res) {
    ballotContract.methods.getBallotInfo().call()
        .then(function (data) {
            const ballotInfo = {
                ballotName: hexToString(data[0]),
                startRegPhase: data[1],
                endRegPhase: data[2],
                startVotingPhase: data[3],
                endVotingPhase: data[4],
                isFinalized: data[5],
                registeredVoterCount: data[6],
                votedVoterCount: data[7]
            };

            res.json(ballotInfo);
        }).catch(function (error) {
            res.send(error);
        });
}

/*GET: [/api/contract/close]*/
function getCloseBallot(req, res) {
    ballotContract.methods.close().send(options)
        .then(function (result) {
        }).catch(function (error) {
            res.send(error);
        });
}


/*
- POST: [/api/contract/candidate]
- req.body:
{
    "candidates": [ "1000", "1002", "1003"]
}
*/
function postCandidates(req, res) {
    var data = req.body;
    var candidates = data['candidates'];
    candidates = candidates.map(candidate => convertToBytes32(candidate));

    ballotContract.methods.addCandidates(candidates)
        .send(options)
        .on('transactionHash', function (hash) {
            console.log(hash);
            res.send('Contract info was set!');
        })
        .on('error', function (error) {
            console.log(error);
            res.send(error);
        });
}

/*
- GET: [/api/contract/candidate]
- Response:
{
    "candidates": [
        "1",
        "2",
        "3",
        "4"
    ]
}
*/
function getCandidates(req, res) {
    ballotContract.methods.getCandidateList()
        .call().then(function (result) {
            var candidates = result.map(value => hexToString(value));
            var response = {
                candidates: candidates
            };
            res.json(response);
        });
}

/*
- POST: [/api/contract/candidate/result]
- req.body:
{
    "candidateID": "1001"
}
*/
function postCandidateVoterList(req, res) {
    var id = req.body['candidateID'];

    ballotContract.methods.getCandidateVoterList(convertToBytes32(id))
        .call().then(function (result) {
            console.log(result);
        });
}

/*
- POST: [/api/contract/voteForCandidates]
- req.body:
{
    "candidates": [ "1", "2", "3"]
}
*/
function postVoteForCandidates(req, res) {
    var data = req.body;
    var candidates = data['candidates'];
    candidates = candidates.map(candidate => convertToBytes32(candidate));

    ballotContract.methods.voteForCandidates(candidates)
        .send(options)
        .on('transactionHash', function (hash) {
            res.send(hash);
        })
        .on('error', function (error) {
            console.log(error);
        });
}

function postSend() {
    
}

/*-------------Voter section -----------------*/

//Convert this method into string for 'data' section of transactionObject
function voteForCandidateEncode(_candidates) {
    _candidates = _candidates.map(candidate => convertToBytes32(candidate));

    return ballotContract.methods.voteForCandidates(_candidates).encodeABI(); //hex
}

//Generate trasactionObject
function getTransactionObject(_from, _to, _gas, _gasPrice, _value, _data) {
    return {
        from: _from,
        to: _to,
        gas: web3.utils.toHex(_gas),
        gasPrice: web3.utils.toHex(_gasPrice),
        value: web3.utils.toHex(_value),
        data: _data
    };
}

//Sign transaction
function getSignedTransaction(_txObject, _key) {
    return web3.eth.accounts.signTransaction(_txObject, _key);
}

function createAccount() {
    return web3.eth.accounts.create();
}
/*No need to unlock to sign transaction
function unlockAccount(address, key, time) {
    return web3.eth.personal.unlockAccount(address, key, time);
}*/



function  test() {
    const txObject = getTransactionObject(
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
        });


}

export default {
    postBallotInfo,
    getBallotInfo,
    postCandidates,
    getCandidates,
    postCandidateVoterList,
    postVoteForCandidates,
    getCloseBallot,
    test
};
