<p align="center">
  <a href="http://votereum.com/">
    <img
      alt="Node.js"
      src="https://raw.githubusercontent.com/jackmercy/CSS-Auth0/master/votereum_full.png"
      width="400"
      style="background-color: #3c5064; border-radius: 10px"
    />
  </a>
</p>

# OBR server
---
1. Before run this server, make sure you're running a geth client

* For dev env run:
`geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal,debug --rpccorsdomain "http://localhost:4200"`
* For prod env run:
`geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal,debug --rpccorsdomain "{your VM url}"`

2. Make sure RabbitMQ service is running
3. Run `npm start` in order to start OBR server.
=> OBR will run at [localhost:8000]()
