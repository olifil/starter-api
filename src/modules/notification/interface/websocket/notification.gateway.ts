import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.['token'] as string) ||
        (client.handshake.query?.['token'] as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('jwt.secret');
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret,
      });
      const userId = payload.sub;

      // Stocker le mapping userId -> socket
      (client.data as Record<string, string>)['userId'] = userId;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Joindre une room par userId pour simplifier les envois
      await client.join(`user:${userId}`);

      this.logger.debug(`Client ${client.id} connected (user: ${userId})`);
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as Record<string, string>)['userId'] as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.debug(`Client ${client.id} disconnected (user: ${userId})`);
    }
  }

  sendToUser(userId: string, payload: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
