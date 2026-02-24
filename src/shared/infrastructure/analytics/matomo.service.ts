import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MatomoTracker from 'matomo-tracker';

export interface TrackEventParams {
  category: string;
  action: string;
  name?: string;
  value?: number;
  userId?: string;
}

@Injectable()
export class MatomoService {
  private readonly logger = new Logger(MatomoService.name);
  private tracker: MatomoTracker | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const matomoUrl = this.configService.get<string>('matomo.url');
    const siteId = this.configService.get<number>('matomo.siteId');

    this.enabled = !!(matomoUrl && siteId);

    if (this.enabled && matomoUrl && siteId) {
      this.tracker = new MatomoTracker(siteId, `${matomoUrl}/matomo.php`);
      this.logger.log('✅ Matomo analytics activé');
    } else {
      this.logger.warn('⚠️  Matomo désactivé (MATOMO_URL ou MATOMO_SITE_ID manquant)');
    }
  }

  async trackEvent(params: TrackEventParams): Promise<void> {
    if (!this.enabled || !this.tracker) return;

    try {
      await this.tracker.track({
        url: `http://api/event/${params.category}/${params.action}`,
        action_name: `${params.category} - ${params.action}`,
        e_c: params.category,
        e_a: params.action,
        e_n: params.name,
        e_v: params.value,
        uid: params.userId,
      });
    } catch (error) {
      this.logger.error('Erreur tracking Matomo:', error);
    }
  }

  async trackUserRegistration(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'User',
      action: 'Register',
      userId,
    });
  }

  async trackUserLogin(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'User',
      action: 'Login',
      userId,
    });
  }

  async trackUserLogout(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'Logout',
      userId,
    });
  }

  async trackLoginFailed(): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'LoginFailed',
    });
  }

  async trackEmailVerified(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'EmailVerified',
      userId,
    });
  }

  async trackPasswordResetRequested(): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'PasswordResetRequested',
    });
  }

  async trackPasswordResetCompleted(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'PasswordResetCompleted',
      userId,
    });
  }

  async trackTokenRefresh(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Auth',
      action: 'TokenRefresh',
      userId,
    });
  }

  async trackUserProfileUpdated(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'User',
      action: 'ProfileUpdated',
      userId,
    });
  }

  async trackUserDeleted(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'User',
      action: 'Deleted',
      userId,
    });
  }

  async trackNotificationSent(userId: string, channel: string): Promise<void> {
    await this.trackEvent({
      category: 'Notification',
      action: 'Sent',
      name: channel,
      userId,
    });
  }

  async trackNotificationFailed(userId: string, channel: string): Promise<void> {
    await this.trackEvent({
      category: 'Notification',
      action: 'Failed',
      name: channel,
      userId,
    });
  }

  async trackNotificationPreferencesUpdated(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Notification',
      action: 'PreferencesUpdated',
      userId,
    });
  }

  async trackNotificationMarkedAsRead(userId: string): Promise<void> {
    await this.trackEvent({
      category: 'Notification',
      action: 'MarkedAsRead',
      userId,
    });
  }
}
