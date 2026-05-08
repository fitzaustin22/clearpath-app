// vitest.setup.js
//
// Vitest setup file. Loaded once before any test file runs (per
// vitest.config.mjs setupFiles entry). Imports @testing-library/jest-dom
// matchers so they're available globally in component tests.
//
// section121.test.js does not use these matchers (pure-function test),
// but having the setup wired now means the first component test in a
// future session can be authored without a setup PR.

import '@testing-library/jest-dom/vitest';
