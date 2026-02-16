# Starter API

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)

Base de démarrage pour API REST production-ready construite avec NestJS et architecture hexagonale. Embarque dès le départ : authentification JWT, RBAC (CASL), notifications multi-canaux, logging structuré, health checks, gestion des secrets (SOPS) et infrastructure Docker complète.

**→ [Documentation complète (DOC.md)](DOC.md)**

---

## Prérequis

- **Node.js** ≥ 20.19
- **Docker** et **Docker Compose** v2
- **Make**
- **SOPS** + **age** (gestion des secrets)

```bash
# macOS
brew install sops age

# Linux (Debian/Ubuntu)
sudo apt install age
wget https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops && sudo chmod +x /usr/local/bin/sops
```

---

## Installation

```bash
# 1. Cloner le dépôt (HTTPS)
git clone https://codeberg.org/olifil/api_starter.git && cd api_starter
# ou SSH si votre clé a été configurée
git clone ssh://git@codeberg.org/olifil/api_starter.git && cd api_starter

# 2. Configurer les secrets
make secrets-setup      # générer sa clé age
make secrets-decrypt    # déchiffrer .env.enc (si vous avez accès)
# OU
cp .env.dist .env       # puis remplir .env manuellement

# 3. Démarrer l'infrastructure (PostgreSQL, Redis, Mailhog)
make start

# 4. Appliquer les migrations et les données de test
make migrate
make seed
```

**Identifiants de test** (après `make seed`) :

| Rôle                 | Email                 | Mot de passe   |
| -------------------- | --------------------- | -------------- |
| `SUPER_ADMIN`        | `admin@starter.local` | `Password123!` |
| `AUTHENTICATED_USER` | `user@starter.local`  | `Password123!` |

---

## Démarrage

```bash
make start        # démarrer tous les services
make logs-api     # suivre les logs
make stop         # arrêter
```

| Service          | URL                                 |
| ---------------- | ----------------------------------- |
| API REST         | http://localhost:3000/api/v1        |
| Swagger          | http://localhost:3000               |
| Mailhog (emails) | http://localhost:8025               |
| Health check     | http://localhost:3000/api/v1/health |

```bash
make help         # afficher toutes les commandes disponibles
```

---

## License

Copyright (c) 2025 Olivier Fillol. All rights reserved.
