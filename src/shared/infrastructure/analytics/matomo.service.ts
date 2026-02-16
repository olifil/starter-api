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
}
