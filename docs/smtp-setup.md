# Configuration SMTP Professionnel (Brevo)

## Pourquoi changer de Gmail ?
- ❌ Gmail : Réputation IP partagée, souvent bloqué comme spam
- ✅ Brevo : IP dédiée, SPF/DKIM configurés automatiquement
- ✅ **GRATUIT** jusqu'à 300 emails/jour (largement suffisant)
- ✅ Taux de délivrabilité 99%+

## 🚀 Configuration Brevo (5 minutes)

### Étape 1 : Créer un compte
1. Allez sur https://www.brevo.com/fr/
2. Créez un compte gratuit
3. Vérifiez votre email

### Étape 2 : Obtenir les clés SMTP
1. Connectez-vous à Brevo
2. Allez dans **Paramètres** > **SMTP & API**
3. Cliquez sur **SMTP**
4. Notez les informations :
   - Serveur SMTP : `smtp-relay.brevo.com`
   - Port : `587`
   - Login : votre email Brevo
   - Mot de passe : cliquez sur "Créer une nouvelle clé SMTP"

### Étape 3 : Configurer .env
Modifiez votre fichier `server/.env` :

```bash
# Remplacez la configuration Gmail par :
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre-email@brevo.com
SMTP_PASS=votre-cle-smtp-brevo
FROM_ADDRESS="Maison Pardailhé <noreply@votredomaine.fr>"
```

### Étape 4 : Ajouter un expéditeur vérifié
1. Dans Brevo > **Expéditeurs**
2. Ajoutez votre email (ex: `noreply@maisonpardailhe.fr`)
3. Vérifiez l'email

### Étape 5 : Tester
```bash
cd server
node scripts/test_mail_tester.js NOUVELLE-ADRESSE-MAIL-TESTER
```

## 📊 Résultats attendus
- Score mail-tester : **10/10**
- Délivrabilité : **99%+** (inbox, pas spam)
- SPF/DKIM : ✅ Automatique
- DMARC : ✅ Configuré

## Alternative : AWS SES
Si vous avez besoin de plus de volume :
- **Gratuit** jusqu'à 62 000 emails/mois
- Configuration un peu plus complexe
- Excellente délivrabilité

## Alternative : SendGrid
- **Gratuit** jusqu'à 100 emails/jour
- Interface simple
- Bon pour débuter
