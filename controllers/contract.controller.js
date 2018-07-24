function convertToBytes32(text) {
    return web3.utils.asciiToHex(text);
}
/*POST: [/api/contract]
req.body:
{
    "ballotName": "President Election",
    "ballotStartTime": 1540370700,
    "ballotEndTime": 1543049100
}
*/
function setContractInfo(req, res) {
    var data = req.body;
    console.log(data);
    try {
        ballotContract.methods.setupBallot(
            convertToBytes32(data['ballotName']),
            data['ballotEndTime'],
            data['ballotStartTime']
        ).send()
            .on('transactionHash', function (hash) {
                console.log(hash);
                res.send('Contract info was set!');
            })
            .on('error', function (error) {
                console.log(error);
                res.send(error);
            });
    }
    catch (e) {
        res.status(400);
        res.send(e.toString());
    }

}

function setCandidate(req, res) {

}

export default {
    setContractInfo,
    setCandidate
};
