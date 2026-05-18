/**
 * useBreakpoints tests — wizard foundation shared breakpoint hook.
 *
 * Single 720px threshold per Wizard-Design-Spec.md mobile collapse
 * boundary: width < 720 -> isMobile true; width >= 720 -> false.
 * Covers initial state, live resize updates, listener cleanup, and the
 * SSR guard (window undefined).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoints, getIsMobile } from '../useBreakpoints.js';

function setWidth(w) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: w,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setWidth(1024);
});

describe('useBreakpoints', () => {
  it('returns isMobile: true when window.innerWidth < 720', () => {
    setWidth(719);
    const { result } = renderHook(() => useBreakpoints());
    expect(result.current.isMobile).toBe(true);
  });

  it('returns isMobile: false at exactly the 720 threshold', () => {
    setWidth(720);
    const { result } = renderHook(() => useBreakpoints());
    expect(result.current.isMobile).toBe(false);
  });

  it('returns isMobile: false at a typical desktop width', () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoints());
    expect(result.current.isMobile).toBe(false);
  });

  it('updates isMobile when the window is resized across the threshold', () => {
    setWidth(1024);
    const { result } = renderHook(() => useBreakpoints());
    expect(result.current.isMobile).toBe(false);

    act(() => {
      setWidth(600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.isMobile).toBe(true);

    act(() => {
      setWidth(900);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.isMobile).toBe(false);
  });

  it('removes its resize listener on unmount (no leak)', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useBreakpoints());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('is SSR-safe: getIsMobile() returns false when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(getIsMobile()).toBe(false);
  });
});
