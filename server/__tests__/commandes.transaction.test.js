const request = require('supertest');
const express = require('express');

// Mocks: middleware and side-effects so we can test transactional flow
jest.mock('../middleware/validation', () => ({
  validate: () => (req, res, next) => next(),
  commandeSchema: {}
}));
jest.mock('../middleware/sanitize', () => ({
  sanitizeMiddleware: () => (req, res, next) => next()
}));
jest.mock('../middleware/rateLimits', () => ({ commandeLimiter: (req, res, next) => next() }));
jest.mock('../models/commande', () => ({ create: jest.fn(), getById: jest.fn() }));
jest.mock('../utils/email', () => ({ sendCommandeEmail: jest.fn() }));
jest.mock('../utils/eventEmitter', () => ({ broadcastNewOrder: jest.fn() }));

describe('POST /api/commandes transactional flow', () => {
  let app;
  let conn;

  beforeEach(() => {
    jest.resetModules();
    conn = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn()
    };

    // Mock db.getConnection to return our fake conn
    jest.mock('../models/db', () => ({
      getConnection: async () => conn
    }));

    // Require router after mocks
    const commandes = require('../routes/commandes');
    app = express();
    app.use(express.json());
    app.use('/api/commandes', commandes);
  });

  test('rolls back and returns 409 when stock insufficient', async () => {
    // For SELECT ... FOR UPDATE return a row with low stock
    conn.execute.mockImplementation(async (sql, params) => {
      if (/SELECT stock, price_cents FROM menus/i.test(sql)) {
        return [[{ stock: 0, price_cents: 500 }], undefined];
      }
      // Fallback for other queries
      return [[], undefined];
    });

    const payload = {
      nom_complet: 'Test',
      telephone: '0600000000',
      email: 'a@b.c',
      date_retrait: '2099-12-01',
      creneau: '12:00',
      location: 'roquettes',
      items: [{ menu_id: 1, qty: 1 }]
    };

    const res = await request(app).post('/api/commandes').send(payload);
    expect(res.status).toBe(409);
    // ensure rollback was called and commit not called
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});
