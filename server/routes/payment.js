const express = require('express');
const router = express.Router();
const db = require('../models/db');
const logger = require('../logger');

// Charger Stripe de manière conditionnelle
let stripe = null;
let stripeAvailable = false;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    stripeAvailable = true;
    logger.info('Stripe initialisé avec succès');
  } else {
    logger.warn('STRIPE_SECRET_KEY non défini - paiements désactivés');
  }
} catch (e) {
  logger.warn('Erreur initialisation Stripe - paiements désactivés:', e.message);
}

/**
 * GET /api/payment/config
 * Vérifier si Stripe est disponible
 */
router.get('/config', (req, res) => {
  res.json({
    stripeAvailable: stripeAvailable && !!stripe,
    paymentEnabled: stripeAvailable && !!stripe
  });
});

/**
 * POST /api/payment/create-checkout-session
 * Créer une session Stripe Checkout pour une commande
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ 
        error: 'Stripe n\'est pas configuré. Veuillez ajouter STRIPE_SECRET_KEY dans .env' 
      });
    }

    const { commande_id } = req.body;
    
    if (!commande_id) {
      return res.status(400).json({ error: 'ID de commande manquant' });
    }

    // Récupérer la commande
    const [rows] = await db.execute(
      'SELECT * FROM commandes WHERE id = ?',
      [commande_id]
    );
    
    const commande = rows[0];
    if (!commande) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    // Vérifier si déjà payée
    if (commande.statut_paiement === 'paye') {
      return res.status(400).json({ error: 'Cette commande est déjà payée' });
    }

    // Calculer le montant (total_cents)
    const amount = commande.total_cents || 0;
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide pour le paiement' });
    }

    // URL de succès et d'annulation
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const successUrl = `${baseUrl}/commande.html?id=${commande_id}&payment=success`;
    const cancelUrl = `${baseUrl}/commande.html?id=${commande_id}&payment=cancel`;

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Commande #${commande_id} - Maison Pardailhé`,
              description: `Retrait prévu le ${commande.date_retrait} à ${commande.creneau}`,
            },
            unit_amount: amount, // en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(commande_id),
      customer_email: commande.email || undefined,
      metadata: {
        commande_id: String(commande_id),
        nom_complet: commande.nom_complet,
        telephone: commande.telephone,
      },
    });

    // Sauvegarder l'ID de session dans la base de données
    await db.execute(
      'UPDATE commandes SET stripe_checkout_session_id = ? WHERE id = ?',
      [session.id, commande_id]
    );

    logger.info({ commande_id, session_id: session.id }, 'Stripe checkout session créée');

    res.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Erreur création session Stripe');
    res.status(500).json({ 
      error: 'Erreur lors de la création de la session de paiement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/payment/webhook
 * Webhook Stripe pour gérer les événements de paiement
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send('Stripe non configuré');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn('STRIPE_WEBHOOK_SECRET non configuré');
      return res.status(400).send('Webhook secret non configuré');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error({ error: err.message }, 'Erreur signature webhook Stripe');
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les événements
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const commande_id = session.metadata.commande_id || session.client_reference_id;
        
        if (commande_id) {
          // Marquer la commande comme payée
          await db.execute(
            `UPDATE commandes 
             SET statut_paiement = 'paye', 
                 stripe_payment_intent_id = ?, 
                 date_paiement = NOW(),
                 methode_paiement = ?
             WHERE id = ?`,
            [session.payment_intent, session.payment_method_types?.[0] || 'card', commande_id]
          );
          
          logger.info({ commande_id, session_id: session.id }, 'Paiement confirmé via webhook');
        }
        break;

      case 'payment_intent.payment_failed':
        logger.warn({ event_type: event.type }, 'Paiement échoué');
        break;

      default:
        logger.info({ event_type: event.type }, 'Événement webhook Stripe non géré');
    }

    res.json({ received: true });

  } catch (error) {
    logger.error({ error: error.message }, 'Erreur traitement webhook Stripe');
    res.status(500).send('Erreur serveur');
  }
});

/**
 * GET /api/payment/status/:commande_id
 * Vérifier le statut de paiement d'une commande
 */
router.get('/status/:commande_id', async (req, res) => {
  try {
    const { commande_id } = req.params;
    
    const [rows] = await db.execute(
      'SELECT statut_paiement, date_paiement, methode_paiement FROM commandes WHERE id = ?',
      [commande_id]
    );
    
    const commande = rows[0];
    if (!commande) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    res.json({
      statut_paiement: commande.statut_paiement,
      date_paiement: commande.date_paiement,
      methode_paiement: commande.methode_paiement,
      is_paid: commande.statut_paiement === 'paye'
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Erreur récupération statut paiement');
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
