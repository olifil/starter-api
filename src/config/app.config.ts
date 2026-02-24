import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  enableCors: process.env.ENABLE_CORS === 'true',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  frontendUrl: process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000',
  siteName: process.env.SITE_NAME || 'Mon Application',
  emailVerificationPath: process.env.EMAIL_VERIFICATION_PATH || '/verify-email',
  contactEmail: process.env.CONTACT_EMAIL || undefined,
}));
