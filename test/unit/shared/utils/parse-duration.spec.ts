import { computeExpiresAt } from '@shared/utils/parse-duration';

describe('computeExpiresAt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should compute correct date for days', () => {
    const result = computeExpiresAt('7d');
    expect(result).toEqual(new Date('2025-01-08T00:00:00.000Z'));
  });

  it('should compute correct date for hours', () => {
    const result = computeExpiresAt('2h');
    expect(result).toEqual(new Date('2025-01-01T02:00:00.000Z'));
  });

  it('should compute correct date for minutes', () => {
    const result = computeExpiresAt('15m');
    expect(result).toEqual(new Date('2025-01-01T00:15:00.000Z'));
  });

  it('should compute correct date for seconds', () => {
    const result = computeExpiresAt('30s');
    expect(result).toEqual(new Date('2025-01-01T00:00:30.000Z'));
  });

  it('should throw on invalid format', () => {
    expect(() => computeExpiresAt('invalid')).toThrow('Invalid duration format');
    expect(() => computeExpiresAt('7w')).toThrow('Invalid duration format');
    expect(() => computeExpiresAt('')).toThrow('Invalid duration format');
  });
});
