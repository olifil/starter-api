# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] - 2026-02-12

### Added

- **NestJS 11 avec TypeScript strict** :
  - Architecture hexagonale avec CQRS
  - Path aliases (`@modules/*`, `@shared/*`, `@config/*`, `@database/*`)
  - ESLint + Prettier

- **Authentification JWT** :
  - Register / Login / Logout
  - Access token + Refresh token
  - Guards et stratégies Passport

- **Gestion des utilisateurs** :
  - CRUD complet (profil, admin)
  - Value Objects (Email, HashedPassword)
  - Entité User avec validation

- **RBAC avec CASL** :
  - 4 rôles (SUPER_ADMIN, ADMIN, AUTHENTICATED_USER, ANONYMOUS_USER)
  - Decorators `@CheckAbilities()`, `@Roles()`, `@Public()`
  - Guard global AbilitiesGuard

- **Base de données** :
  - PostgreSQL 15 avec Prisma 7
  - Adaptateur `@prisma/adapter-pg`
  - Script de seed avec utilisateurs de test

- **Observabilite** :
  - Logging structure avec Pino
  - Health checks (`/health`, `/health/live`, `/health/ready`, `/health/db`)
  - Request ID tracking
  - Graceful shutdown (SIGTERM/SIGINT)

- **Analytics optionnel** :
  - Integration Matomo configurable
  - Tracking evenements, inscription, connexion
  - Desactivation automatique si non configure

- **Infrastructure Docker** :
  - Dockerfile multi-stage
  - Docker Compose (API + PostgreSQL + Matomo optionnel)
  - Makefile avec commandes de developpement

- **Secrets** :
  - Chiffrement SOPS + age
  - Scripts automatises (encrypt/decrypt/edit/generate)

- **Configuration centralisee** :
  - Namespaces (app, database, jwt, matomo)
  - Validation des variables d'environnement
  - Swagger/OpenAPI

- **Tests** :
  - Tests unitaires (Jest)
  - Tests d'integration
  - Configuration separee unitaire/integration

- **Documentation** :
  - Architecture hexagonale et CQRS
  - Guide RBAC (reference, diagrammes, quick-start)
  - Observabilite, secrets, workflow Git, migration Prisma 7

---

## Type de changements

- `Added` - Nouvelles fonctionnalites
- `Changed` - Modifications de fonctionnalites existantes
- `Deprecated` - Fonctionnalites bientot supprimees
- `Removed` - Fonctionnalites supprimees
- `Fixed` - Corrections de bugs
- `Security` - Correctifs de securite
