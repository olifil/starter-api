# Stage de base
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl bash

# Stage des dépendances
FROM base AS deps
# Installer les outils de build pour les dépendances natives (bcrypt, etc.)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

# Stage de développement
FROM base AS development
WORKDIR /app

# Copier les dépendances
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Exposer le port
EXPOSE 3000

# Générer Prisma Client au démarrage et lancer l'app
CMD ["bash", "-c", "npx prisma generate && npm run start:dev"]

# Stage de build
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Définir une DATABASE_URL factice pour le build
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Générer Prisma Client
RUN npx prisma generate

# Build de l'application
RUN npm run build

# Stage de production
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Installer les outils de build pour les dépendances natives
RUN apk add --no-cache python3 make g++

# Copier uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copier le build
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/main"]