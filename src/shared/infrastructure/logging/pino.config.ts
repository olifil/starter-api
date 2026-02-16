import { Params } from 'nestjs-pino';
import { IncomingMessage } from 'http';

export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

    // Format des logs selon l'environnement
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
              singleLine: false,
              messageFormat: '{req.method} {req.url} {responseTime}ms - {msg}',
            },
          }
        : undefined,

    // Configuration pour la production (JSON structuré)
    formatters:
      process.env.NODE_ENV === 'production'
        ? {
            level: (label: string) => ({ level: label }),
          }
        : undefined,

    // Customisation des logs de requêtes
    customProps: (req: IncomingMessage) => ({
      requestId: (req as any).headers['x-request-id'] || (req as any).id,
    }),

    // Ne pas logger les routes de health check
    autoLogging: {
      ignore: (req: IncomingMessage) =>
        req.url === '/health' || req.url === '/health/live' || req.url === '/health/ready',
    },

    // Serializers pour formater les objets
    serializers: {
      req: (req: any) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
      err: (err: any) => ({
        type: err.type,
        message: err.message,
        stack: err.stack,
      }),
    },

    // Redact des données sensibles
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
      ],
      censor: '[REDACTED]',
    },
  },
};
