import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsUrl,
  Min,
  Max,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  ENABLE_CORS: boolean = false;

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS: string = 'http://localhost:3000';

  // Database
  @IsString()
  DATABASE_URL!: string;

  // JWT
  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsOptional()
  JWT_RESET_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_RESET_EXPIRATION: string = '15m';

  // App URL (for backend links, e.g. password reset)
  @IsString()
  @IsOptional()
  APP_URL: string = 'http://localhost:3000';

  // Frontend URL (for frontend links, e.g. email verification)
  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  // Email verification path (appended to FRONTEND_URL)
  @IsString()
  @IsOptional()
  EMAIL_VERIFICATION_PATH?: string;

  // JWT Verification Token
  @IsString()
  @IsOptional()
  JWT_VERIFICATION_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_VERIFICATION_EXPIRATION: string = '7d';

  // JWT Email Change Token
  @IsString()
  @IsOptional()
  JWT_EMAIL_CHANGE_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EMAIL_CHANGE_EXPIRATION: string = '1h';

  // Matomo Analytics (optional)
  @IsUrl({ require_tld: false })
  @IsOptional()
  MATOMO_URL?: string;

  @IsNumber()
  @IsOptional()
  MATOMO_PORT?: number;

  @IsNumber()
  @IsOptional()
  MATOMO_SITE_ID?: number;

  @IsString()
  @IsOptional()
  MATOMO_TOKEN?: string;

  // Redis (BullMQ)
  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Email SMTP (optional)
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  SMTP_SECURE?: boolean;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  // SMS (optional)
  @IsString()
  @IsOptional()
  SMS_PROVIDER?: string;

  @IsString()
  @IsOptional()
  SMS_API_KEY?: string;

  @IsString()
  @IsOptional()
  SMS_FROM?: string;

  // Push mobile (optional)
  @IsString()
  @IsOptional()
  FCM_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  FCM_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  FCM_CLIENT_EMAIL?: string;

  // Web-Push (optional)
  @IsString()
  @IsOptional()
  VAPID_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  VAPID_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  VAPID_SUBJECT?: string;

  // WebSocket
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  WS_ENABLED?: boolean;

  // Health monitoring
  @Transform(({ value }: { value: unknown }) => value !== 'false' && value !== false)
  @IsBoolean()
  @IsOptional()
  HEALTH_MONITOR_NOTIFICATIONS_ENABLED: boolean = true;

  // Rate limiting
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_DEFAULT_TTL?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_DEFAULT_LIMIT?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_STRICT_TTL?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_STRICT_LIMIT?: number;

  // i18n
  @IsString()
  @IsOptional()
  DEFAULT_LANGUAGE?: string;

  @IsString()
  @IsOptional()
  FALLBACK_LANGUAGE?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation error:\n${errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
