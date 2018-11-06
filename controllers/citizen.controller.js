
function convertToBytes32(text) {
    return web3.utils.asciiToHex(text);
}

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

function isAccountUnlocked() {
    amqpConn.createChannel(function(err, ch) {
        var q = 'citizen_queue';

        ch.assertQueue(q, {durable: false});
        /* We might want to run more than one server process.
        In order to spread the load equally over multiple servers
        we need to set the prefetch setting on channel.*/
        ch.prefetch(1);
        console.log(' [AMQP] Awaiting Citizen requests');

        /* use Channel.consume to consume messages from the queue.
        Then enter the callback function where do the work
        and send the response back.*/
        ch.consume(q, function reply(msg) {
            console.log('[x] consume request from API isAccountUnlocked()');
            /*
                msg.content = {
                    address: '0x21123123132'
                } 
             */
            var voter = JSON.parse(msg.content.toString());
            web3.eth.personal.unlockAccount(voter['address'], '', 60000000)
                .then((response) => {
                    var res_msg = {
                        isAccountUnlocked: response
                    };

                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(res_msg)),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                })
                .catch((error) => {
                    console.log(error);
                    var error_msg = {
                        message: 'error'
                    };
                    
                    ch.sendToQueue(
                        msg.properties.replyTo,
                        new Buffer(JSON.stringify(error_msg)),
                        {
                            correlationId: msg.properties.correlationId
                        }
                    );
                });

            /* ch.sendToQueue(
                msg.properties.replyTo,
                new Buffer(r.toString()),
                {
                    correlationId: msg.properties.correlationId
                }
            ); */

            ch.ack(msg);
        });
    });
}

export default {
    setContractInfo,
    isAccountUnlocked
};
