import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';

// Domain - Repository tokens
import { NOTIFICATION_REPOSITORY } from './core/domain/repositories/notification.repository.interface';
import { NOTIFICATION_PREFERENCE_REPOSITORY } from './core/domain/repositories/notification-preference.repository.interface';
import { PUSH_SUBSCRIPTION_REPOSITORY } from './core/domain/repositories/push-subscription.repository.interface';
import { CHANNEL_SENDERS, ChannelSenderPort } from './core/domain/ports/channel-sender.port';
import { TEMPLATE_RENDERER } from './core/application/services/template-renderer.service';

// Application - Command Services
import { SendNotificationService } from './core/application/commands/send-notification/send-notification.service';
import { UpdatePreferencesService } from './core/application/commands/update-preferences/update-preferences.service';
import { MarkAsReadService } from './core/application/commands/mark-as-read/mark-as-read.service';
import { SendContactEmailService } from './core/application/commands/send-contact-email/send-contact-email.service';
import { RegisterPushSubscriptionService } from './core/application/commands/register-push-subscription/register-push-subscription.service';
import { DeletePushSubscriptionService } from './core/application/commands/delete-push-subscription/delete-push-subscription.service';

// Application - Query Handlers
import { GetNotificationsHandler } from './core/application/queries/get-notifications/get-notifications.handler';
import { GetPreferencesHandler } from './core/application/queries/get-preferences/get-preferences.handler';

// Application - Event Handlers
import { OnUserCreatedHandler } from './core/application/events/on-user-created/on-user-created.handler';
import { OnPasswordResetRequestedHandler } from './core/application/events/on-password-reset-requested/on-password-reset-requested.handler';
import { OnAccountVerifiedHandler } from './core/application/events/on-account-verified/on-account-verified.handler';
import { OnUserDeletedHandler } from './core/application/events/on-user-deleted/on-user-deleted.handler';

// Infrastructure - Repositories
import { PrismaNotificationRepository } from './infrastructure/persistence/repositories/prisma-notification.repository';
import { PrismaNotificationPreferenceRepository } from './infrastructure/persistence/repositories/prisma-notification-preference.repository';
import { PrismaPushSubscriptionRepository } from './infrastructure/persistence/repositories/prisma-push-subscription.repository';

// Infrastructure - Channel Senders
import { NodemailerEmailSender } from './infrastructure/channels/email/nodemailer-email.sender';
import { NoopSmsSender } from './infrastructure/channels/sms/noop-sms.sender';
import { NoopPushSender } from './infrastructure/channels/push/noop-push.sender';
import { WebPushSender } from './infrastructure/channels/web-push/web-push.sender';
import { WebSocketSender } from './infrastructure/channels/websocket/websocket.sender';

// Infrastructure - Queue
import { NotificationProducer } from './infrastructure/queue/notification.producer';
import { NotificationConsumer } from './infrastructure/queue/notification.consumer';

// Infrastructure - Templates
import { HandlebarsRendererAdapter } from './infrastructure/templates/handlebars-renderer.adapter';
import { TemplateStartupValidator } from './infrastructure/templates/startup-validator';

// Interface - Controllers
import { NotificationHttpController } from './interface/http-controller/notification.http-controller';
import { NotificationPreferenceHttpController } from './interface/http-controller/notification-preference.http-controller';
import { ContactHttpController } from './interface/http-controller/contact.http-controller';
import { PushSubscriptionHttpController } from './interface/http-controller/push-subscription.http-controller';
import { NotificationGateway } from './interface/websocket/notification.gateway';

// User Module (pour accéder au USER_REPOSITORY)
import { UserModule } from '@modules/user/user.module';

const CommandServices = [
  SendNotificationService,
  UpdatePreferencesService,
  MarkAsReadService,
  SendContactEmailService,
  RegisterPushSubscriptionService,
  DeletePushSubscriptionService,
];

const QueryHandlers = [GetNotificationsHandler, GetPreferencesHandler];

const EventHandlers = [
  OnUserCreatedHandler,
  OnPasswordResetRequestedHandler,
  OnAccountVerifiedHandler,
  OnUserDeletedHandler,
];

const ChannelSenders = [
  NodemailerEmailSender,
  NoopSmsSender,
  NoopPushSender,
  WebPushSender,
  WebSocketSender,
];

const HttpControllers = [
  NotificationHttpController,
  NotificationPreferenceHttpController,
  ContactHttpController,
  PushSubscriptionHttpController,
];

@Module({
  imports: [CqrsModule, BullModule.registerQueue({ name: 'notifications' }), JwtModule, UserModule],
  controllers: [...HttpControllers],
  providers: [
    // Repositories
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: NOTIFICATION_PREFERENCE_REPOSITORY,
      useClass: PrismaNotificationPreferenceRepository,
    },
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaPushSubscriptionRepository,
    },

    // Channel Senders (injected as array)
    ...ChannelSenders,
    {
      provide: CHANNEL_SENDERS,
      useFactory: (...senders: ChannelSenderPort[]): ChannelSenderPort[] => senders,
      inject: ChannelSenders,
    },

    // Template Renderer
    {
      provide: TEMPLATE_RENDERER,
      useClass: HandlebarsRendererAdapter,
    },

    // Queue
    NotificationProducer,
    NotificationConsumer,

    // Template validation
    TemplateStartupValidator,

    // WebSocket Gateway
    NotificationGateway,

    // CQRS
    ...CommandServices,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [NOTIFICATION_REPOSITORY, NotificationProducer],
})
export class NotificationModule {}
