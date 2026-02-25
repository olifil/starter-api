import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Récupère le request ID des headers ou génère un nouveau
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Ajoute le request ID à la requête
    req.id = requestId;
    req.headers['x-request-id'] = requestId;

    // Ajoute le request ID aux headers de réponse
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}

// Extension du type Request pour TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
