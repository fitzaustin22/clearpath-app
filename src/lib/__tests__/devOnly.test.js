import { describe, it, expect, vi, afterEach } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound: () => notFound() }));

import { devOnly } from '@/src/lib/devOnly';

describe('devOnly — dev harness routes never render outside next dev', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    notFound.mockClear();
  });

  it.each(['production', 'test', ''])('404s when NODE_ENV is "%s"', (env) => {
    vi.stubEnv('NODE_ENV', env);
    expect(() => devOnly()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('renders when NODE_ENV is development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => devOnly()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });
});
