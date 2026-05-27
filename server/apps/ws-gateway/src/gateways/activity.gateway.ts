// apps/ws-gateway/src/gateways/activity.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '@app/infra/redis';

interface SeatUpdate {
  version: number;
  joinCount: number;
  left: number;
  waitlistCount: number;
}

interface ActivityNotification {
  type: 'canceled' | 'updated' | 'reminder';
  activityId: number;
  message: string;
  data?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/activities',
})
export class ActivityWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ActivityWsGateway.name);
  private connectedClients = new Map<string, { userId?: number; tenantId?: number }>();

  constructor(private redis: RedisService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, {});
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; tenantId: number },
  ) {
    this.connectedClients.set(client.id, {
      userId: data.userId,
      tenantId: data.tenantId,
    });
    this.logger.log(`Client ${client.id} authenticated as user ${data.userId}`);
    return { event: 'authenticated', data: { userId: data.userId } };
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: number },
  ) {
    const room = `activity:${data.activityId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);

    const seats = await this.getSeats(data.activityId);
    client.emit('seat_update', seats);

    return { event: 'subscribed', data: { activityId: data.activityId } };
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: number },
  ) {
    const room = `activity:${data.activityId}`;
    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);

    return { event: 'unsubscribed', data: { activityId: data.activityId } };
  }

  async broadcastSeatUpdate(activityId: number) {
    const room = `activity:${activityId}`;
    const seats = await this.getSeats(activityId);
    this.server.to(room).emit('seat_update', seats);
  }

  async broadcastActivityNotification(activityId: number, notification: ActivityNotification) {
    const room = `activity:${activityId}`;
    this.server.to(room).emit('activity_notification', notification);
  }

  async broadcastActivityCanceled(activityId: number, reason: string) {
    await this.broadcastActivityNotification(activityId, {
      type: 'canceled',
      activityId,
      message: reason,
    });
  }

  async broadcastActivityUpdated(activityId: number, changes: any) {
    await this.broadcastActivityNotification(activityId, {
      type: 'updated',
      activityId,
      message: '活动信息已更新',
      data: changes,
    });
  }

  async broadcastActivityReminder(activityId: number, message: string) {
    await this.broadcastActivityNotification(activityId, {
      type: 'reminder',
      activityId,
      message,
    });
  }

  async sendUserNotification(userId: number, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.userId === userId) {
        this.server.to(clientId).emit('user_notification', notification);
      }
    }
  }

  async getConnectedClientsCount(): Promise<number> {
    return this.connectedClients.size;
  }

  async getActivitySubscribersCount(activityId: number): Promise<number> {
    const room = `activity:${activityId}`;
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }

  private async getSeats(activityId: number) {
    const left = await this.redis.get(`activity:${activityId}:left`);
    const version = await this.redis.get(`activity:${activityId}:seats:version`);
    const joinCount = await this.redis.get(`activity:${activityId}:join_count`);
    const waitlistCount = await this.redis.get(`activity:${activityId}:waitlist_count`);

    return {
      version: parseInt(version || '0'),
      joinCount: parseInt(joinCount || '0'),
      left: parseInt(left || '0'),
      waitlistCount: parseInt(waitlistCount || '0'),
    };
  }
}
