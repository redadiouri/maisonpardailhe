# Alternatives SMTP pour Maison Pardailhé

## Gmail (actuel - nécessite App Password)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=maisonpardailhe.site@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App Password de 16 caractères
FROM_ADDRESS="Maison Pardailhé <maisonpardailhe.site@gmail.com>"
```

## SendGrid (recommandé pour production)
**Avantages:** Gratuit jusqu'à 100 emails/jour, facile à configurer
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.votre_api_key_ici
FROM_ADDRESS="Maison Pardailhé <noreply@maisonpardailhe.fr>"
```
Setup: https://sendgrid.com → Sign up → Settings → API Keys

## Mailgun
**Avantages:** Gratuit jusqu'à 5000 emails/mois
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.maisonpardailhe.fr
SMTP_PASS=votre_password_mailgun
FROM_ADDRESS="Maison Pardailhé <noreply@maisonpardailhe.fr>"
```
Setup: https://mailgun.com → Sign up → Domains → Add domain

## Brevo (ex-Sendinblue)
**Avantages:** Interface en français, 300 emails/jour gratuit
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre_email_brevo
SMTP_PASS=votre_api_key_brevo
FROM_ADDRESS="Maison Pardailhé <noreply@maisonpardailhe.fr>"
```
Setup: https://brevo.com → Sign up → SMTP & API → SMTP

## Test local (développement uniquement)
**Mailtrap** - Pour tester sans envoyer de vrais emails
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=votre_username_mailtrap
SMTP_PASS=votre_password_mailtrap
FROM_ADDRESS="Maison Pardailhé <test@example.com>"
```
Setup: https://mailtrap.io → Sign up → Inboxes

## Recommandation
Pour la production, utilisez **SendGrid** ou **Brevo** car:
- Plus fiable que Gmail
- Meilleure délivrabilité
- Statistiques d'envoi
- Pas besoin de gérer les App Passwords
