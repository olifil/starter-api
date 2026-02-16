import { registerAs } from '@nestjs/config';

export default registerAs('matomo', () => ({
  url: process.env.MATOMO_URL,
  port: process.env.MATOMO_PORT ? parseInt(process.env.MATOMO_PORT, 10) : undefined,
  siteId: process.env.MATOMO_SITE_ID ? parseInt(process.env.MATOMO_SITE_ID, 10) : undefined,
  token: process.env.MATOMO_TOKEN,
}));
