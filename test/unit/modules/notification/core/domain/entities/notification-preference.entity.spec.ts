import { NotificationPreference } from '@modules/notification/core/domain/entities/notification-preference.entity';

describe('NotificationPreference', () => {
  const makePreference = (overrides = {}) =>
    new NotificationPreference({
      userId: 'user-1',
      channel: 'EMAIL',
      ...overrides,
    });

  it('should be defined', () => {
    expect(makePreference()).toBeDefined();
  });

  it('should be enabled by default', () => {
    const pref = makePreference();
    expect(pref.enabled).toBe(true);
  });

  it('should respect the provided enabled value', () => {
    const pref = makePreference({ enabled: false });
    expect(pref.enabled).toBe(false);
  });

  it('should generate an id when none is provided', () => {
    const pref = makePreference();
    expect(pref.id).toBeTruthy();
  });

  it('should use the provided id', () => {
    const pref = makePreference({ id: 'fixed-id' });
    expect(pref.id).toBe('fixed-id');
  });

  describe('enable', () => {
    it('should set enabled to true', () => {
      const pref = makePreference({ enabled: false });
      pref.enable();
      expect(pref.enabled).toBe(true);
    });

    it('should update updatedAt', () => {
      const pref = makePreference({ enabled: false });
      const before = pref.updatedAt;
      pref.enable();
      expect(pref.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('disable', () => {
    it('should set enabled to false', () => {
      const pref = makePreference({ enabled: true });
      pref.disable();
      expect(pref.enabled).toBe(false);
    });

    it('should update updatedAt', () => {
      const pref = makePreference({ enabled: true });
      const before = pref.updatedAt;
      pref.disable();
      expect(pref.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('toggle', () => {
    it('should toggle enabled from true to false', () => {
      const pref = makePreference({ enabled: true });
      pref.toggle();
      expect(pref.enabled).toBe(false);
    });

    it('should toggle enabled from false to true', () => {
      const pref = makePreference({ enabled: false });
      pref.toggle();
      expect(pref.enabled).toBe(true);
    });

    it('should update updatedAt', () => {
      const pref = makePreference();
      const before = pref.updatedAt;
      pref.toggle();
      expect(pref.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
