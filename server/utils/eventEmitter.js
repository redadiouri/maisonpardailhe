// Simple event emitter for broadcasting new orders to admin SSE clients
const EventEmitter = require('events');

class OrderEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  // Add an SSE client
  addClient(res) {
    this.clients.add(res);
  }

  // Remove an SSE client
  removeClient(res) {
    this.clients.delete(res);
  }

  // Broadcast a new order to all connected admin clients
  broadcastNewOrder(commande) {
    const payload = JSON.stringify({ type: 'new_order', data: commande });
    this.clients.forEach(client => {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        // Client disconnected, remove it
        this.clients.delete(client);
      }
    });
  }

  // Get number of connected clients
  getClientCount() {
    return this.clients.size;
  }
}

// Singleton instance
const orderEmitter = new OrderEventEmitter();

module.exports = orderEmitter;
