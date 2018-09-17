var BallotContract = artifacts.require('./BallotContract.sol');

module.exports = function(deployer) {
    deployer.deploy(BallotContract, {gas: 4000000});
};
