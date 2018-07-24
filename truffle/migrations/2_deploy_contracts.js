var BallotContract = artifacts.require('./BallotContract.sol');

module.exports = function(deployer) {
    deployer.deploy(BallotContract, {gas: 2000000});
};
