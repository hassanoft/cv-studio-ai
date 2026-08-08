# CV Studio AI 🪪

Bot Telegram professionnel qui génère des **CV en image PNG HD** et des
**portfolios web** (site avec lien unique) pour le marché ivoirien et
ouest-africain francophone.

---

## ✨ Fonctionnalités

- 📄 Génération de CV en image PNG haute définition (Puppeteer + EJS)
- 🌐 Génération de portfolio web responsive avec lien unique (`/portfolio/<id>`)
- 💰 Monnaie virtuelle **H$Λ** (Hasha) — 100 H$Λ offerts à l'inscription
- 💳 Boutique de crédits avec **paiement Wave** (lien dynamique, montant injecté automatiquement)
- ✅ Validation **manuelle** des paiements par l'administrateur (aucune vérification automatique)
- 👑 Abonnements (semaine / mois / trimestre / an) → générations illimitées
- 🗂 Historique des créations, réémission des CV, liste des portfolios
- ⚙️ Panneau d'administration complet (demandes, historique, utilisateurs, stats)
- 🔐 Anti-spam, anti-double-paiement, validation des entrées, requêtes SQL préparées

---

## 🏗 Stack technique

| Composant       | Choix                          |
|-----------------|---------------------------------|
| Bot Telegram    | [Telegraf v4](https://telegraf.js.org/) (Scenes/Wizard) |
| Serveur web     | Express.js                     |
| Base de données | SQLite (`better-sqlite3`)      |
| Templates       | EJS                             |
| Rendu image CV  | Puppeteer (Chromium headless)  |

Architecture 100 % modulaire : `commands/`, `handlers/`, `services/`,
`database/`, `middlewares/`, `utils/`, `config/`, `templates/`.

---

## 📁 Structure du projet

```
cv-studio-ai/
├── index.js                  # Point d'entrée (Telegraf + Express)
├── config/                   # env, prix, admin
├── database/
│   ├── db.js                 # Connexion + schéma SQLite
│   ├── migrate.js
│   └── models/                # user, cv, portfolio, transaction
├── services/                  # crédits, CV, portfolio, paiement, abonnement, notif admin
├── commands/                  # /start, /menu, /cv, /portfolio, /compte, /creations, /boutique, /abonnement, /admin
├── handlers/                  # wizards CV/Portfolio, paiements, admin
├── middlewares/                # session, anti-spam, auth admin, erreurs
├── utils/                      # logger, validateurs, formatage, claviers, Puppeteer, fichiers Telegram
├── templates/
│   ├── cv/modern.ejs          # Template CV (rendu en image)
│   └── portfolio/index.ejs    # Template portfolio (site statique)
└── public/
    ├── cv-exports/<user_id>/  # PNG générés (persistants)
    └── portfolios/<id>/       # Sites générés (persistants)
```

---

## ⚙️ Installation

### 1. Cloner et installer

```bash
git clone https://github.com/hassanoft/cv-studio-ai.git
cd cv-studio-ai
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Renseignez au minimum :

- `BOT_TOKEN` — token obtenu via [@BotFather](https://t.me/BotFather)
- `ADMIN_IDS` — votre ID Telegram (et ceux des autres admins), séparés par des virgules
- `WAVE_PAYMENT_LINK` — déjà pré-rempli avec votre lien marchand Wave

> Le lien Wave doit se terminer par `?amount=` : le bot ajoute automatiquement
> le montant exact (en FCFA) du pack ou de l'abonnement choisi à la fin de ce lien.
> Exemple généré : `https://pay.wave.com/m/M_ci_xxx/c/ci/?amount=1700`

### 3. Initialiser la base (optionnel — se fait aussi au démarrage)

```bash
npm run db:init
```

### 4. Lancer le bot

```bash
npm start
```

En développement (Termux/local), `BOT_MODE=polling` suffit — aucune URL
publique n'est nécessaire.

---

## ☁️ Déploiement sur Render

1. Poussez le projet sur GitHub (`hassanoft/cv-studio-ai`).
2. Sur Render : **New → Blueprint**, sélectionnez le repo (le fichier
   `render.yaml` configure tout automatiquement : build, start, disque
   persistant pour la base SQLite).
3. Renseignez dans les variables d'environnement Render :
   - `BOT_TOKEN`
   - `WEBHOOK_URL` → l'URL publique Render (ex: `https://cv-studio-ai.onrender.com`)
   - `PUBLIC_BASE_URL` → la même URL (utilisée pour générer les liens de portfolio)
   - `ADMIN_IDS`
4. `BOT_MODE` est déjà défini sur `webhook` dans `render.yaml`.
5. Déployez. Le bot configure automatiquement son webhook Telegram au démarrage.

Un disque persistant (`cv-studio-data`) est monté sur `database/data/` afin
que la base SQLite (et donc les soldes, CV, portfolios) survive aux redéploiements.

> ⚠️ Les fichiers générés (`public/cv-exports/`, `public/portfolios/`) sont
> stockés sur le disque local du service. Sur le plan gratuit de Render, ce
> disque n'est pas persistant entre redéploiements — pensez à ajouter un
> second disque monté sur `public/` si vous voulez conserver les fichiers
> générés à long terme, ou migrez leur stockage vers un bucket S3/Cloudinary
> si le volume grandit fortement.

---

## 📱 Notes Termux

- Le bot lui-même (Telegraf, Express, SQLite) fonctionne bien sous Termux.
- **Puppeteer/Chromium** est en revanche difficile à faire tourner nativement
  sur Android/Termux (pas de Chromium ARM officiel prêt à l'emploi). Deux options :
  1. Déployer uniquement la génération de CV/portfolio sur un service Linux
     (Render, VPS) et faire tourner le reste ailleurs si besoin.
  2. Installer un Chromium/Chrome existant sur l'appareil et pointer
     `PUPPETEER_EXECUTABLE_PATH` vers son binaire dans `.env`.
- `better-sqlite3` nécessite une compilation native légère : installez au
  préalable `pkg install nodejs-lts python build-essential` sous Termux.

---

## 💬 Commandes principales

| Commande       | Description |
|----------------|-------------|
| `/start`       | Inscription automatique + bonus de bienvenue |
| `/menu`        | Menu principal |
| `/cv`          | Créer un CV (50 H$Λ) |
| `/portfolio`   | Créer un portfolio (100 H$Λ) |
| `/compte`      | Solde, abonnement, statistiques |
| `/creations`   | Voir/retélécharger ses CV et portfolios |
| `/boutique`    | Acheter des crédits H$Λ |
| `/abonnement`  | Souscrire à un abonnement illimité |
| `/annuler`     | Annuler une création en cours |
| `/admin`       | Panneau d'administration *(réservé aux `ADMIN_IDS`)* |

---

## 💳 Flux de paiement (validation manuelle)

1. L'utilisateur choisit un pack ou un abonnement.
2. Le bot affiche le montant exact + le lien Wave généré dynamiquement.
3. L'utilisateur paie puis tapote **✅ J'ai payé**.
4. Tous les administrateurs (`ADMIN_IDS`) reçoivent une notification avec
   les boutons **✅ Valider** / **❌ Refuser**.
5. En cas de validation : crédits ajoutés ou abonnement activé automatiquement,
   l'utilisateur est notifié, la transaction est archivée avec l'ID de l'admin
   et la date de traitement.
6. En cas de refus : l'utilisateur est notifié et peut soumettre une nouvelle demande.
7. Un utilisateur ne peut avoir qu'**une seule commande en attente** à la fois
   (protection anti-spam / anti-double-paiement).

---

## 🔐 Sécurité

- Toutes les requêtes SQL utilisent des requêtes préparées (`better-sqlite3`),
  aucune concaténation de chaîne → protection anti-injection SQL.
- Panneau admin protégé par whitelist `ADMIN_IDS` (middleware `adminAuth`).
- Anti-spam : limite de fréquence par utilisateur (middleware `antiSpam`).
- Validation stricte des entrées (téléphone, email, longueurs) avant tout
  enregistrement ou rendu.
- Sortie HTML systématiquement échappée dans les templates EJS (`<%= %>`)
  pour éviter toute injection dans les CV/portfolios générés.
- Gestion d'erreurs centralisée (`middlewares/errorHandler.js`) : aucune
  erreur ne fait planter le process.

---

## 🎨 Personnalisation

- **Tarifs** : `config/prices.js`
- **Design du CV/portfolio** : `templates/cv/modern.ejs` et `templates/portfolio/index.ejs`
  (variables CSS en haut de fichier : couleurs, typographies)
- **Textes du bot** : directement dans `commands/` et `handlers/`

---

## 📝 Licence

Projet privé — tous droits réservés.
