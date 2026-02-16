.PHONY: help start stop restart build rebuild logs logs-api logs-db logs-matomo migrate migrate-create prisma-generate prisma-studio seed db-reset test test-watch test-cov test-e2e lint format install clean clean-all shell shell-db status secrets-setup secrets-encrypt secrets-decrypt secrets-edit secrets-generate

# Variables
COMPOSE = docker compose
COMPOSE_DEV = $(COMPOSE) -f docker-compose.yaml

# Couleurs pour l'affichage
GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
NC     = \033[0m # No Color

##@ Aide
help: ## Afficher l'aide
	@echo "$(GREEN)Starter API - Commandes disponibles$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m\033[0m"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Secrets (SOPS)
secrets-setup: ## Configuration initiale SOPS
	@echo "$(YELLOW)🔑 Configuration de SOPS...$(NC)"
	@if [ ! -f ~/.config/sops/age/keys.txt ]; then \
		mkdir -p ~/.config/sops/age; \
		age-keygen -o ~/.config/sops/age/keys.txt; \
		echo "$(GREEN)✅ Clé générée !$(NC)"; \
		echo "$(YELLOW)📋 Clé publique :$(NC)"; \
		grep "public key:" ~/.config/sops/age/keys.txt; \
	else \
		echo "$(GREEN)✅ Clé déjà configurée$(NC)"; \
	fi

secrets-encrypt: ## Chiffrer .env → .env.enc
	@./scripts/encrypt-env.sh .env

secrets-decrypt: ## Déchiffrer .env.enc → .env
	@./scripts/decrypt-env.sh .env.enc

secrets-edit: ## Éditer les secrets chiffrés
	@sops .env.enc

secrets-generate: ## Générer des secrets JWT
	@echo "JWT_SECRET=$$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
	@echo "JWT_REFRESH_SECRET=$$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

##@ Développement
start: ## Démarrer tous les services (API + BDD)
	@echo "$(GREEN)🚀 Démarrage de l'application...$(NC)"
	@$(COMPOSE_DEV) up -d
	@echo "$(GREEN)✅ Application démarrée$(NC)"
	@echo "$(YELLOW)📚 Swagger: http://localhost:3000$(NC)"
	@echo "$(YELLOW)🔗 API: http://localhost:3000/api/v1$(NC)"

stop: ## Arrêter tous les services
	@echo "$(YELLOW)🛑 Arrêt de l'application...$(NC)"
	@$(COMPOSE_DEV) down
	@echo "$(GREEN)✅ Application arrêtée$(NC)"

restart: stop start ## Redémarrer tous les services

build: ## Rebuilder les images Docker
	@echo "$(YELLOW)🔨 Build des images Docker...$(NC)"
	@$(COMPOSE_DEV) build
	@echo "$(GREEN)✅ Images buildées$(NC)"

rebuild: ## Rebuilder et redémarrer
	@$(MAKE) build
	@$(MAKE) start

##@ Logs
logs: ## Voir les logs de tous les services
	@$(COMPOSE_DEV) logs -f

logs-api: ## Voir les logs de l'API
	@$(COMPOSE_DEV) logs -f api

logs-db: ## Voir les logs de PostgreSQL
	@$(COMPOSE_DEV) logs -f postgres

logs-matomo: ## Voir les logs de Matomo
	@$(COMPOSE_DEV) logs -f matomo

##@ Base de données
migrate: ## Exécuter les migrations Prisma
	@echo "$(YELLOW)🔄 Exécution des migrations...$(NC)"
	@$(COMPOSE_DEV) exec api npm run prisma:migrate
	@echo "$(GREEN)✅ Migrations appliquées$(NC)"

migrate-create: ## Créer une nouvelle migration
	@read -p "Nom de la migration: " name; \
	$(COMPOSE_DEV) exec api npm run prisma:migrate -- --name $name

prisma-generate: ## Générer le Prisma Client
	@$(COMPOSE_DEV) exec api npm run prisma:generate

prisma-studio: ## Ouvrir Prisma Studio
	@echo "$(YELLOW)📊 Ouverture de Prisma Studio...$(NC)"
	@$(COMPOSE_DEV) exec api npm run prisma:studio

seed: ## Peupler la base de données
	@echo "$(YELLOW)🌱 Seeding de la base...$(NC)"
	@$(COMPOSE_DEV) exec api npm run prisma:seed
	@echo "$(GREEN)✅ Seeding terminé$(NC)"

db-reset: ## Réinitialiser complètement la base
	@echo "$(RED)⚠️  ATTENTION: Ceci va supprimer toutes les données !$(NC)"
	@read -p "Êtes-vous sûr ? (y/N): " confirm; \
	if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then \
		$(COMPOSE_DEV) down -v; \
		$(COMPOSE_DEV) up -d postgres; \
		sleep 5; \
		$(COMPOSE_DEV) up -d api; \
		sleep 5; \
		$(MAKE) migrate; \
		$(MAKE) seed; \
		echo "$(GREEN)✅ Base réinitialisée$(NC)"; \
	else \
		echo "$(YELLOW)❌ Opération annulée$(NC)"; \
	fi

##@ Tests
test: ## Lancer les tests unitaires
	@$(COMPOSE_DEV) exec api npm test

test-watch: ## Lancer les tests en mode watch
	@$(COMPOSE_DEV) exec api npm run test:watch

test-cov: ## Lancer les tests avec coverage
	@$(COMPOSE_DEV) exec api npm run test:cov

test-integration: ## Lancer les tests d'intégration
	@echo "$(YELLOW)🧪 Lancement des tests d'intégration...$(NC)"
	@$(COMPOSE_DEV) exec api npm run test:integration
	@echo "$(GREEN)✅ Tests d'intégration terminés$(NC)"

test-integration-setup: ## Démarrer la base de données de test
	@echo "$(YELLOW)🗄️  Démarrage de la base de données de test...$(NC)"
	@$(COMPOSE_DEV) up -d postgres-test
	@sleep 3
	@echo "$(GREEN)✅ Base de données de test démarrée$(NC)"

test-integration-teardown: ## Arrêter la base de données de test
	@echo "$(YELLOW)🛑 Arrêt de la base de données de test...$(NC)"
	@$(COMPOSE_DEV) stop postgres-test
	@echo "$(GREEN)✅ Base de données de test arrêtée$(NC)"

test-integration-reset: ## Réinitialiser la base de données de test
	@echo "$(RED)🔄 Réinitialisation de la base de test...$(NC)"
	@$(COMPOSE_DEV) down postgres-test -v
	@$(COMPOSE_DEV) up -d postgres-test
	@sleep 3
	@echo "$(GREEN)✅ Base de données de test réinitialisée$(NC)"

##@ Qualité du code
lint: ## Linter le code
	@$(COMPOSE_DEV) exec api npm run lint

format: ## Formater le code
	@$(COMPOSE_DEV) exec api npm run format

##@ Installation
install: ## Installer les dépendances
	@echo "$(YELLOW)📦 Installation des dépendances...$(NC)"
	@$(COMPOSE_DEV) exec api npm install
	@echo "$(GREEN)✅ Dépendances installées$(NC)"

##@ Nettoyage
clean: ## Nettoyer les containers et volumes
	@echo "$(RED)🧹 Nettoyage complet...$(NC)"
	@$(COMPOSE_DEV) down -v --remove-orphans
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

clean-all: clean ## Nettoyer tout (containers, volumes, images)
	@echo "$(RED)🧹 Nettoyage complet avec images...$(NC)"
	@$(COMPOSE_DEV) down -v --rmi all --remove-orphans
	@echo "$(GREEN)✅ Nettoyage complet terminé$(NC)"

##@ Autres
shell: ## Ouvrir un shell dans le container API
	@$(COMPOSE_DEV) exec api sh

shell-db: ## Ouvrir un shell PostgreSQL
	@$(COMPOSE_DEV) exec postgres psql -U starter -d starter_db

status: ## Voir le statut des services
	@$(COMPOSE_DEV) ps
