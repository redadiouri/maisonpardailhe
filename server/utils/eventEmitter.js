const EventEmitter = require('events');

class OrderEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

    addClient(res) {
    this.clients.add(res);
  }

    removeClient(res) {
    this.clients.delete(res);
  }

    broadcastNewOrder(commande) {
    const payload = JSON.stringify({ type: 'new_order', data: commande });
    this.clients.forEach(client => {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
                this.clients.delete(client);
      }
    });
  }

    getClientCount() {
    return this.clients.size;
  }
}

const orderEmitter = new OrderEventEmitter();

module.exports = orderEmitter;
