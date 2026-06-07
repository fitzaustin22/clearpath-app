import { describe, it, expect } from 'vitest';
import { isActive } from '../isActive';

// Route constants mirror the nav config in PrimaryNav / MobileNav.
const DASHBOARD = '/dashboard';
const MODULES = '/modules';
const BLUEPRINT = '/blueprint';

describe('isActive', () => {
  describe('/dashboard — exact-match only', () => {
    it('lights Dashboard on exactly /dashboard', () => {
      expect(isActive('/dashboard', DASHBOARD)).toBe(true);
    });

    it('does NOT light Modules or Blueprint on /dashboard', () => {
      expect(isActive('/dashboard', MODULES)).toBe(false);
      expect(isActive('/dashboard', BLUEPRINT)).toBe(false);
    });

    // Deliberate edge: Dashboard is exact-match, so a nested path under it does
    // NOT activate the pill (see isActive.js rationale).
    it('does NOT light Dashboard on a nested /dashboard/extra', () => {
      expect(isActive('/dashboard/extra', DASHBOARD)).toBe(false);
    });
  });

  describe('/modules — prefix-match (route or any nested path)', () => {
    it('lights Modules on exactly /modules', () => {
      expect(isActive('/modules', MODULES)).toBe(true);
    });

    it('does NOT light Dashboard or Blueprint on /modules', () => {
      expect(isActive('/modules', DASHBOARD)).toBe(false);
      expect(isActive('/modules', BLUEPRINT)).toBe(false);
    });

    it('still lights Modules on /modules/m4 (nested module route)', () => {
      expect(isActive('/modules/m4', MODULES)).toBe(true);
    });

    it('still lights Modules on /modules/m4/something (deeply nested)', () => {
      expect(isActive('/modules/m4/something', MODULES)).toBe(true);
    });

    it('does NOT light Dashboard or Blueprint on /modules/m4', () => {
      expect(isActive('/modules/m4', DASHBOARD)).toBe(false);
      expect(isActive('/modules/m4', BLUEPRINT)).toBe(false);
    });

    // The `route + '/'` boundary matters: a sibling path that merely shares the
    // prefix string must NOT activate Modules.
    it('does NOT light Modules on a prefix-sharing sibling /modules-archive', () => {
      expect(isActive('/modules-archive', MODULES)).toBe(false);
    });
  });

  describe('/blueprint — prefix-match (route or any nested path)', () => {
    it('lights Blueprint on exactly /blueprint', () => {
      expect(isActive('/blueprint', BLUEPRINT)).toBe(true);
    });

    it('still lights Blueprint on /blueprint/preview (nested)', () => {
      expect(isActive('/blueprint/preview', BLUEPRINT)).toBe(true);
    });

    it('does NOT light Dashboard or Modules on /blueprint', () => {
      expect(isActive('/blueprint', DASHBOARD)).toBe(false);
      expect(isActive('/blueprint', MODULES)).toBe(false);
    });
  });

  describe('non-nav routes activate nothing', () => {
    it('/ → no nav item active', () => {
      expect(isActive('/', DASHBOARD)).toBe(false);
      expect(isActive('/', MODULES)).toBe(false);
      expect(isActive('/', BLUEPRINT)).toBe(false);
    });

    it('/unknown → no nav item active', () => {
      expect(isActive('/unknown', DASHBOARD)).toBe(false);
      expect(isActive('/unknown', MODULES)).toBe(false);
      expect(isActive('/unknown', BLUEPRINT)).toBe(false);
    });
  });
});
