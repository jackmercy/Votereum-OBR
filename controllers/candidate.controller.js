import Config from '../config/config-key';
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
    return web3.utils.isAddress(address);
}
/*-------------------------------------*/

/* refactor */


export default {

};

