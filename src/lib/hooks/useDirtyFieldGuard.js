'use client';

import { useCallback, useRef } from 'react';

/**
 * useDirtyFieldGuard
 *
 * Tracks which form fields the user has edited in the current browser session,
 * and provides a helper to pre-populate fields only when they haven't been
 * touched. Designed for tools that pre-populate from upstream store data on
 * mount (e.g. Affidavit Builder pulling from Pay Stub Decoder / Budget Modeler,
 * or M5 Support Estimator pulling from M3).
 *
 * When to use it:
 *   - Your component pre-populates fields from upstream data AND the user can
 *     edit those same fields.
 *   - You need user edits to survive intra-session navigation (user clicks
 *     away to another route, comes back, edits must persist).
 *
 * When NOT to use it:
 *   - Fields are computed/derived and the user cannot edit them directly.
 *   - The store already guards against re-population at the source level and
 *     no additional per-field tracking is needed.
 *   - You need dirty state to survive a full browser close (use persistent
 *     store state instead — sessionStorage clears on tab close).
 *
 * Persistence:
 *   Dirty-flag set is written to sessionStorage under the given storageKey.
 *   This is intentional: edits survive in-app navigation but not a session
 *   reset (which represents a fresh start).
 *
 * @param {Object} opts
 * @param {string} opts.storageKey — sessionStorage key under which the dirty
 *   field set is persisted. Must be unique per tool.
 *
 * @returns {{
 *   isDirty: (fieldName: string) => boolean,
 *   markDirty: (fieldName: string) => void,
 *   prePopulateIfClean: (fieldName: string, sourceValue: unknown, setter: (v: unknown) => void) => void,
 * }}
 */
export function useDirtyFieldGuard({ storageKey }) {
  if (!storageKey) {
    throw new Error('useDirtyFieldGuard requires a storageKey');
  }

  const dirtyRef = useRef(null);
  if (dirtyRef.current === null) {
    // Lazy-initialize from sessionStorage on first render. Safe because
    // this hook is 'use client' and runs only in the browser; guard against
    // SSR just in case a consumer imports it from a server boundary.
    let initial = new Set();
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) initial = new Set(arr);
        }
      } catch {
        // sessionStorage unavailable or JSON malformed — start clean
      }
    }
    dirtyRef.current = initial;
  }

  const persist = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(dirtyRef.current))
      );
    } catch {
      // sessionStorage unavailable (private mode, quota) — fail silent
    }
  }, [storageKey]);

  const isDirty = useCallback((fieldName) => {
    return dirtyRef.current.has(fieldName);
  }, []);

  const markDirty = useCallback(
    (fieldName) => {
      if (dirtyRef.current.has(fieldName)) return;
      dirtyRef.current.add(fieldName);
      persist();
    },
    [persist]
  );

  const prePopulateIfClean = useCallback(
    (fieldName, sourceValue, setter) => {
      if (sourceValue == null) return;
      if (dirtyRef.current.has(fieldName)) return;
      setter(sourceValue);
    },
    []
  );

  return { isDirty, markDirty, prePopulateIfClean };
}
