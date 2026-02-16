import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Configuration pour Prisma 7
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // Nettoyer la base de données
  console.log('🧹 Cleaning database...');
  await prisma.pushSubscription.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Créer des utilisateurs de test
  console.log('👤 Creating test users...');
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@starter.local',
      passwordHash: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Admin',
      lastName: 'User',
      bio: 'Administrateur de la plateforme',
      role: 'SUPER_ADMIN',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@starter.local',
      passwordHash: hashedPassword,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Test',
      lastName: 'User',
      bio: 'Utilisateur de test',
    },
  });

  // Créer les préférences de notification par défaut (tous canaux activés)
  console.log('🔔 Creating default notification preferences...');
  const channels = ['EMAIL', 'SMS', 'PUSH', 'WEB_PUSH', 'WEBSOCKET'] as const;
  for (const userId of [admin.id, user.id]) {
    for (const channel of channels) {
      await prisma.notificationPreference.create({
        data: {
          userId,
          channel,
          enabled: true,
        },
      });
    }
  }

  console.log('✅ Database seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`- Users: 2`);
  console.log(`- Notification preferences: ${2 * channels.length}`);
  console.log('\n🔐 Test credentials:');
  console.log('Email: admin@starter.local | user@starter.local');
  console.log('Password: Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
