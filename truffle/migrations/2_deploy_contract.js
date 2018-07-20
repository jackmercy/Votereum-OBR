var Voting = artifacts.require("./Voting.sol");

module.exports = function(deployer) {
    deployer.deploy(Voting, ['5ad9535a561dfd00d0bb1e72',
        '5ad9535a561dfd00d0bb1e73',
        '5ad9535a561dfd00d0bb1e74',
        '5ad9535a561dfd00d0bb1e75',
        '5ad9535a561dfd00d0bb1e76',
        '5ad9535a561dfd00d0bb1e77'], {gas: 6000000});
};
