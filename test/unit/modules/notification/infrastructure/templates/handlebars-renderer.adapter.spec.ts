import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { HandlebarsRendererAdapter } from '@modules/notification/infrastructure/templates/handlebars-renderer.adapter';

describe('HandlebarsRendererAdapter', () => {
  let renderer: HandlebarsRendererAdapter;
  let i18nService: jest.Mocked<I18nService>;

  beforeEach(async () => {
    const mockI18nService = {
      t: jest.fn().mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          'notification.welcome.subject': 'Bienvenue',
          'notification.welcome.body': '<p>Bonjour {{firstName}}</p>',
          'notification.welcome.sms': 'Bienvenue {{firstName}}',
          'notification.welcome.push': 'Bienvenue sur {{appName}}',
          'notification.layout.header.title': 'Header Title',
          'notification.layout.footer.rights': 'All rights reserved',
          'notification.layout.footer.disclaimer': 'Disclaimer text',
        };
        return translations[key] ?? key;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HandlebarsRendererAdapter, { provide: I18nService, useValue: mockI18nService }],
    }).compile();

    renderer = module.get<HandlebarsRendererAdapter>(HandlebarsRendererAdapter);
    i18nService = module.get(I18nService);
  });

  it('should be defined', () => {
    expect(renderer).toBeDefined();
  });

  describe('render', () => {
    it('should render subject and body for non-EMAIL channel', () => {
      const result = renderer.render('welcome', 'SMS', 'fr', { firstName: 'John' });

      expect(result.subject).toBe('Bienvenue');
      expect(result.body).toBe('Bienvenue John');
    });

    it('should use "body" key for EMAIL channel', () => {
      const result = renderer.render('welcome', 'EMAIL', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.body',
        expect.objectContaining({ lang: 'fr' }),
      );
      expect(result.body).toContain('Bonjour John');
    });

    it('should use "sms" key for SMS channel', () => {
      renderer.render('welcome', 'SMS', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.sms',
        expect.objectContaining({ lang: 'fr' }),
      );
    });

    it('should use "push" key for PUSH channel', () => {
      renderer.render('welcome', 'PUSH', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.push',
        expect.objectContaining({ lang: 'fr' }),
      );
    });

    it('should use "push" key for WEB_PUSH channel', () => {
      renderer.render('welcome', 'WEB_PUSH', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.push',
        expect.objectContaining({ lang: 'fr' }),
      );
    });

    it('should use "body" key for WEBSOCKET channel', () => {
      renderer.render('welcome', 'WEBSOCKET', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.body',
        expect.objectContaining({ lang: 'fr' }),
      );
    });

    it('should enrich variables with appName, year, and lang', () => {
      renderer.render('welcome', 'SMS', 'fr', { firstName: 'John' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.subject',
        expect.objectContaining({
          args: expect.objectContaining({
            appName: 'Starter API',
            year: new Date().getFullYear(),
            lang: 'fr',
            firstName: 'John',
          }),
        }),
      );
    });

    it('should use custom appName from variables', () => {
      renderer.render('welcome', 'SMS', 'fr', { firstName: 'John', appName: 'My App' });

      expect(i18nService.t).toHaveBeenCalledWith(
        'notification.welcome.subject',
        expect.objectContaining({
          args: expect.objectContaining({ appName: 'My App' }),
        }),
      );
    });

    it('should compile Handlebars expressions in translations', () => {
      const result = renderer.render('welcome', 'PUSH', 'fr', {
        firstName: 'John',
        appName: 'My App',
      });

      expect(result.body).toBe('Bienvenue sur My App');
    });

    it('should return plain text when no Handlebars expressions', () => {
      i18nService.t.mockImplementation((key: string) => {
        if (key === 'notification.simple.subject') return 'Simple Subject';
        if (key === 'notification.simple.sms') return 'Plain text message';
        return key;
      });

      const result = renderer.render('simple', 'SMS', 'fr', {});

      expect(result.subject).toBe('Simple Subject');
      expect(result.body).toBe('Plain text message');
    });
  });
});
