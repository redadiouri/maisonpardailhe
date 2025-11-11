/**
 * Migration pour ajouter les champs de paiement Stripe
 */

exports.up = function(knex) {
  return knex.schema.table('commandes', function(table) {
    // Statut du paiement
    table.enum('statut_paiement', ['impaye', 'paye', 'rembourse'])
      .notNullable()
      .defaultTo('impaye')
      .comment('Statut du paiement de la commande');
    
    // ID de la session Stripe Checkout
    table.string('stripe_checkout_session_id', 255)
      .nullable()
      .comment('ID de la session Stripe Checkout');
    
    // ID de l\'intent de paiement Stripe
    table.string('stripe_payment_intent_id', 255)
      .nullable()
      .comment('ID du Payment Intent Stripe');
    
    // Date du paiement
    table.timestamp('date_paiement')
      .nullable()
      .comment('Date à laquelle le paiement a été effectué');
    
    // Méthode de paiement utilisée
    table.string('methode_paiement', 50)
      .nullable()
      .comment('Méthode de paiement (card, paypal, etc.)');
    
    // Index pour recherche rapide par session Stripe
    table.index('stripe_checkout_session_id', 'idx_stripe_session');
    table.index('statut_paiement', 'idx_statut_paiement');
  });
};

exports.down = function(knex) {
  return knex.schema.table('commandes', function(table) {
    table.dropIndex('stripe_checkout_session_id', 'idx_stripe_session');
    table.dropIndex('statut_paiement', 'idx_statut_paiement');
    table.dropColumn('statut_paiement');
    table.dropColumn('stripe_checkout_session_id');
    table.dropColumn('stripe_payment_intent_id');
    table.dropColumn('date_paiement');
    table.dropColumn('methode_paiement');
  });
};
