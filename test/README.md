# Tests

Ce projet utilise Jest pour les tests unitaires et d'intégration.

## Structure des tests

```
test/
├── unit/                           # Tests unitaires (76 suites, 577 tests)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── core/application/
│   │   │   │   ├── commands/       # register, verify-email, forgot-password,
│   │   │   │   │                   #   reset-password, refresh-token
│   │   │   │   ├── queries/        # login
│   │   │   │   └── dtos/           # forgot-password, reset-password,
│   │   │   │                       #   verify-email, refresh-token
│   │   │   ├── infrastructure/
│   │   │   │   └── persistence/    # PrismaRefreshTokenRepository
│   │   │   └── interface/
│   │   │       ├── guards/         # JwtAuthGuard, JwtStrategy
│   │   │       └── http-controller # AuthHttpController
│   │   ├── user/
│   │   │   ├── core/
│   │   │   │   ├── domain/         # User entity, Email VO, HashedPassword VO
│   │   │   │   ├── application/    # commands, queries, dtos
│   │   │   │   └── dtos/           # update-user
│   │   │   └── interface/          # UserHttpController, MeHttpController
│   │   └── notification/
│   │       ├── core/
│   │       │   ├── domain/         # Notification, NotificationPreference,
│   │       │   │                   #   PushSubscription entities
│   │       │   ├── application/
│   │       │   │   ├── commands/   # send-notification, mark-as-read,
│   │       │   │   │              #   send-contact-email, update-preferences
│   │       │   │   ├── queries/    # get-notifications, get-preferences
│   │       │   │   ├── events/     # on-account-verified, on-password-reset-requested
│   │       │   │   └── dtos/       # send-notification, contact, update-preferences,
│   │       │   │                   #   register-push-subscription, delete-push-subscription
│   │       │   └── value-objects/  # NotificationType
│   │       ├── infrastructure/
│   │       │   ├── persistence/    # PrismaNotificationRepository,
│   │       │   │                   #   PrismaNotificationPreferenceRepository,
│   │       │   │                   #   PrismaPushSubscriptionRepository
│   │       │   └── templates/      # HandlebarsRendererAdapter
│   │       └── interface/          # NotificationHttpController,
│   │                               #   NotificationPreferenceHttpController,
│   │                               #   ContactHttpController
│   └── shared/
│       ├── authorization/          # Public, Roles, CheckAbilities decorators
│       ├── decorators/             # CurrentUser decorator
│       ├── infrastructure/         # HealthMonitorService, RequestIdMiddleware
│       └── utils/                  # parse-duration
├── integration/                    # Tests d'intégration (9 suites)
│   ├── auth/                       # register, login, refresh, password-reset, verify-email
│   ├── user/                       # profile, pagination
│   ├── notification/               # notifications, preferences
│   ├── authorization/              # RBAC
│   └── setup.ts                    # Setup global
├── env-setup.ts                    # Chargement de .env.test
└── jest-integration.json           # Configuration Jest pour les tests d'intégration
```

## Exécuter les tests

### Tests unitaires

```bash
# Exécuter tous les tests unitaires
npm test

# Mode watch (réexécute les tests à chaque modification)
npm run test:watch

# Avec couverture de code
npm run test:cov
```

### Tests d'intégration

```bash
# Démarrer les services de test (BDD + Redis)
docker compose up -d postgres-test redis

# Pousser le schéma Prisma sur la BDD de test
DATABASE_URL="postgresql://starter_test:starter_test123@localhost:5433/starter_test_db?schema=public" npx prisma db push

# Exécuter tous les tests d'intégration
npm run test:integration
```

**Note**: Les tests d'intégration utilisent une base de données de test dédiée (`postgres-test` sur le port 5433), configurée via `.env.test`. Le fichier `test/env-setup.ts` charge automatiquement ces variables d'environnement.

## Couverture actuelle

### Tests unitaires (76 suites, 577 tests)

- **Auth Module** :
  - DTOs : ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, RefreshTokenDto
  - Commands : RegisterService, VerifyEmailService, ForgotPasswordService, ResetPasswordService, RefreshTokenService
  - Queries : LoginHandler
  - Controllers : AuthHttpController
  - Guards : JwtAuthGuard, JwtStrategy
  - Repositories : PrismaRefreshTokenRepository

- **User Module** :
  - Value Objects : Email, HashedPassword
  - Entities : User
  - DTOs : CreateUserDto, UpdateUserDto, UserResponseDto, etc.
  - Commands : CreateUser, UpdateUser, DeleteUser
  - Queries : GetUser, GetUsers, GetUserByEmail
  - Controllers : UserHttpController, MeHttpController
  - Repositories : PrismaUserRepository

- **Notification Module** :
  - Entities : Notification, NotificationPreference, PushSubscription
  - Value Objects : NotificationType
  - Commands : SendNotificationService, MarkAsReadService, SendContactEmailService, UpdatePreferencesService
  - Queries : GetNotificationsHandler, GetPreferencesHandler
  - Events : OnAccountVerifiedHandler, OnPasswordResetRequestedHandler
  - DTOs : SendNotificationDto, ContactDto, UpdatePreferencesDto, RegisterPushSubscriptionDto, DeletePushSubscriptionDto
  - Repositories : PrismaNotificationRepository, PrismaNotificationPreferenceRepository, PrismaPushSubscriptionRepository
  - Infrastructure : HandlebarsRendererAdapter
  - Controllers : NotificationHttpController, NotificationPreferenceHttpController, ContactHttpController

- **Shared** :
  - Decorators : Public, Roles, CheckAbilities, CurrentUser
  - Infrastructure : HealthMonitorService, RequestIdMiddleware
  - Utils : parse-duration

### Tests d'intégration (9 suites)
- **Auth**:
  - POST /auth/register (inscription)
  - POST /auth/login (connexion)
  - Authentification JWT

- **Auth Refresh Token**:
  - POST /auth/refresh (rotation de tokens)
  - Révocation de l'ancien refresh token
  - Refresh chaîné

- **Auth Password Reset**:
  - POST /auth/forgot-password (demande de réinitialisation)
  - POST /auth/reset-password (réinitialisation avec token)
  - Login avec nouveau mot de passe

- **Auth Verify Email**:
  - POST /auth/verify-email (vérification d'adresse email)
  - Token expiré / invalide

- **User Profile**:
  - GET /users/me (profil actuel)
  - PUT /users/me (mise à jour profil)
  - GET /users/:id (récupérer un utilisateur)
  - DELETE /users/:id (supprimer un utilisateur)

- **User Pagination**:
  - GET /users (liste paginée)
  - Tri et filtrage

- **RBAC Authorization**:
  - Routes publiques vs protégées
  - Permissions par rôle (USER, ADMIN, SUPER_ADMIN)
  - Tokens invalides / expirés

- **Notification**:
  - POST /notifications/send (envoi admin uniquement)
  - GET /notifications (liste paginée)
  - GET /notifications/unread-count (compteur non lues)
  - PATCH /notifications/:id/read (marquer comme lue)

- **Notification Preferences**:
  - GET /notifications/preferences (récupérer ses préférences)
  - PUT /notifications/preferences (mettre à jour ses préférences)

## Bonnes pratiques

### Tests unitaires
- Utiliser des mocks pour les dépendances externes
- Tester les cas nominaux et les cas d'erreur
- Suivre le pattern AAA (Arrange, Act, Assert)
- Isoler chaque test (pas de dépendances entre tests)

### Tests d'intégration
- Nettoyer la base de données entre chaque test (`beforeEach`)
- Tester les flux complets de l'API
- Vérifier les codes de statut HTTP
- Valider la structure des réponses
- Tester l'authentification et les autorisations

## Configuration

### Configuration des tests unitaires (package.json)
```json
{
  "jest": {
    "testRegex": "test/unit/.*\\.spec\\.ts$",
    "moduleNameMapper": {
      "^@modules/(.*)$": "<rootDir>/src/modules/$1",
      "^@shared/(.*)$": "<rootDir>/src/shared/$1"
    }
  }
}
```

### Configuration des tests d'intégration (test/jest-integration.json)
```json
{
  "testRegex": ".integration-spec.ts$",
  "maxWorkers": 1,
  "testTimeout": 30000,
  "forceExit": true
}
```

## Résolution de problèmes

### Les tests d'intégration ne se terminent pas
- Vérifier que `prisma.$disconnect()` est appelé dans `afterAll()`
- Vérifier que `app.close()` est appelé dans `afterAll()`
- La configuration `forceExit: true` force la fermeture après les tests

### Erreurs de connexion à la base de données
- Vérifier que la base de données de test est accessible
- Vérifier la variable d'environnement `DATABASE_URL`
- S'assurer que les migrations Prisma sont à jour

### Tests qui échouent de manière aléatoire
- Vérifier que `beforeEach()` nettoie correctement les données
- S'assurer qu'il n'y a pas de dépendances entre les tests
- Pour les tests d'intégration, utiliser `maxWorkers: 1` pour éviter les conflits
