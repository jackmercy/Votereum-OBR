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

## Authors
* [Cao Minh Khoi](https://github.com/jackmercy)
  * Email: [14520432@gm.uit.edu.vn](mailto:14520432@gm.uit.edu.vn) or [khoicaominh.mmt@gmail.com](mailto:khoicaominh.mmt@gmail.com)
* [Vo Cao Thuy Linh](https://github.com/Dollyns)
  * Email: [14520473@gm.uit.edu.vn](mailto:14520473@gm.uit.edu.vn) or [linhvocaothuy@gmail.com](mailto:linhvocaothuy@gmail.com)

---

### Requirement

* [Nodejs v9](https://nodejs.org/en/download/)
* [erlang](https://www.erlang.org/downloads)
* [RabbitMQ](https://www.rabbitmq.com/#getstarted)
* [Geth client](https://geth.ethereum.org/downloads/)
* [Babel CLI](https://babeljs.io/docs/en/babel-cli) or using npm `npm install --save-dev @babel/core @babel/cli`
* [amqplib](https://github.com/squaremo/amqp.node) or using npm `npm install --save amqplib`

### Install

* `npm install`

### Running OBR
1. Before run this server, make sure you're running a geth client

* For dev env run:
`geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal,debug --rpccorsdomain "http://localhost:4200"`
* For prod env run:
`geth --rinkeby --rpc --rpcapi db,eth,net,web3,personal,debug --rpccorsdomain "{your VM url}"`

2. Make sure RabbitMQ service is running
3. Run `npm start` in order to start OBR server.
=> OBR will run at [localhost:8000]()
