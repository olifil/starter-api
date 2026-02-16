import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  default: {
    ttl: parseInt(process.env.THROTTLE_DEFAULT_TTL || '60', 10) * 1000,
    limit: parseInt(process.env.THROTTLE_DEFAULT_LIMIT || '30', 10),
  },
  strict: {
    ttl: parseInt(process.env.THROTTLE_STRICT_TTL || '60', 10) * 1000,
    limit: parseInt(process.env.THROTTLE_STRICT_LIMIT || '5', 10),
  },
}));
