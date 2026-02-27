import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  resetSecret: process.env.JWT_RESET_SECRET,
  resetExpiresIn: process.env.JWT_RESET_EXPIRATION || '15m',
  verificationSecret: process.env.JWT_VERIFICATION_SECRET,
  verificationExpiresIn: process.env.JWT_VERIFICATION_EXPIRATION || '7d',
  emailChangeSecret: process.env.JWT_EMAIL_CHANGE_SECRET,
  emailChangeExpiresIn: process.env.JWT_EMAIL_CHANGE_EXPIRATION || '1h',
}));
