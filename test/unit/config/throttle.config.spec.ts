import throttleConfig from '@config/throttle.config';

describe('throttle.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars are set', () => {
    delete process.env.THROTTLE_DEFAULT_TTL;
    delete process.env.THROTTLE_DEFAULT_LIMIT;
    delete process.env.THROTTLE_STRICT_TTL;
    delete process.env.THROTTLE_STRICT_LIMIT;

    const config = throttleConfig();

    expect(config).toEqual({
      default: { ttl: 60_000, limit: 30 },
      strict: { ttl: 60_000, limit: 5 },
    });
  });

  it('should convert TTL from seconds to milliseconds', () => {
    process.env.THROTTLE_DEFAULT_TTL = '120';
    process.env.THROTTLE_STRICT_TTL = '30';

    const config = throttleConfig();

    expect(config.default.ttl).toBe(120_000);
    expect(config.strict.ttl).toBe(30_000);
  });

  it('should use custom limits from env vars', () => {
    process.env.THROTTLE_DEFAULT_LIMIT = '100';
    process.env.THROTTLE_STRICT_LIMIT = '3';

    const config = throttleConfig();

    expect(config.default.limit).toBe(100);
    expect(config.strict.limit).toBe(3);
  });

  it('should allow overriding all values independently', () => {
    process.env.THROTTLE_DEFAULT_TTL = '10';
    process.env.THROTTLE_DEFAULT_LIMIT = '50';
    process.env.THROTTLE_STRICT_TTL = '300';
    process.env.THROTTLE_STRICT_LIMIT = '2';

    const config = throttleConfig();

    expect(config).toEqual({
      default: { ttl: 10_000, limit: 50 },
      strict: { ttl: 300_000, limit: 2 },
    });
  });
});
