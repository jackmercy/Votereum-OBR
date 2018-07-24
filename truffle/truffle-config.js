module.exports = {
    networks: {
        development: {
            host: '127.0.0.1',
            port: 9545,
            network_id: '*' // Match any network id
        },
        rinkeby: {
            host: '127.0.0.1',
            port: 8545,
            from: '0x6123cFfB3dDDfEA5e4445e1C1b5D53f0F502725C',
            network_id: '*',
            gasPrice: 100000000000
        }
    }
};
