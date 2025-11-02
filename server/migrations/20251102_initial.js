/**
 * Initial baseline migration (no schema changes).
 * Use `npm run migrate:make -- <name>` to create new migrations and
 * `npm run migrate:latest` to apply them.
 *
 * This file intentionally does nothing; it provides a safe starting point
 * so teams can enable Knex migrations without implicit schema changes.
 */
exports.up = function (knex) {
  // no-op baseline migration
  return Promise.resolve();
};

exports.down = function (knex) {
  // no-op
  return Promise.resolve();
};
