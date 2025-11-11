# Benchmark Guide — Maison Pardailhe

Ce guide explique comment exécuter des benchmarks pour tester les performances du site.

## Scripts disponibles

### 1. Benchmark Standard (`benchmark.js`)

Test de performance avec utilisateurs concurrents simulés.

**Variables d'environnement :**
- `BENCHMARK_URL` : URL cible (défaut: `https://serv-test.smp4.xyz`)
- `CONCURRENT_USERS` : Nombre d'utilisateurs simultanés (défaut: 10)
- `REQUESTS_PER_USER` : Requêtes par utilisateur (défaut: 20)
- `WARMUP_REQUESTS` : Requêtes de préchauffage (défaut: 5)

**Utilisation :**

```powershell
cd server

npm run benchmark

BENCHMARK_URL=https://serv-test.smp4.xyz CONCURRENT_USERS=20 REQUESTS_PER_USER=50 npm run benchmark
```

**Ce qui est testé :**
- Page d'accueil (`/`)
- Page menu (`/menu.html`)
- Page commande (`/commande.html`)
- API menus (`/api/menus`)
- API créneaux (`/api/schedules`)
- Assets statiques (CSS, JS)

**Résultats :**
- Nombre total de requêtes
- Taux de succès/erreurs
- Temps de réponse (moyenne, médiane, P95, P99, min, max)
- Requêtes par seconde
- Distribution des codes HTTP

---

### 2. Load Test (`benchmark-load.js`)

Test de charge progressive avec montée en charge (ramp-up).

**Variables d'environnement :**
- `BENCHMARK_URL` : URL cible
- `DURATION` : Durée du test en secondes (défaut: 60)
- `RAMP_UP` : Durée de montée en charge en secondes (défaut: 10)
- `MAX_CONCURRENT` : Nombre max d'utilisateurs simultanés (défaut: 50)

**Utilisation :**

```powershell
cd server

npm run benchmark:load

BENCHMARK_URL=https://serv-test.smp4.xyz DURATION=120 MAX_CONCURRENT=100 npm run benchmark:load
```

**Ce qui est testé :**
- Montée progressive en charge
- Stabilité sous charge continue
- Capacité à gérer de nombreux utilisateurs simultanés

**Résultats :**
- Affichage en temps réel (RPS, utilisateurs actifs, taux d'erreur)
- Statistiques finales de performance
- Types d'erreurs rencontrées

---

### 3. API Benchmark (`benchmark-api.js`)

Test de performance spécifique aux endpoints API.

**Variables d'environnement :**
- `BENCHMARK_URL` : URL cible
- `ITERATIONS` : Nombre d'itérations par endpoint (défaut: 100)

**Utilisation :**

```powershell
cd server

npm run benchmark:api

BENCHMARK_URL=https://serv-test.smp4.xyz ITERATIONS=200 npm run benchmark:api
```

**Endpoints testés :**
- `GET /api/menus`
- `GET /api/schedules`
- `GET /api/notifications`
- `GET /api/csrf-token`

**Résultats :**
- Temps de réponse pour chaque endpoint
- Taux de succès
- Distribution des codes de statut

---

### 4. Benchmark Complet

Lance tous les benchmarks successivement.

```powershell
cd server
npm run benchmark:all
```

---

## Scénarios de test recommandés

### Test de performance de base
```powershell
BENCHMARK_URL=https://serv-test.smp4.xyz npm run benchmark
```

### Test de charge moyenne
```powershell
BENCHMARK_URL=https://serv-test.smp4.xyz CONCURRENT_USERS=25 REQUESTS_PER_USER=40 npm run benchmark
```

### Test de charge intensive
```powershell
BENCHMARK_URL=https://serv-test.smp4.xyz CONCURRENT_USERS=50 REQUESTS_PER_USER=100 npm run benchmark
```

### Test de stabilité longue durée
```powershell
BENCHMARK_URL=https://serv-test.smp4.xyz DURATION=300 MAX_CONCURRENT=30 npm run benchmark:load
```

### Test de montée en charge rapide
```powershell
BENCHMARK_URL=https://serv-test.smp4.xyz DURATION=60 RAMP_UP=5 MAX_CONCURRENT=100 npm run benchmark:load
```

---

## Interprétation des résultats

### Temps de réponse

| Métrique | Excellent | Bon | Acceptable | Problème |
|----------|-----------|-----|------------|----------|
| Moyenne  | < 100ms   | < 300ms | < 1000ms | > 1000ms |
| P95      | < 200ms   | < 500ms | < 2000ms | > 2000ms |
| P99      | < 500ms   | < 1000ms | < 3000ms | > 3000ms |

### Requêtes par seconde (RPS)

| Charge | RPS minimum attendu |
|--------|---------------------|
| Légère (10 users) | > 50 RPS |
| Moyenne (25 users) | > 100 RPS |
| Élevée (50 users) | > 150 RPS |

### Taux d'erreur

| Taux | Statut |
|------|--------|
| < 0.1% | ✅ Excellent |
| < 1% | ✅ Bon |
| < 5% | ⚠️ Acceptable |
| > 5% | ❌ Problème |

---

## Comparaison avant/après optimisation

### Exemple de tableau de résultats

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Temps moyen | 450ms | 120ms | **-73%** |
| P95 | 890ms | 280ms | **-69%** |
| RPS | 85 | 245 | **+188%** |
| Taux d'erreur | 2.3% | 0.1% | **-96%** |

---

## Troubleshooting

### Erreurs de connexion

Si vous obtenez beaucoup d'erreurs `ECONNREFUSED` ou `ETIMEDOUT` :
- Vérifiez que le serveur est démarré sur le VPS
- Vérifiez le pare-feu et les règles de sécurité
- Réduisez le nombre d'utilisateurs concurrents

### Timeout

Si vous obtenez beaucoup de timeouts :
- Augmentez les ressources serveur (CPU, RAM)
- Vérifiez les performances de la base de données
- Activez le cache (Redis)
- Optimisez les requêtes lentes

### Taux d'erreur 5xx élevé

Si vous voyez beaucoup d'erreurs 500/503 :
- Consultez les logs serveur (`server/logs/`)
- Vérifiez la santé de la base de données
- Augmentez le pool de connexions DB
- Vérifiez la mémoire disponible

### Rate Limiting (429 errors)

Si vous obtenez des erreurs 429 :
- C'est normal ! Le serveur protège contre les abus
- Réduisez `CONCURRENT_USERS` ou ajustez les rate limits
- Pour les tests, vous pouvez temporairement désactiver les rate limits

---

## Conseils d'optimisation

### Côté serveur

1. **Activer compression gzip/brotli** (déjà activé via `compression` middleware)
2. **Mettre en cache les requêtes DB fréquentes** (Redis recommandé)
3. **Optimiser les index de base de données**
4. **Augmenter le pool de connexions DB** si nécessaire
5. **Utiliser un CDN** pour les assets statiques

### Côté application

1. **Minifier CSS/JS** (déjà fait via `npm run build`)
2. **Optimiser les images** (déjà fait via `npm run images:optimize`)
3. **Lazy loading** pour images hors viewport
4. **Service Worker** pour mise en cache PWA

### Infrastructure

1. **Load balancer** pour distribuer la charge
2. **Reverse proxy** (Nginx) pour servir les assets statiques
3. **Base de données répliquée** (master/slave) pour lecture/écriture
4. **Monitoring** (Prometheus, Grafana) pour suivre les métriques

---

## Automatisation

### Script PowerShell pour tests réguliers

```powershell
$results = @()

$tests = @(
    @{ Name="Light Load"; Users=10; Requests=20 }
    @{ Name="Medium Load"; Users=25; Requests=40 }
    @{ Name="Heavy Load"; Users=50; Requests=80 }
)

foreach ($test in $tests) {
    Write-Host "Running: $($test.Name)..."
    $env:CONCURRENT_USERS = $test.Users
    $env:REQUESTS_PER_USER = $test.Requests
    npm run benchmark
    Start-Sleep -Seconds 5
}
```

### Intégration CI/CD

Ajoutez dans `.github/workflows/performance.yml` :

```yaml
name: Performance Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      - name: Run benchmark
        working-directory: ./server
        env:
          BENCHMARK_URL: https://serv-test.smp4.xyz
          CONCURRENT_USERS: 10
          REQUESTS_PER_USER: 20
        run: npm run benchmark
```

---

## Métriques à surveiller

### En production

1. **Temps de réponse moyen** : objectif < 200ms
2. **P95** : objectif < 500ms
3. **Taux d'erreur** : objectif < 0.5%
4. **Throughput** : capacité à gérer le trafic réel
5. **Disponibilité** : uptime > 99.9%

### Alertes recommandées

- Temps de réponse P95 > 1000ms pendant 5min
- Taux d'erreur > 1% pendant 2min
- RPS < 50 (dégradation de performance)
- Disponibilité < 99% sur 24h

---

## Références

- [Web Performance Best Practices](https://web.dev/fast/)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-testing/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Dernière mise à jour** : Novembre 2025
