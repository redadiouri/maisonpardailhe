## Mise à jour des références externes pour le domaine

Ce document liste les actions recommandées pour propager le changement de domaine vers `https://maisonpardailhé.fr` auprès des services externes (search, CDN, DNS, email, etc.).

Remarque importante : les services qui ne supportent pas les caractères accentués utilisent la forme Punycode. La conversion pour `maisonpardailhé.fr` est :

- Punycode (ASCII): `xn--maisonpardailh-okb.fr`

Utilisez la version Unicode (`maisonpardailhé.fr`) dans les interfaces qui l'acceptent ; utilisez la version Punycode (`xn--maisonpardailh-okb.fr`) pour les champs DNS / HTTP où l'entrée ASCII est requise.

Checklist (ordre recommandé)

- **DNS**
  - Ajouter / vérifier enregistrements A/AAAA/CNAME pour `maisonpardailhé.fr` (ou pour `xn--maisonpardailh-okb.fr` si votre fournisseur exige ASCII).
  - TTL recommandé : 300 (pour propagation rapide durant la transition).

- **TLS / Certificat**
  - Demander un certificat Let's Encrypt / ACME pour `maisonpardailhé.fr` ; si l'ACME client a besoin d'ASCII, utilisez `xn--maisonpardailh-okb.fr`.
  - Vérifier que le certificat couvre `www` si nécessaire (`www.maisonpardailhé.fr` / `www.xn--maisonpardailh-okb.fr`).

- **CDN / Cloudflare**
  - Ajouter le site sur Cloudflare en utilisant la version Unicode dans l'interface web ; l'API peut demander Punycode. Vérifier les règles, cache et SSL.

- **Google Search Console**
  - Ajouter une propriété `URL prefix` pour `https://maisonpardailhé.fr`.
  - Si GSC ne supporte pas l'Unicode dans votre flux, utilisez `https://xn--maisonpardailh-okb.fr`.
  - Soumettre / resoumettre le sitemap : `https://maisonpardailhé.fr/sitemap.xml` (ou en Punycode si nécessaire).
  - Utiliser l'outil d'inspection d'URL pour forcer une réindexation des pages principales.

- **Google Analytics / Matomo**
  - Mettre à jour l'URL du site dans la configuration de la propriété.
  - Vérifier les filtres et domaines autorisés (referrer) pour inclure la nouvelle URL.

- **Sitemap & robots.txt**
  - Vérifier que `robots.txt` référence `https://maisonpardailhé.fr/sitemap.xml` (déjà mise à jour dans le dépôt).
  - Regénérer et déployer `sitemap.xml` si nécessaire.
  - Ping Google/Bing (exemples) :
    - `https://www.google.com/ping?sitemap=https://maisonpardailhé.fr/sitemap.xml`
    - `https://www.bing.com/ping?sitemap=https://maisonpardailhé.fr/sitemap.xml`
  - Si vous préférez ping en ASCII, remplacez par la version Punycode dans l'URL.

- **Emails (SPF / DKIM / DMARC)**
  - Si vous utilisez des enregistrements DNS pour la vérification d'expéditeurs (Brevo, SendGrid, Mailjet), suivez leurs instructions ; certaines consoles demanderont la version Punycode pour les enregistrements DNS.
  - Vérifier SPF/DMARC/DKIM pour domaines personnalisés et mettre à jour les enregistrements TXT.

- **Favicon / Assets / Manifest / PWA**
  - Vérifier les URLs absolues dans les manifests et service workers (ex : `/site.webmanifest`, `manifest.json`) — utilisez URL absolue uniquement si nécessaire.
  - Tester l'installation PWA sur mobile (Chrome / Safari).

- **Réseaux sociaux & annuaires**
  - Mettre à jour la page Google Business Profile (anciennement Google My Business) : URL du site.
  - Mettre à jour Facebook / Instagram / Pages locales avec la nouvelle URL.

- **Plateformes de paiement / Webhooks (Stripe, Brevo, etc.)**
  - Vérifier les URLs de redirection / webhook et mettre à jour si elles pointent vers l'ancien domaine.
  - Re-générer et valider les secrets si le fournisseur le requiert.

- **Autres (PWA admin, robots et docs)**
  - Vérifier les liens d'administration (`/admin/`) dans les docs (déjà mis à jour dans le dépôt).
  - Mettre à jour tout ficheir externe (ex : fichiers partagés, README externes) qui contient l'ancien domaine.

Actions automatisées que je peux faire pour vous dans le dépôt

- Créer ce fichier de checklist (fait).
- Ajouter / mettre à jour un script `scripts/ping_sitemaps.ps1` pour pinger Google/Bing automatiquement.
- Préparer un commit Git et un message structuré pour ces changements.

Si vous voulez, je peux maintenant :

1) Commiter toutes les modifications déjà faites (message proposé : `feat(docs): remplacer ancien domaine par maisonpardailhé.fr et ajouter checklist mise à jour services externes`).
2) Créer et exécuter un script PowerShell `scripts/ping_sitemaps.ps1` qui pingera Google et Bing (en Punycode et Unicode).

Dites-moi laquelle de ces actions vous souhaitez que j'exécute en suivant (commit / script / rien).
