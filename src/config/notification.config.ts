import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  // Redis (BullMQ)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Email (SMTP / Nodemailer)
  smtp: {
    enabled: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.SMTP_FROM || 'noreply@starter.local',
  },

  // SMS (interface abstraite)
  sms: {
    enabled: !!process.env.SMS_PROVIDER,
    provider: process.env.SMS_PROVIDER || undefined,
    apiKey: process.env.SMS_API_KEY || undefined,
    from: process.env.SMS_FROM || undefined,
  },

  // Push mobile (interface abstraite)
  push: {
    enabled: !!process.env.FCM_PROJECT_ID,
    projectId: process.env.FCM_PROJECT_ID || undefined,
    privateKey: process.env.FCM_PRIVATE_KEY || undefined,
    clientEmail: process.env.FCM_CLIENT_EMAIL || undefined,
  },

  // Web-Push (VAPID)
  webPush: {
    enabled: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
    publicKey: process.env.VAPID_PUBLIC_KEY || undefined,
    privateKey: process.env.VAPID_PRIVATE_KEY || undefined,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@starter.local',
  },

  // WebSocket
  websocket: {
    enabled: process.env.WS_ENABLED === 'true',
  },

  // i18n
  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'fr',
    fallbackLanguage: process.env.FALLBACK_LANGUAGE || 'en',
  },

  // Health monitoring alerts (désactiver avec HEALTH_MONITOR_NOTIFICATIONS_ENABLED=false)
  healthMonitor: {
    notificationsEnabled: process.env.HEALTH_MONITOR_NOTIFICATIONS_ENABLED !== 'false',
  },
}));
