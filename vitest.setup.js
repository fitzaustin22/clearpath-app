// vitest.setup.js
//
// Vitest setup file. Loaded once before any test file runs (per
// vitest.config.mjs setupFiles entry). Imports @testing-library/jest-dom
// matchers so they're available globally in component tests, and
// registers RTL's cleanup() in a global afterEach hook (vitest is
// configured with globals: false, so RTL's auto-cleanup is inactive).

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
