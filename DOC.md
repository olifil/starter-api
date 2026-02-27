# Starter API — Livre de référence

> **Ce document est la source unique de vérité** pour comprendre, utiliser et faire évoluer le projet Starter API. Il s'adresse aussi bien aux développeurs qui rejoignent le projet qu'aux contributeurs confirmés.

---

## Table des matières

**Partie I — Vue d'ensemble**
- [1. Présentation du projet](#1-présentation-du-projet)
- [2. Stack technologique](#2-stack-technologique)
- [3. Démarrage rapide](#3-démarrage-rapide)

**Partie II — Architecture**
- [4. Architecture hexagonale](#4-architecture-hexagonale)
- [5. CQRS & DDD](#5-cqrs--ddd)
- [6. Structure des modules](#6-structure-des-modules)

**Partie III — Fonctionnalités**
- [7. Authentification](#7-authentification)
- [8. Gestion des utilisateurs](#8-gestion-des-utilisateurs)
- [9. Autorisations (RBAC/CASL)](#9-autorisations-rbaccasl)
- [10. Notifications](#10-notifications)
- [11. Formulaire de contact](#11-formulaire-de-contact)
- [12. Rate Limiting](#12-rate-limiting)

**Partie IV — Infrastructure**
- [12. Base de données](#12-base-de-données)
- [13. Observabilité](#13-observabilité)
- [14. Analytics (Matomo)](#14-analytics-matomo)
- [15. Gestion des secrets (SOPS)](#15-gestion-des-secrets-sops)

**Partie V — Développement**
- [16. Git workflow](#16-git-workflow)
- [17. Tests](#17-tests)
- [18. Commandes du projet (Makefile)](#18-commandes-du-projet-makefile)

**Annexes**
- [A. Référence API complète](#a-référence-api-complète)
- [B. Variables d'environnement](#b-variables-denvironnement)
- [C. Conventions de nommage](#c-conventions-de-nommage)
- [D. Glossaire](#d-glossaire)

---

# Partie I — Vue d'ensemble

## 1. Présentation du projet

**Starter API** est une base de démarrage (boilerplate) pour construire des API REST robustes avec NestJS. Elle embarque dès le départ une architecture propre, un système d'authentification complet, la gestion des autorisations, un moteur de notifications multi-canaux, et tout le socle DevOps nécessaire (logging, monitoring, secrets chiffrés, Docker).

L'objectif est de ne jamais repartir de zéro : toute nouvelle fonctionnalité métier peut s'appuyer sur des patterns établis, des conventions documentées, et une infrastructure prête pour la production.

### Ce que fournit le starter

| Domaine | Fonctionnalités incluses |
|---------|--------------------------|
| **Authentification** | Inscription, connexion, refresh token, réinitialisation de mot de passe, vérification email |
| **Utilisateurs** | Profil CRUD, gestion admin, rôles |
| **Autorisations** | RBAC à 4 niveaux via CASL, permissions conditionnelles par propriété |
| **Notifications** | 5 canaux (Email, WebSocket, Web-Push, SMS, Push), templates i18n, file d'attente async |
| **Contact** | Formulaire de contact public vers l'email des administrateurs |
| **Observabilité** | Logs structurés Pino, health checks, Request ID, graceful shutdown |
| **Base de données** | Prisma 7 + PostgreSQL, migrations versionnées, seed |
| **Secrets** | Chiffrement SOPS + age, workflow équipe |
| **DevOps** | Docker Compose, Makefile, Redis, Mailhog |

---

## 2. Stack technologique

```
┌─────────────────────────────────────────────────────────────┐
│                     Starter API                              │
│                                                             │
│  Runtime       Node.js 20 LTS                               │
│  Framework     NestJS 11                                    │
│  Langage       TypeScript 5 (strict)                        │
│                                                             │
│  Base de données                                            │
│    ORM         Prisma 7 + @prisma/adapter-pg                │
│    SGBD        PostgreSQL 16                                │
│                                                             │
│  Architecture                                               │
│    Pattern     Hexagonal (Ports & Adapters)                 │
│    CQRS        @nestjs/cqrs                                 │
│    Events      Event Bus intégré                            │
│                                                             │
│  Fonctionnalités                                            │
│    Auth        JWT (access + refresh + reset + verify)      │
│    RBAC        CASL (@casl/ability)                         │
│    Queue       BullMQ + Redis                               │
│    Email       Nodemailer (SMTP)                            │
│    WebSocket   Socket.io (@nestjs/platform-socket.io)       │
│    Web-Push    web-push (VAPID)                             │
│    i18n        nestjs-i18n + YAML                           │
│    Templates   Handlebars                                   │
│                                                             │
│  Observabilité                                              │
│    Logs        nestjs-pino + pino-pretty                    │
│    Health      @nestjs/terminus                             │
│    API Docs    Swagger (@nestjs/swagger)                    │
│                                                             │
│  Sécurité                                                   │
│    Rate limit  @nestjs/throttler                            │
│    Secrets     SOPS + age                                   │
│    Validation  class-validator + class-transformer          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Démarrage rapide

### Prérequis

- **Node.js** ≥ 20 LTS
- **Docker** et **Docker Compose**
- **SOPS** + clé `age` (pour le déchiffrement des secrets en équipe)

### Installation

```bash
# 1. Cloner le dépôt
git clone <repository-url> && cd starter_api

# 2. Déchiffrer les secrets (équipe) OU copier manuellement
make sops-decrypt        # si vous avez la clé age
cp .env.dist .env        # sinon, remplir .env manuellement

# 3. Démarrer les services Docker (PostgreSQL, Redis, Mailhog)
make start

# 4. Appliquer les migrations et peupler la base
make migrate
make seed

# 5. Lancer l'application en mode développement
npm run start:dev
```

### URLs de développement

| Service | URL |
|---------|-----|
| API REST | http://localhost:3000/api/v1 |
| Swagger (documentation interactive) | http://localhost:3000 |
| OpenAPI JSON (import Postman/Bruno/Insomnia) | http://localhost:3000/-json |
| OpenAPI YAML | http://localhost:3000/-yaml |
| Mailhog (visualiser les emails) | http://localhost:8025 |
| Health check | http://localhost:3000/health |

### Vérification rapide

```bash
# Santé de l'API
curl http://localhost:3000/health

# Créer un compte
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","firstName":"Jean","lastName":"Dupont","termsAccepted":true}'
```

---

# Partie II — Architecture

## 4. Architecture hexagonale

### Principe

L'architecture hexagonale (aussi appelée "Ports & Adapters") organise le code en couches concentriques. **La règle fondamentale** : les dépendances ne pointent que vers l'intérieur — le cœur métier (Domain) ne dépend de rien.

```
┌─────────────────────────────────────────────┐
│                  Interface                   │  ← HTTP, WebSocket, CLI
│  ┌───────────────────────────────────────┐  │
│  │             Application               │  │  ← Use cases, CQRS
│  │  ┌─────────────────────────────────┐  │  │
│  │  │             Domain              │  │  │  ← Entités, règles métier
│  │  │  (aucune dépendance externe)    │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│              Infrastructure                 │  ← Prisma, SMTP, Redis…
└─────────────────────────────────────────────┘
```

### Les 4 couches

#### Couche Domain — le cœur métier

C'est la couche la plus intérieure. Elle ne contient **aucune dépendance externe** (pas de NestJS, pas de Prisma, pas d'HTTP). Elle exprime uniquement les règles du métier.

- **Entités** : objets avec identité et état (ex: `User`, `Notification`)
- **Value Objects** : objets immuables sans identité (ex: `Email`, `HashedPassword`)
- **Événements de domaine** : faits qui se sont produits (ex: `UserCreatedEvent`)
- **Interfaces de repositories** : contrats d'accès aux données (sans implémentation)

#### Couche Application — les cas d'usage

Orchestre le domaine pour réaliser les fonctionnalités. Utilise le pattern CQRS.

- **Commands** : opérations qui modifient l'état (`RegisterCommand`, `SendNotificationCommand`)
- **Queries** : opérations qui lisent l'état (`GetUserQuery`, `GetNotificationsQuery`)
- **DTOs** : objets de transfert pour les entrées/sorties
- **Exceptions applicatives** : erreurs métier (`UserNotFoundException`, `InvalidTokenException`)

#### Couche Infrastructure — les adaptateurs

Implémente les interfaces du Domain avec les technologies concrètes.

- **Repositories** : accès à la base de données via Prisma
- **Channel senders** : envoi d'emails, WebSocket, Web-Push
- **Queue** : producteur et consommateur BullMQ
- **Templates** : rendu Handlebars

#### Couche Interface — les points d'entrée

Expose l'application au monde extérieur.

- **Controllers HTTP** : routes REST avec Swagger
- **WebSocket Gateways** : connexions temps réel
- **Guards** : vérification JWT et permissions

### Flux d'une requête HTTP

```
 Client
   │
   │  POST /api/v1/auth/register
   ▼
┌─────────────────────┐
│  ThrottlerGuard     │  → rate limiting (429 si dépassé)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  JwtAuthGuard       │  → vérifie ou laisse passer (@Public)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  AbilitiesGuard     │  → vérifie les permissions CASL
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  HTTP Controller    │  → valide le DTO (class-validator)
│  (Interface)        │    construit la Command
└──────────┬──────────┘
           │ commandBus.execute(command)
┌──────────▼──────────┐
│  Command Service    │  → orchestration du use case
│  (Application)      │    appelle le domain, le repository
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Domain Entity      │  → logique métier, validation
│  (Domain)           │    émet des événements de domaine
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Prisma Repository  │  → persistance
│  (Infrastructure)   │    mapping Domain ↔ Prisma
└──────────┬──────────┘
           │
        PostgreSQL
```

---

## 5. CQRS & DDD

### Command Query Responsibility Segregation (CQRS)

Le pattern CQRS sépare les opérations d'**écriture** (Commands) des opérations de **lecture** (Queries). Chaque opération a son propre flux, sa propre classe, son propre handler.

```
                     CommandBus
                         │
        ┌────────────────┼────────────────┐
        │                │                │
  RegisterCommand  SendNotificationCommand  MarkAsReadCommand
        │                │                │
  RegisterService  SendNotificationService  MarkAsReadService
        │
   [side effects: DB write, events]


                     QueryBus
                         │
        ┌────────────────┼────────────────┐
        │                │                │
  GetUserQuery  GetNotificationsQuery  GetPreferencesQuery
        │                │                │
  GetUserHandler  GetNotificationsHandler  GetPreferencesHandler
        │
   [read-only: DB read, mapping to DTO]
```

**Convention de nommage** :

| Type | Fichier | Classe |
|------|---------|--------|
| Command | `send-notification.command.ts` | `SendNotificationCommand` |
| Command handler | `send-notification.service.ts` | `SendNotificationService` |
| Query | `get-notifications.query.ts` | `GetNotificationsQuery` |
| Query handler | `get-notifications.handler.ts` | `GetNotificationsHandler` |

### Domain Events (Event-Driven)

Les entités du domain émettent des **événements** lorsque quelque chose de significatif se produit. Ces événements sont publiés sur l'`EventBus` après la persistance.

```
RegisterService
  │
  ├── user = User.create(...)        ← entité émet UserCreatedEvent
  ├── savedUser = repository.save(user)
  └── eventBus.publish(UserCreatedEvent)
                        │
          ┌─────────────┘
          ▼
  OnUserCreatedHandler (NotificationModule)
          │
          └── commandBus.execute(SendNotificationCommand('welcome', ...))
```

Ce découplage permet au module Notification d'envoyer des emails de bienvenue **sans que le module Auth n'en soit conscient**.

---

## 6. Structure des modules

### Arborescence complète

```
src/
├── app.module.ts                    # Module racine (config globale, guards)
├── main.ts                          # Point d'entrée (bootstrap)
│
├── config/                          # Configuration typée par domaine
│   ├── app.config.ts                # PORT, API_PREFIX, CORS, URLs
│   ├── database.config.ts           # DATABASE_URL
│   ├── jwt.config.ts                # Secrets et durées de vie JWT
│   ├── matomo.config.ts             # Analytics Matomo
│   ├── notification.config.ts       # Redis, SMTP, VAPID, WS, i18n
│   └── env.validation.ts            # Schéma de validation .env (class-validator)
│
├── database/
│   └── prisma.module.ts             # Module Prisma global
│
├── modules/
│   ├── auth/                        # Authentification & tokens
│   ├── user/                        # Profils utilisateurs
│   └── notification/                # Notifications multi-canaux + Contact
│
└── shared/
    ├── authorization/               # RBAC : CASL, guards, décorateurs
    ├── filters/                     # Exception filters (mapping erreurs → HTTP)
    └── infrastructure/
        ├── analytics/               # Matomo
        ├── health/                  # @nestjs/terminus health checks
        └── logging/                 # Pino config + Request ID middleware
```

### Structure interne d'un module

```
src/modules/[nom]/
│
├── core/
│   ├── domain/
│   │   ├── entities/                # Entités avec logique métier
│   │   ├── value-objects/           # Types validés et immuables
│   │   ├── repositories/            # Interfaces (Symbol tokens)
│   │   ├── ports/                   # Interfaces d'infrastructure
│   │   └── events/                  # Événements de domaine
│   │
│   └── application/
│       ├── commands/                # Un dossier par command (command + service)
│       ├── queries/                 # Un dossier par query (query + handler)
│       ├── events/                  # EventsHandlers (on-xxx.handler.ts)
│       ├── dtos/                    # Data Transfer Objects
│       ├── exceptions/              # Exceptions métier
│       └── services/                # Ports applicatifs (interfaces)
│
├── infrastructure/
│   ├── persistence/repositories/    # Implémentations Prisma
│   ├── channels/                    # Canaux de notification
│   ├── queue/                       # BullMQ producer/consumer
│   └── templates/                   # Handlebars adapter
│
├── interface/
│   ├── http-controller/             # Controllers REST
│   ├── websocket/                   # Gateway Socket.io
│   └── guards/                      # Guards spécifiques au module
│
└── [nom].module.ts
```

---

# Partie III — Fonctionnalités

## 7. Authentification

### Vue d'ensemble

Le module Auth gère **l'identité** des utilisateurs : comment ils s'inscrivent, se connectent, et récupèrent l'accès à leur compte. Il utilise une stratégie JWT avec deux tokens :

| Token | Durée de vie | Usage | Secret |
|-------|-------------|-------|--------|
| **Access token** | `JWT_EXPIRATION` (défaut: 15 min) | Authentifier chaque requête | `JWT_SECRET` |
| **Refresh token** | `JWT_REFRESH_EXPIRATION` (défaut: 7 jours) | Obtenir un nouvel access token | `JWT_REFRESH_SECRET` |
| **Reset token** | `JWT_RESET_EXPIRATION` (défaut: 15 min) | Réinitialiser le mot de passe | `JWT_RESET_SECRET` |
| **Verification token** | `JWT_VERIFICATION_EXPIRATION` (défaut: 7 jours) | Vérifier l'email à l'inscription | `JWT_VERIFICATION_SECRET` |
| **Email change token** | `JWT_EMAIL_CHANGE_EXPIRATION` (défaut: 1h) | Confirmer un changement d'email | `JWT_EMAIL_CHANGE_SECRET` |

### Politique de mot de passe

Définie dans `src/shared/validation/password.validator.ts` (source unique) :

| Règle | Valeur |
|-------|--------|
| Longueur minimale | 8 caractères |
| Longueur maximale | 128 caractères (protection DoS bcrypt) |
| Minuscule requise | au moins 1 (`a-z`) |
| Majuscule requise | au moins 1 (`A-Z`) |
| Chiffre requis | au moins 1 (`0-9`) |
| Caractère spécial requis | au moins 1 parmi `@ $ ! % * ? &` |
| Caractères autorisés | `A-Za-z0-9@$!%*?&` uniquement |

Appliquée via :
- **DTOs** : décorateur `@IsStrongPassword()` (RegisterDto, CreateUserDto, ResetPasswordDto)
- **Domaine** : `HashedPassword.fromPlainPassword()` (mêmes constantes importées)

### Endpoints

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Créer un compte |
| `POST` | `/api/v1/auth/login` | Public | Se connecter |
| `POST` | `/api/v1/auth/logout` | Authentifié | Se déconnecter |
| `POST` | `/api/v1/auth/revoke` | Authentifié (ADMIN pour cibler un autre) | Révoquer toutes les sessions |
| `POST` | `/api/v1/auth/refresh` | Public (refresh token) | Renouveler l'access token |
| `POST` | `/api/v1/auth/forgot-password` | Public | Demander un reset |
| `POST` | `/api/v1/auth/reset-password` | Public (reset token) | Changer le mot de passe |
| `POST` | `/api/v1/auth/verify-email` | Public (verify token) | Vérifier l'email (inscription ou changement d'email) |

### Flux : Inscription

```
POST /api/v1/auth/register  { email, password, firstName, lastName, termsAccepted }
         │
         ▼
RegisterService
  ├── Vérifie termsAccepted === true → 422 TermsNotAcceptedException si false
  ├── Valide l'email (value object Email)
  ├── Hashe le mot de passe (bcrypt via HashedPassword)
  ├── Crée l'entité User → émet UserCreatedEvent
  ├── Persiste en base
  ├── Génère un JWT de vérification email (type: 'email-verification')
  ├── Enrichit UserCreatedEvent avec verificationToken
  ├── Publie UserCreatedEvent → OnUserCreatedHandler envoie l'email de bienvenue
  └── Retourne 204 No Content
```

> **Note** : l'inscription ne retourne **aucun token**. L'utilisateur doit vérifier son email via le lien envoyé, puis se connecter manuellement.

### Flux : Connexion

```
POST /api/v1/auth/login  { email, password }
         │
         ▼
LoginHandler
  ├── Crée un value object Email (normalisation lowercase)
  ├── Cherche l'utilisateur par email
  │     └── Si inexistant → 401 InvalidCredentialsException
  ├── Vérifie le mot de passe (bcrypt)
  │     └── Si incorrect → 401 InvalidCredentialsException
  ├── Vérifie emailVerified === true
  │     └── Si false → 403 EmailNotVerifiedException
  ├── Génère l'access token (JWT_SECRET, jwt.expiresIn)
  ├── Génère le refresh token avec jti UUID (JWT_REFRESH_SECRET)
  ├── Persiste le refresh token en base
  ├── Trace l'événement dans Matomo (trackUserLogin)
  └── Retourne { accessToken, refreshToken, expiresIn }
```

> **Ordre des vérifications** : le mot de passe est validé **avant** l'email. Un attaquant ne peut pas distinguer "email inexistant" de "mauvais mot de passe" ; et un utilisateur avec un mauvais mot de passe ET un email non vérifié recevra une `InvalidCredentialsException`, pas une `EmailNotVerifiedException`.

### Flux : Refresh Token (rotation)

```
POST /api/v1/auth/refresh  { refreshToken }
         │
         ▼
RefreshTokenService
  ├── Vérifie le JWT (signature + expiration) avec JWT_REFRESH_SECRET
  ├── Cherche le token en base (table refresh_tokens)
  │     └── Si absent ou révoqué → 401 Unauthorized
  ├── Vérifie que l'utilisateur existe toujours
  ├── Révoque l'ancien refresh token en base (rotation)
  ├── Génère un nouveau access token (JWT_SECRET, 15min)
  ├── Génère un nouveau refresh token (JWT_REFRESH_SECRET, 7j)
  ├── Persiste le nouveau refresh token en base
  └── Retourne { accessToken, refreshToken, expiresIn }
```

> **Rotation** : à chaque refresh, l'ancien token est révoqué et un nouveau est émis.
> Un token déjà révoqué ne peut pas être réutilisé, ce qui protège contre le vol de token.

### Flux : Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
         │
         ▼
LogoutService
  ├── Extrait userId du JWT (via @CurrentUser())
  ├── Révoque TOUS les refresh tokens de l'utilisateur en base
  │     └── refreshTokenRepository.revokeAllByUserId(userId)
  └── Retourne 204 No Content
```

> **Note technique** : le contrôleur Auth a `@Public()` au niveau classe (toutes les routes publiques par défaut). La route logout utilise `@SetMetadata(IS_PUBLIC_KEY, false)` pour forcer l'authentification JWT sur cette seule route.

> **Côté client** : après un logout réussi, le frontend doit supprimer l'access token et le refresh token du stockage local. Optionnellement, déconnecter le WebSocket et désinscrire les push subscriptions.

### Flux : Révocation des sessions

```
POST /api/v1/auth/revoke  { userId?: "uuid" }
Authorization: Bearer <access_token>
         │
         ▼
RevokeSessionsService
  ├── Si userId omis → cible = utilisateur authentifié (self-revoke)
  ├── Si userId fourni et différent du requester
  │     ├── Requester est ADMIN ou SUPER_ADMIN → autorisé
  │     └── Sinon → 403 Forbidden
  ├── Révoque TOUS les refresh tokens de l'utilisateur cible
  └── Retourne 204 No Content
```

> **Cas d'usage** : changement de mot de passe, compromission de compte, déconnexion forcée par un administrateur.

### Flux : Réinitialisation du mot de passe

```
Étape 1 — Demande
──────────────────
POST /api/v1/auth/forgot-password  { email }
         │
         ▼
ForgotPasswordService
  ├── Cherche l'utilisateur par email
  │     └── Si inexistant : retourne silencieusement (pas de fuite d'info)
  ├── Génère un JWT de reset (type: 'password-reset', secret: JWT_RESET_SECRET, 15min)
  └── Publie PasswordResetRequestedEvent
              │
              ▼
  OnPasswordResetRequestedHandler → email avec lien de reset


Étape 2 — Réinitialisation
──────────────────────────
POST /api/v1/auth/reset-password  { token, newPassword }
         │
         ▼
ResetPasswordService
  ├── Vérifie le JWT avec JWT_RESET_SECRET
  ├── Vérifie payload.type === 'password-reset'
  ├── Charge l'utilisateur
  ├── user.changePassword(HashedPassword.create(newPassword))
  └── Persiste → 204 No Content
```

### Flux : Vérification de l'email

L'endpoint `POST /api/v1/auth/verify-email` est **unifié** : il gère les deux types de tokens en décodant le champ `type` du JWT sans vérification de signature, puis en vérifiant avec le bon secret.

```
Cas 1 — Vérification à l'inscription (type: 'email-verification')
──────────────────────────────────────────────────────────────────
Email de bienvenue contient :
  verificationLink = FRONTEND_URL + EMAIL_VERIFICATION_PATH + ?token=<JWT>

Le frontend appelle :
POST /api/v1/auth/verify-email  { token }
         │
         ▼
VerifyEmailService
  ├── EmailTokenService.verifyEmailToken(token)
  │     ├── Décode le type sans vérification
  │     └── Vérifie le JWT avec JWT_VERIFICATION_SECRET
  ├── Charge l'utilisateur par sub
  ├── user.verifyEmail() → emailVerified = true, emailVerifiedAt = now()
  ├── Persiste
  └── Publie AccountVerifiedEvent → 204 No Content


Cas 2 — Confirmation de changement d'email (type: 'email-change')
──────────────────────────────────────────────────────────────────
Email de confirmation envoyé à la nouvelle adresse contient :
  confirmationLink = FRONTEND_URL + EMAIL_VERIFICATION_PATH + ?token=<JWT>

Le frontend appelle :
POST /api/v1/auth/verify-email  { token }
         │
         ▼
VerifyEmailService
  ├── EmailTokenService.verifyEmailToken(token)
  │     ├── Décode le type sans vérification
  │     └── Vérifie le JWT avec JWT_EMAIL_CHANGE_SECRET
  ├── Charge l'utilisateur par sub
  ├── Vérifie que le nouvel email n'est pas déjà pris → 409 si conflit
  ├── user.changeEmail(newEmail)
  ├── Persiste
  ├── Révoque toutes les sessions (refresh tokens)
  └── 204 No Content
```

---

## 8. Gestion des utilisateurs

Le module User gère les **données de profil** des utilisateurs, séparé du module Auth qui gère l'identité.

### Endpoints

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/v1/users/me` | Authentifié | Mon profil |
| `PUT` | `/api/v1/users/me` | Authentifié | Modifier mon profil |
| `DELETE` | `/api/v1/users/me` | Authentifié | Supprimer mon compte |
| `GET` | `/api/v1/users` | ADMIN | Liste des utilisateurs |
| `GET` | `/api/v1/users/search?q=&limit=` | ADMIN | Recherche par autocomplétion |
| `GET` | `/api/v1/users/:id` | ADMIN | Profil d'un utilisateur |
| `PUT` | `/api/v1/users/:id` | ADMIN | Modifier un utilisateur |
| `DELETE` | `/api/v1/users/:id` | ADMIN | Supprimer un utilisateur |

### Suppression de compte

Un utilisateur authentifié peut supprimer son propre compte via `DELETE /api/v1/users/me`.

```http
DELETE /api/v1/users/me
Authorization: Bearer <token>
```

**Réponse :** `204 No Content`

**Comportement :**
1. L'identité de l'utilisateur est vérifiée via le JWT (`userId`)
2. L'email et le prénom sont mémorisés avant toute suppression
3. Un événement `UserDeletedEvent` est publié — ce qui déclenche l'envoi d'un email de confirmation à l'adresse mémorisée
4. Le compte est supprimé de la base de données
5. L'email de confirmation (`account-deleted`) est envoyé de façon asynchrone via BullMQ

> **Ordre garanti** : l'événement est toujours publié *avant* la suppression en base, afin que le `SendNotificationService` puisse encore résoudre l'utilisateur et enqueuer le job avec son email. Une fois le job en file, la suppression n'impacte plus l'envoi.

---

### Recherche utilisateurs (autocomplétion)

Endpoint dédié à la recherche par autocomplétion, destiné aux interfaces d'administration.

```http
GET /api/v1/users/search?q=jean&limit=10
Authorization: Bearer <token>
```

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `q` | string | Oui | Terme de recherche (min 2 caractères) |
| `limit` | number | Non | Nombre max de résultats (défaut 10, max 20) |

**Comportement :**
- Recherche insensible à la casse sur `firstName`, `lastName` et `email`
- Retourne un tableau de `UserProfileDto[]` (pas de pagination)
- Retourne `400 Bad Request` si `q` contient moins de 2 caractères

### Entité User

```
User
├── id              UUID
├── email           Email (value object, validé et normalisé)
├── password        HashedPassword (bcrypt)
├── firstName       string
├── lastName        string
├── role            AUTHENTICATED_USER | ADMIN | SUPER_ADMIN
├── emailVerified   boolean
├── emailVerifiedAt Date | null
├── createdAt       Date
└── updatedAt       Date
```

### Séparation Auth / User

> **Règle** : Auth = "qui êtes-vous ?" — User = "quelles sont vos données ?"

| Responsabilité | Module |
|----------------|--------|
| Inscription, connexion, déconnexion | Auth |
| Génération et validation des JWT | Auth |
| Réinitialisation du mot de passe | Auth |
| Vérification de l'email | Auth |
| Modification du profil | User |
| Liste et gestion des utilisateurs | User |
| Upload d'avatar | User |

---

## 9. Autorisations (RBAC/CASL)

### Hiérarchie des rôles

```
    ┌──────────────────┐
    │   SUPER_ADMIN    │  ← manage all (accès total)
    └────────┬─────────┘
             │ hérite de
    ┌────────▼─────────┐
    │      ADMIN       │  ← gère tous les utilisateurs, envoie des notifications
    └────────┬─────────┘
             │ hérite de
    ┌────────▼─────────┐
    │ AUTHENTICATED    │  ← lit/modifie ses propres données
    │     USER         │
    └────────┬─────────┘
             │ hérite de
    ┌────────▼─────────┐
    │  ANONYMOUS_USER  │  ← accès uniquement aux routes @Public()
    └──────────────────┘
```

### Matrice des permissions

| Ressource | Action | USER | ADMIN | SUPER_ADMIN |
|-----------|--------|------|-------|-------------|
| `User` (son profil) | Read, Update | ✅ (own) | ✅ (all) | ✅ (all) |
| `User` (autre) | Read, Update, Delete | ❌ | ✅ | ✅ |
| `Notification` (ses notifs) | Read, Update | ✅ (own) | ✅ (all) | ✅ (all) |
| `Notification` (send) | Create | ❌ | ✅ | ✅ |
| `Config` | AccessConfig | ❌ | ❌ | ✅ |
| `Analytics` | ViewAnalytics | ❌ | ❌ | ✅ |

### Utilisation dans les controllers

```typescript
// Route publique (aucune auth requise)
@Get('public')
@Public()
async publicRoute() {}

// Route authentifiée (tout utilisateur connecté)
@Get('me')
async getProfile(@CurrentUser() userId: string) {}

// Route réservée aux admins
@Post('send')
@CheckAbilities({ action: Action.Create, subject: Subject.Notification })
async sendNotification() {}

// Route réservée à l'utilisateur lui-même ou un admin
@Put(':id')
@CheckAbilities({ action: Action.Update, subject: Subject.User })
async updateUser(@Param('id') id: string, @CurrentUser() currentUserId: string) {}
```

### Flux d'autorisation

```
Requête entrante
      │
      ▼
ThrottlerGuard
  ├── Quota OK → passe (headers X-RateLimit-* ajoutés)
  └── Quota dépassé → 429 Too Many Requests
      │
      ▼
JwtAuthGuard
  ├── Route @Public() → passe sans vérification
  ├── JWT absent ou invalide → 401 Unauthorized
  └── JWT valide → charge l'utilisateur dans request.user
      │
      ▼
AbilitiesGuard
  ├── Aucun @CheckAbilities() → passe (authentification suffit)
  └── @CheckAbilities() présent → AbilityFactory.defineAbility(user)
        ├── Permission accordée → passe
        └── Permission refusée → 403 Forbidden
```

### Guards globaux

Les guards sont enregistrés globalement dans `app.module.ts` dans cet **ordre précis** :

```typescript
{ provide: APP_GUARD, useClass: ThrottlerGuard }  // 1er : rate limiting
{ provide: APP_GUARD, useClass: JwtAuthGuard }    // 2ème : authentification
{ provide: APP_GUARD, useClass: AbilitiesGuard }  // 3ème : permissions
```

### Enums de référence

#### Actions disponibles

```typescript
import { Action, Subject } from '@shared/authorization';
import { Role } from '@prisma/client';

enum Action {
  Manage         = 'manage',          // Toutes les actions
  Create         = 'create',
  Read           = 'read',
  Update         = 'update',
  Delete         = 'delete',
  AccessConfig   = 'access_config',   // Config système (SUPER_ADMIN)
  ManageUsers    = 'manage_users',    // Gestion utilisateurs (ADMIN+)
  ViewAnalytics  = 'view_analytics',  // Analytics (SUPER_ADMIN)
}
```

#### Ressources (Subjects) disponibles

```typescript
enum Subject {
  All          = 'all',
  User         = 'User',
  Notification = 'Notification',
  Resource     = 'Resource',
  Config       = 'Config',
  Analytics    = 'Analytics',
}
```

### Cas d'usage — exemples de code

#### Route publique (pas d'authentification)

```typescript
@Controller('auth')
@Public() // Tout le contrôleur est public
export class AuthHttpController {
  @Post('register')
  async register(@Body() dto: RegisterDto) {}
}
```

#### Vérification de permission CASL

```typescript
@Controller('resources')
export class ResourceController {
  @Post()
  @CheckAbilities({ action: Action.Create, subject: Subject.Resource })
  async create() {}

  @Delete(':id')
  @CheckAbilities({ action: Action.Delete, subject: Subject.Resource })
  async delete() {}
}
```

#### Restriction par rôle

```typescript
@Controller('admin/users')
export class AdminUserController {
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllUsers() {}

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN) // Seul SUPER_ADMIN peut supprimer
  async deleteUser(@Param('id') id: string) {}
}
```

#### Double vérification (rôle + permission)

```typescript
@Delete(':id')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@CheckAbilities({ action: Action.Delete, subject: Subject.User })
async deleteUser(@Param('id') id: string) {
  // Le double décorateur renforce la sécurité
}
```

#### Vérification manuelle avec conditions (ownership)

```typescript
import { AbilityFactory } from '@shared/authorization';
import { subject } from '@casl/ability';

@Controller('resources')
export class ResourceController {
  constructor(private readonly abilityFactory: AbilityFactory) {}

  @Get(':id')
  async getResource(@Param('id') id: string, @CurrentUser() user: User) {
    const resource = await this.resourceService.findOne(id);
    const ability = this.abilityFactory.defineAbility(user);

    if (!ability.can(Action.Read, subject(Subject.Resource, resource))) {
      throw new ForbiddenException('Accès refusé');
    }
    return resource;
  }
}
```

### Tests des permissions

```typescript
describe('Permissions', () => {
  let abilityFactory: AbilityFactory;

  beforeEach(() => { abilityFactory = new AbilityFactory(); });

  it('AUTHENTICATED_USER peut gérer ses propres ressources', () => {
    const user = { id: '123', role: Role.AUTHENTICATED_USER } as User;
    const ability = abilityFactory.defineAbility(user);

    expect(ability.can(Action.Manage, subject(Subject.Resource, { userId: '123' }))).toBe(true);
    expect(ability.can(Action.Manage, subject(Subject.Resource, { userId: '456' }))).toBe(false);
  });

  it('ADMIN peut gérer toutes les ressources', () => {
    const admin = { id: '1', role: Role.ADMIN } as User;
    const ability = abilityFactory.defineAbility(admin);
    expect(ability.can(Action.Manage, Subject.Resource)).toBe(true);
  });
});
```

### Étendre le système RBAC

#### Ajouter un nouveau rôle

1. Ajouter dans `prisma/schema.prisma` : `MODERATOR` dans l'enum `Role`
2. Créer la migration : `npx prisma migrate dev --name add_moderator_role`
3. Définir les permissions dans `AbilityFactory` :
   ```typescript
   case Role.MODERATOR:
     can('read', 'User');
     can('update', 'User', { reported: true });
     break;
   ```

#### Ajouter une nouvelle action

1. Ajouter dans `src/shared/authorization/enums/action.enum.ts`
2. Mettre à jour le type `Actions` dans `AbilityFactory`
3. Définir qui peut l'utiliser dans les `case` correspondants

#### Ajouter une nouvelle ressource

1. Ajouter dans `src/shared/authorization/enums/subject.enum.ts`
2. Mettre à jour le type `Subjects` dans `AbilityFactory`
3. Définir les permissions par rôle

### Bonnes pratiques RBAC

✅ **À faire :**
- Fail-safe par défaut : si aucune permission définie, l'accès est refusé
- Principe du moindre privilège : donner le minimum nécessaire
- Valider les IDs depuis le JWT (ne jamais faire confiance au corps de la requête)
- Tester tous les scénarios d'accès (positif + négatif)

❌ **À éviter :**
- Contourner les guards dans la logique métier
- Exposer des informations sensibles dans les messages d'erreur (ex: l'ID de la ressource refusée)
- Utiliser `@Public()` par défaut — toutes les routes sont protégées sauf exception explicite

### Checklist pour protéger une nouvelle route

- [ ] Route publique ? → `@Public()`
- [ ] Restriction par rôle ? → `@Roles(Role.ADMIN, ...)`
- [ ] Vérification de permission CASL ? → `@CheckAbilities({ action, subject })`
- [ ] Vérification conditionnelle (ownership) ? → `AbilityFactory.defineAbility()` dans le code
- [ ] Tests unitaires des permissions écrits
- [ ] Swagger documenté avec les rôles requis

### Messages d'erreur

| Cas | HTTP | Message |
|-----|------|---------|
| Rate limit dépassé | 429 | ThrottlerException: Too Many Requests |
| JWT absent ou invalide | 401 | Unauthorized |
| Mauvais rôle | 403 | Forbidden |
| Permission CASL refusée | 403 | Vous n'avez pas la permission d'effectuer cette action |

---

## 10. Notifications

### Architecture générale

Le module Notification est le plus complet du projet. Il suit l'architecture hexagonale et gère l'envoi de notifications sur 5 canaux avec :
- **Traitement asynchrone** via BullMQ (Redis)
- **Templates multilingues** via nestjs-i18n (YAML) + Handlebars
- **Préférences utilisateur** (opt-in/opt-out par canal)
- **Historique** en base de données avec statuts

```
Déclencheur (HTTP ou événement domaine)
         │
         ▼
SendNotificationCommand { userIds[], type, channels[], variables, locale }
         │
         ▼
SendNotificationService
  ├── Résout les utilisateurs cibles
  │     ├── userIds = [] → tous les utilisateurs (findAll)
  │     └── userIds = ["uuid1", ...] → utilisateurs spécifiques (findByIds)
  ├── Pour chaque utilisateur × chaque canal :
  │     ├── Vérifie que le canal est activé (configuration serveur)
  │     ├── Vérifie les préférences utilisateur (opt-in/out)
  │     ├── Rend le template → HandlebarsRendererAdapter
  │     │     ├── nestjs-i18n : récupère les textes traduits (YAML)
  │     │     └── Handlebars : injecte les variables dans le layout HTML
  │     ├── Crée l'entité Notification (statut PENDING)
  │     ├── Persiste en base
  │     └── Enqueue dans BullMQ (statut QUEUED)
         │
         ▼
NotificationConsumer (worker BullMQ — asynchrone)
  ├── Sélectionne le ChannelSender approprié
  ├── Envoie via le provider (SMTP, Socket.io, web-push…)
  └── Met à jour le statut : SENT ou FAILED (avec retry automatique x3)
```

### Les 5 canaux

| Canal | Activation | Provider | Statut |
|-------|-----------|---------|--------|
| `EMAIL` | `SMTP_HOST` défini | Nodemailer | ✅ Implémenté |
| `WEBSOCKET` | `WS_ENABLED=true` | Socket.io | ✅ Implémenté |
| `WEB_PUSH` | `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` définis | Web Push API | ✅ Implémenté |
| `SMS` | Toujours désactivé | — (noop) | 🔧 À implémenter |
| `PUSH` | Toujours désactivé | — (noop) | 🔧 À implémenter |

> Si un canal est désactivé mais demandé, il est silencieusement ignoré. La requête répond normalement pour les autres canaux.

### Notifications pré-câblées

Le module écoute automatiquement ces événements domaine :

| Événement | Type | Canal | Variables transmises |
|-----------|------|-------|---------------------|
| `UserCreatedEvent` | `welcome` | EMAIL | `firstName`, `lastName`, `appName`, `verificationLink` |
| `PasswordResetRequestedEvent` | `password-reset` | EMAIL | `firstName`, `resetLink`, `expiresIn` |
| `EmailChangeRequestedEvent` | `email-change-verification` | EMAIL | `firstName`, `confirmationLink`, `expiresIn` |
| `UserDeletedEvent` | `account-deleted` | EMAIL | `firstName`, `appName` |

### Catalogue des types de notifications

#### `welcome`

Email de bienvenue avec lien de vérification, envoyé automatiquement à l'inscription.

| | |
|--|--|
| **Déclencheur** | Automatique via `UserCreatedEvent` |
| **Canaux** | EMAIL |
| **Handler** | `on-user-created.handler.ts` |

Variables : `{firstName}`, `{lastName}`, `{appName}`, `{verificationLink}`

---

#### `password-reset`

Email de réinitialisation de mot de passe avec lien valide 15 minutes.

| | |
|--|--|
| **Déclencheur** | Automatique via `PasswordResetRequestedEvent` |
| **Canaux** | EMAIL |
| **Handler** | `on-password-reset-requested.handler.ts` |

Variables : `{firstName}`, `{resetLink}`, `{expiresIn}`

---

#### `email-change-verification`

Email envoyé à la **nouvelle adresse** pour confirmer un changement d'email initié depuis le profil utilisateur. Le lien pointe vers `EMAIL_VERIFICATION_PATH` (même chemin que la vérification à l'inscription).

| | |
|--|--|
| **Déclencheur** | Automatique via `EmailChangeRequestedEvent` |
| **Canaux** | EMAIL |
| **Handler** | `on-email-change-requested.handler.ts` |

Variables : `{firstName}`, `{confirmationLink}`, `{expiresIn}`

---

#### `account-verified`

Confirmation de vérification d'email. Template défini, handler non câblé.

| | |
|--|--|
| **Déclencheur** | Manuel ou à câbler sur un événement |
| **Canaux** | Tous (selon configuration) |
| **Handler** | Aucun pré-câblé |

Variables : `{firstName}`, `{appName}`

---

#### `account-deleted`

Email de confirmation de suppression de compte, envoyé automatiquement après la clôture du compte.

| | |
|--|--|
| **Déclencheur** | Automatique via `UserDeletedEvent` |
| **Canaux** | EMAIL |
| **Handler** | `on-user-deleted.handler.ts` |

Variables : `{firstName}`, `{appName}`

> L'email est envoyé à l'adresse mémorisée au moment de la demande de suppression, avant que le compte ne soit effectivement supprimé de la base.

---

#### `generic`

Notification personnalisée libre, envoyée manuellement par un administrateur.

| | |
|--|--|
| **Déclencheur** | Manuel — `POST /api/v1/notifications/send` (ADMIN) |
| **Canaux** | Tous (selon configuration) |

Variables : `{subject}`, `{message}`

---

### API REST Notifications

#### Envoyer une notification _(ADMIN)_

```http
POST /api/v1/notifications/send
Authorization: Bearer <token>

{
  "userIds": ["550e8400-e29b-41d4-a716-446655440000"],
  "type": "generic",
  "channels": ["EMAIL", "WEBSOCKET"],
  "variables": { "subject": "Maintenance prévue", "message": "Une maintenance est prévue demain." },
  "locale": "fr"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `userIds` | `string[]` | Oui | UUIDs des destinataires. `[]` = tous les utilisateurs |
| `type` | `string` | Oui | Type de notification (ex: `generic`, `welcome`) |
| `channels` | `NotificationChannel[]` | Oui | Canaux d'envoi (`EMAIL`, `SMS`, `PUSH`, `WEB_PUSH`, `WEBSOCKET`) |
| `variables` | `object` | Non | Variables injectées dans le template |
| `locale` | `string` | Non | Langue (`fr` par défaut) |

#### Mes notifications _(Authentifié)_

```http
GET /api/v1/notifications?page=1&pageSize=10
Authorization: Bearer <token>
```

#### Marquer comme lue _(Authentifié)_

```http
PATCH /api/v1/notifications/:id/read
Authorization: Bearer <token>
```

#### Nombre de non-lues _(Authentifié)_

```http
GET /api/v1/notifications/unread-count
→ { "count": 3 }
```

#### Préférences _(Authentifié)_

```http
GET /api/v1/notifications/preferences
PUT /api/v1/notifications/preferences
{ "preferences": [{ "channel": "EMAIL", "enabled": false }] }
```

#### Prévisualiser un template _(ADMIN, dev)_

```http
GET /api/v1/notifications/preview/welcome?lang=fr&channel=EMAIL
```

### WebSocket — Notifications temps réel

#### Configuration serveur

```env
WS_ENABLED=true   # Active le canal WebSocket
```

Le gateway Socket.io écoute sur le namespace `/notifications`. L'authentification se fait via JWT transmis dans le handshake (pas de cookie).

#### Principe de fonctionnement

```
Frontend                         Backend
   │                                │
   │── connexion /notifications ────▶│ NotificationGateway.handleConnection()
   │   { auth: { token: "..." } }   │   - vérifie le JWT
   │                                │   - associe le socket à user:{userId}
   │                                │
   │                        (notification envoyée)
   │                                │ NotificationConsumer traite le job BullMQ
   │                                │ WebSocketSender.send({ to: userId })
   │                                │   ↓
   │◀── notification:new ───────────│ server.to(`user:${userId}`).emit(...)
   │   { subject, body, metadata }  │
   │                                │
   │── disconnect ──────────────────▶│ handleDisconnect() — nettoyage de la map
```

#### Intégration frontend

**Installation :**
```bash
npm install socket.io-client
```

**Connexion et écoute :**
```javascript
import { io } from 'socket.io-client';

// Connexion avec le JWT d'accès
const socket = io('http://localhost:3000/notifications', {
  auth: { token: localStorage.getItem('access_token') },
  transports: ['websocket'],     // évite le fallback polling
  reconnection: true,
  reconnectionDelay: 2000,
});

// Cycle de vie
socket.on('connect', () => console.log('Connecté:', socket.id));
socket.on('connect_error', (err) => console.error('Erreur auth:', err.message));
socket.on('disconnect', (reason) => console.log('Déconnecté:', reason));

// Recevoir une notification
socket.on('notification:new', (data) => {
  // data : { subject?: string, body: string, metadata?: object }
  showToast(data.body);
});

// Déconnexion propre (ex: logout)
socket.disconnect();
```

**Reconnexion après refresh du token :**
```javascript
function reconnectWithNewToken(newToken) {
  socket.auth = { token: newToken };
  socket.connect();
}
```

#### Événements émis par le serveur

| Événement | Payload | Description |
|-----------|---------|-------------|
| `notification:new` | `{ subject?, body, metadata? }` | Nouvelle notification reçue |
| `notification:read` | `{ notificationId }` | Notification marquée comme lue |

---

### Web Push — Notifications navigateur hors-ligne

Le canal Web Push permet d'envoyer des notifications au navigateur même lorsque l'utilisateur n'est pas sur le site, grâce à l'[API Push](https://developer.mozilla.org/fr/docs/Web/API/Push_API) et aux [VAPID keys](https://vapidkeys.com/).

#### Configuration serveur

**1. Générer les clés VAPID :**
```bash
npx web-push generate-vapid-keys
```

**2. Ajouter dans `.env` :**
```env
VAPID_PUBLIC_KEY=BNxxxxxx...   # Clé publique (partagée avec le frontend)
VAPID_PRIVATE_KEY=xxx...       # Clé privée (gardée côté serveur uniquement)
VAPID_SUBJECT=mailto:admin@monapp.fr
```

Le canal est **automatiquement activé** dès que `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` sont définis.

#### Principe de fonctionnement

```
Frontend                              Backend
   │                                     │
   │  1. Demande permission notification │
   │  navigator.serviceWorker.ready      │
   │  pushManager.subscribe(vapidKey)    │
   │    → PushSubscription { endpoint,  │
   │        keys: { p256dh, auth } }     │
   │                                     │
   │── POST /notifications/push-subs ──▶ │ RegisterPushSubscriptionCommand
   │   { endpoint, p256dh, auth }        │   → PrismaPushSubscriptionRepository.save()
   │                                     │
   │                           (notification envoyée)
   │                                     │ NotificationConsumer (WEB_PUSH)
   │                                     │   → findByUserId(userId)
   │                                     │   → WebPushSender.send({ endpoint, p256dh, auth })
   │                                     │       → web-push.sendNotification(sub, payload)
   │                                     │           ↓
   │◀── Push event ──────────────────────│ Service Worker du navigateur
   │    service-worker.js : push event   │
   │    self.registration.showNotification(...)
   │                                     │
   │── DELETE /notifications/push-subs ─▶│ DeletePushSubscriptionCommand
   │   (à l'unsubscribe ou au logout)    │   → deleteByEndpoint(endpoint)
```

#### Intégration frontend

**Étape 1 — Créer le Service Worker** (`public/sw.js`) :
```javascript
// Afficher la notification push reçue
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.data,
    })
  );
});

// Clic sur la notification → ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
```

**Étape 2 — S'abonner aux notifications push** :
```javascript
const VAPID_PUBLIC_KEY = 'BNxxxxxx...'; // depuis l'API ou variable d'env frontend

async function subscribeToPush(accessToken) {
  // Enregistrer le service worker
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Vérifier la permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // S'abonner au push manager
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Envoyer la souscription au backend
  const { endpoint, keys } = sub.toJSON();
  await fetch('/api/v1/notifications/push-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  });
}

// Utilitaire — convertit la clé VAPID base64url en Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
```

**Étape 3 — Se désabonner** (logout ou préférence utilisateur) :
```javascript
async function unsubscribeFromPush(accessToken) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  // Notifier le backend
  await fetch('/api/v1/notifications/push-subscriptions', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  // Résilier la souscription navigateur
  await sub.unsubscribe();
}
```

#### API REST Push Subscriptions

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/notifications/push-subscriptions` | Enregistrer ou mettre à jour une souscription |
| `GET` | `/api/v1/notifications/push-subscriptions` | Lister mes souscriptions actives |
| `DELETE` | `/api/v1/notifications/push-subscriptions` | Supprimer une souscription par endpoint |

#### Compatibilité navigateurs

| Navigateur | Support |
|-----------|---------|
| Chrome / Edge | ✅ |
| Firefox | ✅ |
| Safari ≥ 16 (macOS/iOS) | ✅ |
| IE / Opera Mini | ❌ |

> Le Service Worker et l'API Push ne fonctionnent qu'en **HTTPS** (ou `localhost` en développement). S'assurer que `FRONTEND_URL` est bien en `https://` en production.

---

### Templates i18n

Les textes sont dans `src/modules/notification/resources/i18n/{fr,en}/notification.yaml`.

**Structure d'une entrée :**
```yaml
mon-type:
  subject: "Sujet de l'email"
  body:    "Corps de l'email avec {variable}"
  sms:     "Version courte SMS"
  push:    "Notification push courte"
```

| Canal | Clé utilisée |
|-------|-------------|
| EMAIL | `subject` + `body` (rendu dans le layout HTML Handlebars) |
| SMS | `sms` |
| PUSH / WEB_PUSH | `push` |
| WEBSOCKET | `body` |

**Helpers Handlebars disponibles dans les emails :**

| Helper | Exemple | Résultat |
|--------|---------|----------|
| `{{formatDate date "short"}}` | `{{formatDate createdAt "short"}}` | `12/03/2025` |
| `{{formatDate date "long"}}` | `{{formatDate createdAt "long"}}` | `12 mars 2025` |
| `{{formatCurrency amount "EUR"}}` | `{{formatCurrency total "EUR"}}` | `12,50 €` |
| `{{pluralize count "article" "articles"}}` | `{{pluralize 3 "article" "articles"}}` | `3 articles` |
| `{{capitalize str}}` | `{{capitalize firstName}}` | `Jean` |

### Ajouter un nouveau type de notification

**Étape 1** — Ajouter les traductions dans les deux langues :

```yaml
# src/modules/notification/resources/i18n/fr/notification.yaml
order-confirmed:
  subject: "Commande #{orderNumber} confirmée"
  body: "Bonjour {firstName}, votre commande #{orderNumber} est confirmée."
  sms: "Commande #{orderNumber} confirmée."
  push: "Commande confirmée !"
```

**Étape 2** — Pour un envoi automatique, créer un EventsHandler :

```typescript
// src/modules/notification/core/application/events/on-order-confirmed/
// on-order-confirmed.handler.ts

@Injectable()
@EventsHandler(OrderConfirmedEvent)
export class OnOrderConfirmedHandler implements IEventHandler<OrderConfirmedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: OrderConfirmedEvent): Promise<void> {
    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'order-confirmed',
        ['EMAIL'],
        { firstName: event.firstName, orderNumber: event.orderNumber },
        'fr',
      ),
    );
  }
}
```

**Étape 3** — Enregistrer le handler dans `notification.module.ts` :

```typescript
const EventHandlers = [
  OnUserCreatedHandler,
  OnPasswordResetRequestedHandler,
  OnOrderConfirmedHandler, // ← ajouter
];
```

---

## 11. Formulaire de contact

Endpoint public permettant à tout visiteur du site d'envoyer un message aux gestionnaires.

```http
POST /api/v1/contact
(aucune authentification requise)

{
  "senderName":  "Jean Dupont",
  "senderEmail": "jean@example.com",
  "subject":     "Question sur votre service",
  "body":        "Bonjour, je souhaiterais..."
}
```

**Configuration requise :**

```env
CONTACT_EMAIL=contact@monapp.fr   # Adresse de réception
SMTP_HOST=smtp.gmail.com          # SMTP partagé avec le module Notification
```

> Si `CONTACT_EMAIL` ou `SMTP_HOST` est absent, l'API répond `204` sans envoyer (aucune information exposée sur la configuration du serveur). Vérifier les logs applicatifs pour diagnostiquer.

**Comportement :** l'email est envoyé de façon **synchrone** (pas de queue BullMQ), avec `replyTo` positionné sur l'adresse de l'expéditeur pour faciliter la réponse directe.

---

## 12. Rate Limiting

### Principe

Le rate limiting protège les routes sensibles contre les attaques par brute-force (tentatives de connexion répétées, création massive de comptes, etc.). Il est implémenté via `@nestjs/throttler`, enregistré comme premier guard global.

### Deux niveaux de limitation

L'API définit deux throttlers nommés, appliqués par IP :

| Throttler | TTL | Limite | Routes concernées |
|-----------|-----|--------|-------------------|
| `default` | 60s | 30 req | **Toutes** les routes |
| `strict` | 60s | 5 req | `login`, `register`, `forgot-password` uniquement |

Les routes sensibles subissent **les deux** limitations en parallèle. Par exemple, un attaquant sur `/auth/login` est bloqué dès 5 requêtes en 60s (throttler `strict`), même si le throttler `default` de 30 req/min n'est pas encore atteint.

### Réponse en cas de dépassement

Lorsqu'un client dépasse la limite, l'API retourne :

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### Headers de rate limiting

Chaque réponse inclut des headers informatifs :

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Nombre max de requêtes autorisées dans la fenêtre |
| `X-RateLimit-Remaining` | Requêtes restantes |
| `X-RateLimit-Reset` | Timestamp (epoch) de réinitialisation du compteur |
| `Retry-After` | Secondes à attendre (présent uniquement sur les réponses 429) |

### Configuration

Les limites sont configurables via variables d'environnement (voir [Annexe B](#b-variables-denvironnement)) :

```env
THROTTLE_DEFAULT_TTL=60       # Fenêtre en secondes (défaut: 60)
THROTTLE_DEFAULT_LIMIT=30     # Requêtes par fenêtre (défaut: 30)
THROTTLE_STRICT_TTL=60        # Fenêtre en secondes (défaut: 60)
THROTTLE_STRICT_LIMIT=5       # Requêtes par fenêtre (défaut: 5)
```

### Application dans le code

Le `ThrottlerGuard` est enregistré globalement. Le throttler `strict` est désactivé par défaut au niveau du controller Auth et réactivé route par route :

```typescript
@Controller('auth')
@SkipThrottle({ strict: true })  // Désactive strict par défaut
export class AuthHttpController {

  @Post('login')
  @Throttle({ strict: {} })      // Réactive strict sur cette route
  async login() {}

  @Post('refresh')
  // Pas de @Throttle → seul le throttler default s'applique
  async refresh() {}
}
```

### Storage

Le stockage des compteurs est **en mémoire** (par instance). Pour un déploiement multi-instance, migrer vers un storage Redis via `@nestjs/throttler-storage-redis`.

### Routes protégées par le throttler strict

| Route | Risque couvert |
|-------|---------------|
| `POST /auth/login` | Brute-force de mots de passe |
| `POST /auth/register` | Création massive de comptes |
| `POST /auth/forgot-password` | Bombardement d'emails de reset |

> Les routes `refresh`, `reset-password` et `verify-email` ne sont protégées que par le throttler `default` (30 req/min), car elles nécessitent un token valide pour aboutir.

---

# Partie IV — Infrastructure

## 12. Base de données

### PostgreSQL + Prisma 7

Le projet utilise **Prisma ORM version 7** avec le driver adapter `@prisma/adapter-pg`. Prisma 7 a introduit des changements notables par rapport aux versions précédentes.

#### Fichiers de configuration

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Définition du schéma (modèles, enums, relations) |
| `prisma.config.ts` *(racine)* | URL de connexion et chemins de migration |
| `src/database/prisma.module.ts` | Module NestJS global exposant `PrismaService` |

> **Migration Prisma 7** : plusieurs changements incompatibles avec Prisma ≤ 6.

#### Changements Prisma 7 vs versions précédentes

| Aspect | Prisma ≤ 6 | Prisma 7 |
|--------|-----------|---------|
| URL datasource | Dans `schema.prisma` | Dans `prisma.config.ts` |
| Fichier de config | Aucun | `prisma.config.ts` à la racine |
| Driver | Intégré | Obligatoire (`@prisma/adapter-pg`) |
| TypeScript module | `"moduleResolution": "bundler"` OK | `"moduleResolution": "node"` requis |

**`prisma.config.ts`** (à la racine, obligatoire) :
```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
```

**`schema.prisma`** — la propriété `url` est supprimée :
```prisma
datasource db {
  provider = "postgresql"
  // Pas de url ici — elle est dans prisma.config.ts
}
```

**`PrismaService`** avec driver adapter :
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not defined');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

#### Schéma de données

```
User
  ├── id, email, passwordHash
  ├── firstName, lastName, role
  ├── emailVerified, emailVerifiedAt
  ├── createdAt, updatedAt
  │
  ├── RefreshToken[]          ← tokens de session
  ├── Notification[]          ← historique des notifications reçues
  ├── NotificationPreference[] ← préférences par canal (opt-in/out)
  └── PushSubscription[]      ← endpoints Web-Push

Notification
  ├── id, userId, type, channel, status
  ├── subject, body, metadata (JSON)
  ├── sentAt, readAt, failedAt, failureReason
  └── retryCount, createdAt, updatedAt

NotificationPreference
  ├── id, userId, channel, enabled
  └── createdAt, updatedAt

PushSubscription
  ├── id, userId, endpoint, p256dh, auth
  └── createdAt
```

**Enums :**

```
Role                     NotificationChannel       NotificationStatus
  SUPER_ADMIN              EMAIL                     PENDING
  ADMIN                    SMS                       QUEUED
  AUTHENTICATED_USER       PUSH                      SENT
  ANONYMOUS_USER           WEB_PUSH                  FAILED
                           WEBSOCKET                 READ
```

#### Commandes essentielles

```bash
# Créer une migration (après modification du schéma)
npx prisma migrate dev --name ma_migration

# Appliquer les migrations (production)
npx prisma migrate deploy

# Régénérer le client Prisma
npx prisma generate

# Ouvrir Prisma Studio (interface web)
npx prisma studio

# Peupler la base avec des données de test
npm run prisma:seed
```

#### Travailler avec les champs JSON

```typescript
// Pour un champ JSON nullable en Prisma 7 :
import { Prisma } from '@prisma/client';

// Valeur null → utiliser Prisma.JsonNull (pas null natif)
metadata: notification.metadata ?? Prisma.JsonNull

// Cast pour l'écriture
metadata: notification.metadata as Prisma.InputJsonValue
```

---

## 13. Observabilité

### Logging (Pino)

L'API utilise **Pino** via `nestjs-pino`. Pino est 10× plus rapide que Winston et produit des logs JSON natifs, idéaux pour les outils d'agrégation (Loki, CloudWatch, ELK).

**Développement** — logs colorés et lisibles :
```
[2025-12-24 18:32:40] INFO  [Bootstrap] 🚀 Application is running on: http://localhost:3000
[2025-12-24 18:32:41] INFO  POST /api/v1/auth/register 45ms
```

**Production** — JSON structuré :
```json
{
  "level": "info",
  "time": 1735064400123,
  "requestId": "a1b2c3d4-...",
  "context": "RegisterService",
  "req": { "method": "POST", "url": "/api/v1/auth/register" },
  "res": { "statusCode": 201 },
  "responseTime": 45,
  "msg": "User registered"
}
```

**Niveaux actifs :**

| Niveau | Description | Dev | Prod |
|--------|-------------|-----|------|
| `error` | Erreurs critiques | ✅ | ✅ |
| `warn` | Avertissements | ✅ | ✅ |
| `info` | Actions importantes | ✅ | ✅ |
| `debug` | Détails de débogage | ✅ | ❌ |

**Données automatiquement masquées :** `password`, `passwordHash`, `token`, `refreshToken`, `authorization` header.

**Utilisation dans les services :**
```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(dto: CreateUserDto) {
    this.logger.log(`Creating user: ${dto.email}`);
    // Le requestId est automatiquement inclus dans tous les logs Pino
  }
}
```

### Request ID

Chaque requête reçoit un identifiant unique (`UUID v4`) injecté par le middleware `RequestIdMiddleware`. Cet ID est :
- Transmis dans le header de réponse `X-Request-ID`
- Inclus dans tous les logs de la requête (automatiquement via Pino)
- Propageable entre microservices en réutilisant le header `X-Request-ID`
- Propageable au frontend pour le support utilisateur

```bash
# Réponse HTTP inclut :
X-Request-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Health Checks

#### Endpoints

| Endpoint | Accès | Usage | Vérifications |
|----------|-------|-------|---------------|
| `GET /api/v1/health` | **SUPER_ADMIN** | Monitoring général | DB, mémoire heap, mémoire RSS, disque, Redis |
| `GET /api/v1/health/live` | **Public** | Kubernetes `livenessProbe` | Application vivante (mémoire heap < 1GB) |
| `GET /api/v1/health/ready` | **Public** | Kubernetes `readinessProbe` | PostgreSQL + Redis accessibles |
| `GET /api/v1/health/db` | **SUPER_ADMIN** | Vérification ciblée | PostgreSQL ping via Prisma |
| `GET /api/v1/health/redis` | **SUPER_ADMIN** | Vérification ciblée | Redis ping via ioredis |
| `POST /api/v1/health/trigger` | **SUPER_ADMIN** | Dev uniquement | Déclenche un cycle de monitoring immédiat |

> **Sécurité :** les endpoints détaillés (`/health`, `/health/db`, `/health/redis`, `/health/trigger`) exposent des informations sensibles sur l'infrastructure. Ils sont protégés par JWT + `RolesGuard` et ne répondent qu'aux utilisateurs `SUPER_ADMIN`. Les probes Kubernetes (`/live`, `/ready`) restent publics car les load balancers et orchestrateurs n'envoient pas de token d'authentification.

#### Seuils de santé

| Indicateur | Seuil d'alerte | Déclenche une notification |
|------------|---------------|--------------------------|
| Base de données | Connexion OK | Oui |
| Redis | Connexion OK (ping) | Oui |
| Mémoire heap | < 512 MB (endpoint) / < 85% (monitor) | Oui |
| Mémoire RSS | < 1 GB | Non (endpoint uniquement) |
| Espace disque | > 50% libre sur `/` | Non (endpoint uniquement) |

#### Réponses

```json
// Succès (HTTP 200)
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "disk": { "status": "up" }
  }
}

// Échec (HTTP 503)
{
  "status": "error",
  "error": { "redis": { "status": "down", "message": "ECONNREFUSED" } }
}
```

#### Configuration Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health/ready  # Vérifie DB + Redis
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### Health Monitor — Alertes proactives SUPER_ADMIN

Le `HealthMonitorService` tourne en tâche planifiée (toutes les 5 minutes) et envoie des notifications aux utilisateurs avec le rôle `SUPER_ADMIN` en cas de dégradation ou de rétablissement d'un service.

#### Principe de fonctionnement

```
Toutes les 5 minutes (@nestjs/schedule @Interval)
    │
    ├── checkDatabase()  → Prisma $queryRaw (latence > 2s = dégradé)
    ├── checkRedis()     → ioredis ping
    └── checkMemory()    → process.memoryUsage() heap > 85% = dégradé
                │
                ▼ Changement d'état détecté (ok → dégradé ou dégradé → ok)
                │
                ├── userRepository.findByRole(SUPER_ADMIN)
                └── Pour chaque admin : SendNotificationCommand
                      type:     'health-alert'
                      channels: [EMAIL, WEBSOCKET, WEB_PUSH]
                      variables: { service, statusLabel, details, timestamp }
```

**Deduplication :** Un `Map<service, état>` en mémoire empêche les alertes répétées tant que l'état ne change pas. Une alerte est envoyée :
- Lorsqu'un service passe de `ok` → `dégradé`
- Lorsqu'un service passe de `dégradé` → `ok` (alerte de rétablissement)
- Au démarrage si un service est déjà dégradé

#### Services surveillés

| Service | Méthode de vérification | Critère de dégradation |
|---------|------------------------|------------------------|
| `database` | `Prisma.$queryRaw SELECT 1` | Erreur de connexion ou latence > 2000ms |
| `redis` | `ioredis.ping()` | Erreur de connexion ou timeout |
| `memory` | `process.memoryUsage()` | Heap utilisé > 85% du heap total |

#### Variables des notifications d'alerte

| Variable | Valeur exemple |
|----------|---------------|
| `service` | `database`, `redis`, `memory` |
| `statusLabel` | `dégradé` / `rétabli` |
| `details` | `Latence: 2400ms`, `ECONNREFUSED`, `Heap: 88% (450MB/512MB)` |
| `timestamp` | `2026-02-13T14:30:00.000Z` |
| `appName` | Valeur de `app.siteName` dans la config (`SITE_NAME`) |

#### Exemple d'email reçu par un SUPER_ADMIN

```
Objet : [Starter API] Alerte système — database dégradé

Le service database est dégradé.
Détails : Latence: 2450ms
Heure : 2026-02-13T14:30:00.000Z
```

Lorsque la base de données se rétablit :

```
Objet : [Starter API] Alerte système — database rétabli

Le service database est rétabli.
Détails : Latence: 45ms
Heure : 2026-02-13T14:35:00.000Z
```

#### Ajouter un SUPER_ADMIN pour recevoir les alertes

Via le seed (`prisma/seed.ts`) ou via l'API (`PUT /api/v1/users/:id` avec le rôle `SUPER_ADMIN`).

#### Modifier l'intervalle de vérification

Dans [src/shared/infrastructure/health/health-monitor.service.ts](src/shared/infrastructure/health/health-monitor.service.ts) :

```typescript
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — modifier ici
```

#### Modifier les seuils

| Seuil | Fichier | Constante |
|-------|---------|-----------|
| Latence DB max (ms) | `health-monitor.service.ts` | `2000` dans `checkDatabase()` |
| Heap max (%) | `health-monitor.service.ts` | `HEAP_WARN_PERCENT = 85` |

#### Désactiver les notifications d'alerte

Les vérifications continuent de tourner (logs conservés), mais aucune notification n'est envoyée aux SUPER_ADMIN :

```env
HEALTH_MONITOR_NOTIFICATIONS_ENABLED=false
```

> Utile en environnement de développement ou de staging pour éviter les fausses alertes liées à une infra dégradée intentionnellement.

### Graceful Shutdown

L'application intercepte `SIGTERM` et `SIGINT` pour s'arrêter proprement.

**Séquence d'arrêt :**
1. Signal reçu (SIGTERM depuis Docker/Kubernetes, SIGINT depuis CTRL+C)
2. Log : `SIGTERM received. Closing application gracefully...`
3. `app.close()` : arrêt des nouvelles requêtes, attente des requêtes en cours
4. Hooks `onModuleDestroy` : fermeture de PrismaService (`$disconnect()`)
5. Log : `Application closed successfully`
6. `process.exit(0)`

| Signal | Source |
|--------|--------|
| `SIGTERM` | Docker, Kubernetes, systemd — arrêt normal |
| `SIGINT` | CTRL+C — interruption clavier |

Configuration : `app.enableShutdownHooks()` dans `main.ts`.

---

## 14. Analytics (Matomo)

L'API intègre **Matomo** (analytics open source, auto-hébergé, RGPD-friendly) pour le suivi des événements métier. Le tracking est **facultatif** : si `MATOMO_URL` ou `MATOMO_SITE_ID` sont absents, il est silencieusement désactivé avec un log d'avertissement.

### Architecture

```
MatomoModule (@Global)
  └── MatomoService
        ├── tracker: MatomoTracker | null   (null si désactivé)
        ├── enabled: boolean
        └── trackEvent(params)              (méthode générique)
```

`MatomoService` est déclaré `@Global()` : il est injectable dans tous les modules sans import explicite de `MatomoModule`. Il est initialisé au démarrage avec `MATOMO_URL` + `MATOMO_SITE_ID`.

### Catalogue des événements trackés

| Catégorie | Action | userId | Déclencheur |
|-----------|--------|:------:|-------------|
| `User` | `Register` | ✅ | Inscription réussie |
| `User` | `Login` | ✅ | Connexion réussie |
| `Auth` | `Logout` | ✅ | Déconnexion |
| `Auth` | `LoginFailed` | ❌ | Mot de passe incorrect |
| `Auth` | `EmailVerified` | ✅ | Vérification d'email |
| `Auth` | `PasswordResetRequested` | ❌ | Demande de réinitialisation |
| `Auth` | `PasswordResetCompleted` | ✅ | Réinitialisation effectuée |
| `Auth` | `TokenRefresh` | ✅ | Renouvellement de token |
| `User` | `ProfileUpdated` | ✅ | Modification du profil |
| `User` | `Deleted` | ✅ | Suppression de compte |
| `Notification` | `Sent` *(+ canal)* | ✅ | Notification envoyée (BullMQ) |
| `Notification` | `Failed` *(+ canal)* | ✅ | Notification échouée |
| `Notification` | `PreferencesUpdated` | ✅ | Mise à jour des préférences |
| `Notification` | `MarkedAsRead` | ✅ | Notification marquée comme lue |

> **Sécurité** : `LoginFailed` et `PasswordResetRequested` sont trackés **sans `userId`** pour ne pas confirmer l'existence d'un compte en cas d'attaque par énumération.

Pour les notifications, le **canal** est passé en paramètre `name` (ex: `EMAIL`, `WEBSOCKET`) permettant de segmenter par canal dans Matomo.

### Utilisation dans un service

```typescript
@Injectable()
export class MyService {
  constructor(private readonly matomoService: MatomoService) {}

  async doSomething(userId: string): Promise<void> {
    // ... logique métier ...
    await this.matomoService.trackEvent({
      category: 'MaCategorie',
      action: 'MonAction',
      userId,
    });
  }
}
```

Les méthodes spécialisées (`trackUserLogin`, `trackUserLogout`, etc.) appellent toutes `trackEvent()` en interne. Les erreurs de tracking sont silencieuses (loguées, jamais propagées).

### Consulter les données dans l'admin Matomo

Aucune configuration backend supplémentaire n'est requise : le service utilise directement l'**HTTP Tracking API** de Matomo (`/matomo.php`). Dès que les variables d'environnement sont renseignées et que du trafic est généré, les données apparaissent dans l'interface.

#### Rapport Évènements

Chemin : **Comportement → Évènements** (ou *Behavior → Events* en anglais)

Matomo organise les événements sur 3 niveaux hiérarchiques :

```
Catégorie (Category)
  └── Action
        └── Nom (Name)   — utilisé pour le canal des notifications
```

Pour l'API :

| Vue Matomo | Ce que vous voyez |
|------------|-------------------|
| Catégories | `Auth`, `User`, `Notification` |
| Actions (sous `Auth`) | `Logout`, `LoginFailed`, `EmailVerified`, `PasswordResetRequested`, `PasswordResetCompleted`, `TokenRefresh` |
| Actions (sous `User`) | `Register`, `Login`, `ProfileUpdated`, `Deleted` |
| Actions (sous `Notification`) | `Sent`, `Failed`, `PreferencesUpdated`, `MarkedAsRead` |
| Noms (sous `Sent` / `Failed`) | `EMAIL`, `SMS`, `PUSH`, `WEB_PUSH`, `WEBSOCKET` |

Pour chaque combinaison, Matomo affiche : **nombre total d'événements**, **visiteurs uniques**, et **valeur** (non utilisée ici).

#### Profils visiteurs (userId)

Les événements associés à un `userId` sont rattachés au **profil visiteur** correspondant dans Matomo.

Chemin : **Visiteurs → Profils des visiteurs** — saisir un `userId` dans la barre de recherche pour voir l'historique complet d'un utilisateur.

> Nécessite que l'option **"Suivi des visiteurs"** soit activée dans *Administration → Vie privée → Anonymisation des données* (elle l'est par défaut sur les nouvelles installations).

#### Segments personnalisés

Dans n'importe quel rapport, cliquer sur **"+ Ajouter un segment"** pour filtrer par dimension :

| Dimension | Exemple de filtre |
|-----------|-------------------|
| Catégorie d'évènement | `= Auth` |
| Action d'évènement | `= LoginFailed` |
| Nom d'évènement | `= EMAIL` |
| ID du visiteur | `= <userId>` |

#### Objectifs et entonnoirs (Goals & Funnels)

Pour mesurer des taux de conversion (ex: inscription → vérification email → premier login) :

1. Aller dans **Conversions → Objectifs → Ajouter un objectif**
2. Choisir le déclencheur **"Évènement"**
3. Configurer : Catégorie `= User` + Action `= Register`
4. Répéter pour chaque étape de l'entonnoir

> Le plugin **Funnels** (disponible dans Matomo Cloud ou Matomo On-Premise avec une licence) permet de visualiser les abandons entre étapes.

#### Rapports personnalisés

Chemin : **Rapports personnalisés → Nouveau rapport** (plugin *Custom Reports*, inclus dans Matomo On-Premise ≥ 4.x)

Exemple de rapport utile — **Taux d'échec de connexion** :
- Dimension 1 : Action d'évènement
- Métriques : Évènements
- Filtre : Catégorie `= Auth`, Action `= LoginFailed`

#### Alertes automatiques

Chemin : **Administration → Alertes personnalisées**

Exemple : déclencher une alerte si `LoginFailed` dépasse 100 événements en 1 heure → signe potentiel d'attaque bruteforce.

#### API Reporting Matomo

Les données sont également accessibles via l'**API REST de Matomo** (utile pour intégrer des dashboards externes) :

```
GET https://matomo.monapp.fr/index.php
  ?module=API
  &method=Events.getCategory
  &idSite=1
  &period=day
  &date=today
  &token_auth=<MATOMO_TOKEN>
  &format=JSON
```

> `MATOMO_TOKEN` (généré dans *Administration → Sécurité → Tokens d'authentification*) doit être renseigné dans les variables d'environnement pour utiliser l'API.

---

### Configuration

Voir [Annexe B → Matomo Analytics](#matomo-analytics-optionnel).

Dès que `MATOMO_URL` et `MATOMO_SITE_ID` sont définis, le tracking s'active automatiquement. Le service est disponible dans `src/shared/infrastructure/analytics/matomo.service.ts`.

```env
MATOMO_URL=http://matomo.monapp.fr
MATOMO_SITE_ID=1
MATOMO_TOKEN=xxxxxxxxxxxx   # optionnel (API Matomo)
```

---

## 15. Gestion des secrets (SOPS)

### Pourquoi SOPS ?

Les fichiers `.env` en clair **ne doivent jamais être commités**. SOPS permet de chiffrer le fichier de secrets et de versionner le fichier chiffré (`.env.enc`) en toute sécurité.

```
.env          ← jamais commité (dans .gitignore)
.env.enc      ← commité, chiffré avec les clés publiques de l'équipe
.env.dist     ← commité, template sans valeurs sensibles
```

### Installation

```bash
# macOS
brew install sops age

# Linux
apt install age
curl -LO https://github.com/getsops/sops/releases/latest/download/sops-linux-amd64
chmod +x sops-linux-amd64 && sudo mv sops-linux-amd64 /usr/local/bin/sops
```

### Workflows

```bash
# Générer sa clé age
age-keygen -o ~/.config/sops/age/keys.txt

# Chiffrer .env (ajouter sa clé publique dans .sops.yaml d'abord)
make sops-encrypt   # ou : sops --encrypt .env > .env.enc

# Déchiffrer .env
make sops-decrypt   # ou : sops --decrypt .env.enc > .env

# Modifier les secrets directement dans l'éditeur
sops .env.enc
```

### Ajouter un développeur à l'équipe

1. Le nouveau développeur génère sa clé :
   ```bash
   age-keygen -o ~/.config/sops/age/keys.txt
   grep "public key:" ~/.config/sops/age/keys.txt
   # → public key: age1xyz789...
   ```
2. Ajouter la clé dans `.sops.yaml` :
   ```yaml
   creation_rules:
     - path_regex: \.env\.enc$
       age: >-
         age1abc...devexistant,
         age1xyz...nouveaudev
   ```
   > **Remarque** : séparer les clés par des virgules dans la valeur `age: >-`
3. Re-chiffrer et commiter :
   ```bash
   make secrets-encrypt
   git add .sops.yaml .env.enc
   git commit -m "chore: add new developer to SOPS"
   ```

### Révoquer l'accès d'un développeur

1. Retirer sa clé publique de `.sops.yaml`
2. Re-chiffrer : `make secrets-encrypt`
3. Commiter et pousser
4. **Important** : Effectuer une rotation des secrets (JWT, DB password, etc.) — la clé privée compromise peut avoir déchiffré les anciens secrets

### Rotation des secrets

À effectuer lors du départ d'un développeur, d'une compromission, ou tous les 90 jours.

```bash
# 1. Générer de nouveaux secrets
make secrets-generate

# 2. Éditer .env avec les nouvelles valeurs
nano .env

# 3. Re-chiffrer
make secrets-encrypt
git add .env.enc
git commit -m "chore: rotate secrets"

# 4. Redéployer pour appliquer les nouveaux secrets
```

### Troubleshooting SOPS

**`Error: no decryption key found for age recipient`**

Votre clé privée ne correspond pas aux clés de `.sops.yaml`.
```bash
grep "public key:" ~/.config/sops/age/keys.txt  # votre clé publique
cat .sops.yaml                                   # clés autorisées
# Si différentes → demander à un collègue de vous ajouter
```

**`Error: failed to decrypt: age: invalid identity`**

Clé privée corrompue ou absente.
```bash
ls -la ~/.config/sops/age/keys.txt
# Si absente → restaurer depuis votre gestionnaire de mots de passe
```

**Fichier `.env.enc` corrompu**
```bash
git log --oneline .env.enc  # voir l'historique
git checkout HEAD~1 .env.enc
make secrets-decrypt
```

**Permissions incorrectes**
```bash
chmod 600 ~/.config/sops/age/keys.txt
chmod 700 ~/.config/sops/age/
```

### Workflow Git pour les secrets

```bash
# Modifier les secrets
nano .env
make secrets-encrypt

# Commiter UNIQUEMENT la version chiffrée
git add .env.enc .sops.yaml
git commit -m "chore(secrets): update JWT configuration"

# Vérifier que .env n'est PAS staged
git status  # .env doit être dans "Untracked" ou "Ignored"
```

> **⚠️ CRITIQUE** : Ne jamais commiter `.env` en clair ni `~/.config/sops/age/keys.txt`

---

# Partie V — Développement

## 16. Git workflow

### Stratégie de branches

```
master (production)
  └── dev (intégration)
        ├── feature/nom-feature
        ├── fix/description-du-bug
        ├── refactor/quoi
        └── docs/quoi
```

### Nommage des branches

Format : `type/description-courte` (tirets, minuscules, anglais de préférence)

| Type | Utilisation | Exemple |
|------|-------------|---------|
| `feature` | Nouvelle fonctionnalité | `feature/password-reset` |
| `fix` | Correction de bug | `fix/login-token-expiration` |
| `refactor` | Refactoring | `refactor/prisma-repositories` |
| `docs` | Documentation | `docs/api-endpoints` |
| `test` | Tests | `test/auth-e2e` |
| `chore` | Maintenance | `chore/update-dependencies` |

❌ À éviter : espaces, underscores, noms > 50 caractères, majuscules

### Convention de commits

Format : `type(scope): description courte`

| Type | Usage | Exemple |
|------|-------|---------|
| `feat` | Nouvelle fonctionnalité | `feat(auth): add JWT refresh token` |
| `fix` | Correction de bug | `fix(user): resolve avatar upload issue` |
| `docs` | Documentation | `docs(readme): update installation steps` |
| `refactor` | Refactoring sans changement de comportement | `refactor(auth): simplify token validation` |
| `test` | Ajout ou modification de tests | `test(user): add integration tests` |
| `chore` | Maintenance, dépendances | `chore: update NestJS to 11.0` |
| `perf` | Amélioration des performances | `perf(db): optimize user query` |
| `ci` | Modifications CI/CD | `ci: add GitHub Actions workflow` |
| `build` | Système de build | `build: update Docker configuration` |
| `style` | Formatage (aucun changement de code) | `style: format with prettier` |

**Scopes** : `auth`, `user`, `notification`, `config`, `db`, `tests`, `docs`

**Règles de description** :
- Longueur maximum : 72 caractères
- Style impératif ("add" pas "added")
- Minuscule, pas de point final

**Commits atomiques** : un commit = un seul changement logique cohérent. Un commit atomique peut être compris, revu, et annulé indépendamment des autres. Si le message "et" apparaît dans votre description, le commit est probablement trop gros.

```bash
# ✅ Atomique : un commit par changement logique
git commit -m "feat(user): add email value object"
git commit -m "test(user): add email value object unit tests"

# ❌ Trop gros : plusieurs changements mélangés
git commit -m "feat(user): add email value object and update service and fix bug"
```

### Workflow de développement

```bash
# 1. Partir de dev à jour
git checkout dev && git pull

# 2. Créer la branche
git checkout -b feature/ma-fonctionnalite

# 3. Développer et tester
make test
make lint

# 4. Commiter de façon atomique
git add src/modules/...
git commit -m "feat(module): description courte"

# 5. Mettre à jour depuis dev avant la PR
git fetch origin && git rebase origin/dev

# 6. Créer la Pull Request vers dev
gh pr create --base dev --title "feat(module): ma fonctionnalite"
```

### Template de Pull Request

```markdown
## Description
Brève description des changements

## Type de changement
- [ ] Nouvelle fonctionnalité (feat)
- [ ] Correction de bug (fix)
- [ ] Refactoring (refactor)
- [ ] Documentation (docs)
- [ ] Tests (test)

## Checklist
- [ ] Tests passants (`make test`)
- [ ] Lint passant (`make lint`)
- [ ] Documentation mise à jour si nécessaire
```

### Résolution de conflits

```bash
# Conflit lors d'un merge
git merge feature/autre-feature
# CONFLICT (content): Merge conflict in src/...

# Éditer manuellement les fichiers en conflit :
# Choisir entre <<<<<<< HEAD, ======= et >>>>>>> feature/autre
# Puis :
git add <fichier-résolu>
git commit -m "fix: resolve merge conflict in auth.service.ts"

# Annuler un merge en cours
git merge --abort
```

### Anti-patterns

```bash
# ❌ JAMAIS commiter directement sur master
git checkout master && git commit -m "fix something"

# ❌ Messages vagues
git commit -m "fix stuff"
git commit -m "wip"

# ❌ Réécrire l'historique public
git rebase -i HEAD~5 && git push --force origin dev

# ❌ Commiter des secrets
git add .env && git commit -m "add config"
```

### Commandes utiles

```bash
# Historique graphique
git log --oneline --graph --all

# Annuler le dernier commit (garder les changements)
git reset --soft HEAD~1

# Supprimer les branches mergées
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d

# Nettoyer les références distantes
git remote prune origin

# Chercher dans l'historique
git log --grep="auth"
```

### Versioning sémantique

```
MAJOR.MINOR.PATCH
  │      │     └── Correction de bug rétrocompatible
  │      └──────── Nouvelle fonctionnalité rétrocompatible
  └─────────────── Changement incompatible (breaking change)
```

---

## 17. Tests

### Structure des tests

```
test/
├── unit/                       # 82 suites, 659 tests
│   ├── modules/
│   │   ├── auth/               # commands, queries, dtos, guards, repositories
│   │   ├── user/               # entities, VOs, commands, queries, dtos, controllers
│   │   └── notification/       # entities, VOs, commands, queries, events, dtos,
│   │                           #   repositories, templates, controllers
│   └── shared/                 # decorators, infrastructure, utils
└── integration/                # 9 suites (auth, user, notification, RBAC)
```

### Commandes

```bash
npm run test              # Tests unitaires (watch mode)
npm run test:ci           # Tests unitaires (CI, une fois)
npm run test:coverage     # Couverture de code
npm run test:integration  # Tests d'intégration
```

### Patterns de test

**Unit test d'un Command Service :**
```typescript
describe('SendContactEmailService', () => {
  const buildModule = async (configOverrides = {}) => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) =>
        key in config ? config[key] : defaultValue
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        SendContactEmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    return module.get<SendContactEmailService>(SendContactEmailService);
  };
});
```

---

## 18. Commandes du projet (Makefile)

```bash
make help           # Afficher toutes les commandes disponibles
```

### Secrets (SOPS)

```bash
make secrets-setup      # Configuration initiale (génère la clé age)
make secrets-encrypt    # Chiffrer .env → .env.enc
make secrets-decrypt    # Déchiffrer .env.enc → .env
make secrets-edit       # Éditer directement les secrets chiffrés (ouvre $EDITOR)
make secrets-generate   # Générer des secrets JWT aléatoires forts
```

### Développement

```bash
make start          # Démarrer tous les services Docker (API, PostgreSQL, Redis, Mailhog)
make stop           # Arrêter tous les services
make restart        # Redémarrer
make build          # Rebuilder les images Docker
make rebuild        # Rebuilder et redémarrer
make status         # Voir le statut des services
make shell          # Ouvrir un shell dans le container API
make shell-db       # Ouvrir psql dans le container PostgreSQL
```

### Logs

```bash
make logs           # Tous les logs
make logs-api       # Logs de l'API uniquement (suivre en temps réel)
make logs-db        # Logs de PostgreSQL
make logs-matomo    # Logs de Matomo
```

### Base de données

```bash
make migrate            # Appliquer les migrations Prisma
make migrate-create     # Créer une nouvelle migration (demande un nom)
make prisma-generate    # Régénérer le Prisma Client
make prisma-studio      # Ouvrir Prisma Studio (interface graphique)
make seed               # Peupler la base avec les données de test
make db-reset           # Réinitialiser complètement la base (dev uniquement)
```

### Tests

```bash
make test           # Tests unitaires (une fois)
make test-watch     # Tests en mode watch
make test-cov       # Couverture de code
make test-e2e       # Tests E2E
make test-db-setup  # Créer et configurer la base de test (première fois)
make test-db-reset  # Réinitialiser la base de test
```

### Qualité du code

```bash
make lint           # Linter le code (ESLint)
make format         # Formater le code (Prettier)
```

### Installation & nettoyage

```bash
make install        # Installer les dépendances npm
make clean          # Nettoyer containers et volumes
make clean-all      # Nettoyage complet avec images Docker
```

### Workflows typiques

**Setup initial (première fois) :**
```bash
make secrets-setup    # Générer sa clé age
make secrets-decrypt  # Déchiffrer les secrets de l'équipe
make start            # Démarrer l'infrastructure
make migrate          # Appliquer les migrations
make seed             # Données de test (optionnel)
```

**Développement quotidien :**
```bash
make start       # Démarrer
make logs-api    # Suivre les logs
# … développer avec hot reload …
make test        # Tester
make stop        # Arrêter
```

**Migration :**
```bash
# 1. Modifier prisma/schema.prisma
make migrate-create   # Créer la migration
make migrate          # Appliquer
git add prisma/       # Commiter les fichiers de migration
```

---

# Annexes

## A. Référence API complète

### Authentification (`/api/v1/auth`)

| Méthode | Route | Corps | Réponse | Accès |
|---------|-------|-------|---------|-------|
| POST | `/register` | `{email, password, firstName, lastName, termsAccepted}` | `204` | Public |
| POST | `/login` | `{email, password}` | `{accessToken, refreshToken, expiresIn}` | Public |
| POST | `/logout` | `{refreshToken}` | `204` | Authentifié |
| POST | `/refresh` | `{refreshToken}` | `{accessToken, refreshToken}` | Public |
| POST | `/forgot-password` | `{email}` | `204` | Public |
| POST | `/reset-password` | `{token, newPassword}` | `204` | Public |
| POST | `/verify-email` | `{token}` | `204` | Public |

### Utilisateurs (`/api/v1/users`)

| Méthode | Route | Réponse | Accès |
|---------|-------|---------|-------|
| GET | `/me` | `UserProfileDto` | Authentifié |
| PUT | `/me` | `UserProfileDto` | Authentifié |
| DELETE | `/me` | `204` | Authentifié |
| GET | `/` | `PaginatedResponseDto<UserProfileDto>` | ADMIN |
| GET | `/search?q=&limit=` | `UserProfileDto[]` | ADMIN |
| GET | `/:id` | `UserProfileDto` | ADMIN |
| PUT | `/:id` | `UserProfileDto` | ADMIN |
| DELETE | `/:id` | `204` | ADMIN |

### Notifications (`/api/v1/notifications`)

| Méthode | Route | Réponse | Accès |
|---------|-------|---------|-------|
| POST | `/send` | `NotificationResponseDto[]` | ADMIN |
| GET | `/` | `NotificationResponseDto[]` | Authentifié |
| PATCH | `/:id/read` | `204` | Authentifié (owner) |
| GET | `/unread-count` | `{count: number}` | Authentifié |
| GET | `/preferences` | `NotificationPreferenceDto[]` | Authentifié |
| PUT | `/preferences` | `204` | Authentifié |
| GET | `/preview/:type` | HTML | ADMIN |

### Contact

| Méthode | Route | Corps | Réponse | Accès |
|---------|-------|-------|---------|-------|
| POST | `/api/v1/contact` | `{senderName, senderEmail, subject, body}` | `204` | Public |

### Codes d'erreur

| Code | Signification |
|------|--------------|
| `400` | Données invalides (validation) ou token invalide/expiré |
| `401` | Non authentifié (JWT absent ou invalide) |
| `403` | Permissions insuffisantes |
| `404` | Ressource introuvable |
| `409` | Conflit (ex: email déjà utilisé) |
| `429` | Trop de requêtes (rate limiting) |
| `422` | Canal désactivé ou CGU non acceptées |
| `500` | Erreur serveur interne |

---

## B. Variables d'environnement

### Application

| Variable | Défaut | Description |
|----------|--------|-------------|
| `NODE_ENV` | `development` | Environnement (`development`, `production`, `test`) |
| `PORT` | `3000` | Port d'écoute |
| `API_PREFIX` | `api/v1` | Préfixe des routes |
| `FRONTEND_URL` | `http://localhost:4200` | URL publique du frontend (liens de reset, vérification email, lien dans le footer des emails) |
| `SITE_NAME` | `Mon Application` | Nom du site frontend affiché dans le copyright des emails |
| `EMAIL_VERIFICATION_PATH` | `/verify-email` | Chemin frontend pour la vérification email |
| `CONTACT_EMAIL` | — | Adresse de réception des messages de contact |
| `ENABLE_CORS` | `true` | Activer CORS |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Origines CORS autorisées (séparées par `,`) |

### Base de données

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_URL` | — | URL PostgreSQL complète |
| `DB_USERNAME` | `starter` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | — | Mot de passe PostgreSQL |
| `DB_NAME` | `starter_db` | Nom de la base |
| `DB_PORT` | `5432` | Port PostgreSQL |

### JWT

| Variable | Défaut | Description |
|----------|--------|-------------|
| `JWT_SECRET` | — | Secret de l'access token (**≥ 32 caractères**) |
| `JWT_EXPIRATION` | `15m` | Durée de vie de l'access token |
| `JWT_REFRESH_SECRET` | — | Secret du refresh token |
| `JWT_REFRESH_EXPIRATION` | `7d` | Durée de vie du refresh token |
| `JWT_RESET_SECRET` | — | Secret du token de reset de mot de passe |
| `JWT_RESET_EXPIRATION` | `15m` | Durée de vie du token de reset |
| `JWT_VERIFICATION_SECRET` | — | Secret du token de vérification email |
| `JWT_VERIFICATION_EXPIRATION` | `7d` | Durée de vie du token de vérification |

### Redis

| Variable | Défaut | Description |
|----------|--------|-------------|
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `REDIS_PASSWORD` | — | Mot de passe Redis (optionnel) |

### Email SMTP

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SMTP_HOST` | — | Hôte SMTP (**canal désactivé si absent**) |
| `SMTP_PORT` | `1025` | Port SMTP (1025 = Mailhog, 587 = prod) |
| `SMTP_SECURE` | `false` | TLS (`true` pour port 465) |
| `SMTP_USER` | — | Identifiant SMTP |
| `SMTP_PASSWORD` | — | Mot de passe SMTP |
| `SMTP_FROM` | `noreply@starter.local` | Adresse expéditeur |

### Web-Push

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VAPID_PUBLIC_KEY` | — | Clé publique VAPID (**canal désactivé si absent**) |
| `VAPID_PRIVATE_KEY` | — | Clé privée VAPID |
| `VAPID_SUBJECT` | `mailto:admin@starter.local` | Contact VAPID |

### WebSocket & i18n

| Variable | Défaut | Description |
|----------|--------|-------------|
| `WS_ENABLED` | `true` | Activer le canal WebSocket |
| `DEFAULT_LANGUAGE` | `fr` | Langue par défaut des notifications |
| `FALLBACK_LANGUAGE` | `en` | Langue de secours (si clé manquante) |

### Rate Limiting

| Variable | Défaut | Description |
|----------|--------|-------------|
| `THROTTLE_DEFAULT_TTL` | `60` | Fenêtre du throttler général (secondes) |
| `THROTTLE_DEFAULT_LIMIT` | `30` | Requêtes max par fenêtre (toutes les routes) |
| `THROTTLE_STRICT_TTL` | `60` | Fenêtre du throttler strict (secondes) |
| `THROTTLE_STRICT_LIMIT` | `5` | Requêtes max par fenêtre (login, register, forgot-password) |

### Health Monitor

| Variable | Défaut | Description |
|----------|--------|-------------|
| `HEALTH_MONITOR_NOTIFICATIONS_ENABLED` | `true` | Envoyer des alertes SUPER_ADMIN en cas de dégradation/rétablissement. Mettre à `false` en staging/dev pour désactiver les notifications (les checks continuent de tourner). |

### Matomo Analytics _(optionnel)_

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MATOMO_URL` | `http://localhost:8080` | URL Matomo |
| `MATOMO_SITE_ID` | `1` | ID du site |
| `MATOMO_TOKEN` | — | Token API Matomo |

---

## C. Conventions de nommage

### Fichiers (kebab-case)

| Type | Convention | Exemple |
|------|-----------|---------|
| Entité | `xxx.entity.ts` | `user.entity.ts` |
| Value Object | `xxx.vo.ts` | `email.vo.ts` |
| Événement | `xxx.event.ts` | `user-created.event.ts` |
| Command | `xxx.command.ts` | `register.command.ts` |
| Command handler | `xxx.service.ts` | `register.service.ts` |
| Query | `xxx.query.ts` | `get-user.query.ts` |
| Query handler | `xxx.handler.ts` | `get-user.handler.ts` |
| Event handler | `on-xxx.handler.ts` | `on-user-created.handler.ts` |
| DTO | `xxx.dto.ts` | `register.dto.ts` |
| Repository (interface) | `xxx.repository.interface.ts` | `user.repository.interface.ts` |
| Repository (impl) | `prisma-xxx.repository.ts` | `prisma-user.repository.ts` |
| Controller | `xxx.http-controller.ts` | `auth.http-controller.ts` |
| Module | `xxx.module.ts` | `auth.module.ts` |

### Classes (PascalCase)

| Type | Suffixe | Exemple |
|------|---------|---------|
| Entité | (aucun) | `User` |
| Value Object | (aucun) | `Email`, `HashedPassword` |
| Command | `Command` | `RegisterCommand` |
| Command handler | `Service` | `RegisterService` |
| Query | `Query` | `GetUserQuery` |
| Query handler | `Handler` | `GetUserHandler` |
| Event handler | `Handler` | `OnUserCreatedHandler` |
| Repository | `Repository` | `PrismaUserRepository` |
| Controller | `HttpController` | `AuthHttpController` |
| Exception | `Exception` | `UserNotFoundException` |

### Tokens d'injection (Symbol)

Les repositories et ports sont injectés via des Symbols :

```typescript
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
export const CHANNEL_SENDERS = Symbol('CHANNEL_SENDERS');
export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');
```

### DTOs

Les DTOs utilisent `@Exclude()` + `@Expose()` de `class-transformer` et exposent une factory statique :

```typescript
@Exclude()
export class UserProfileDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  static fromDomain(user: User): UserProfileDto {
    return plainToInstance(UserProfileDto, user, { excludeExtraneousValues: true });
  }
}
```

---

## D. Glossaire

| Terme | Définition |
|-------|------------|
| **CQRS** | Command Query Responsibility Segregation — séparation des opérations d'écriture (commands) et de lecture (queries) |
| **DDD** | Domain-Driven Design — approche de conception centrée sur le domaine métier |
| **Hexagonal Architecture** | Architecture "Ports & Adapters" où le cœur métier est indépendant de l'infrastructure |
| **Command** | Intention de modifier l'état du système (ex: `RegisterCommand`) |
| **Query** | Demande de lecture de l'état du système (ex: `GetUserQuery`) |
| **Event** | Fait passé qui s'est produit dans le domaine (ex: `UserCreatedEvent`) |
| **Value Object** | Objet immuable défini par sa valeur, sans identité (ex: `Email`) |
| **Entity** | Objet avec une identité unique et un état mutable (ex: `User`) |
| **Repository** | Interface d'accès aux données (abstrait la persistance) |
| **DTO** | Data Transfer Object — objet de transfert pour les entrées/sorties de l'API |
| **Guard** | Mécanisme NestJS qui détermine si une requête peut être traitée |
| **Access Token** | JWT de courte durée pour authentifier les requêtes API |
| **Refresh Token** | Token de longue durée pour obtenir un nouvel access token |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **CASL** | Bibliothèque de permissions isomorphe (client + serveur) |
| **BullMQ** | Bibliothèque de file d'attente basée sur Redis |
| **VAPID** | Voluntary Application Server Identification — clés pour le Web-Push |
| **SOPS** | Secrets OPerationS — outil de chiffrement de fichiers de secrets |
| **age** | Outil de chiffrement simple utilisé avec SOPS |
| **Prisma** | ORM TypeScript avec génération de types automatique |
