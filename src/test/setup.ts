/**
 * Global test setup.
 *
 * Runs once per test file, in whichever environment that file selected. Most
 * files run under jsdom (the project default in `vitest.config.ts`), but the
 * HTTP suite runs under Node's native environment via a `@vitest-environment`
 * directive so that `fetch` and `AbortController` share one realm.
 *
 * Everything below is therefore feature-detected: jsdom-only globals are
 * guarded so this file is a no-op in a pure Node environment instead of
 * throwing before the tests can start.
 */

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

/* ------------------------------------------------------------------ *
 * DOM matchers.
 *
 * A static side-effect import is used deliberately: it registers the matchers
 * against vitest's global `expect`, which exists in both environments because
 * `globals: true`. The matchers themselves are only *called* from component
 * tests, so evaluating the module under Node is harmless — and it keeps the
 * file free of a dynamic import that would break type resolution.
 * ------------------------------------------------------------------ */
import '@testing-library/jest-dom';

/* ------------------------------------------------------------------ *
 * jsdom gaps that component tests rely on.
 *
 * jsdom has no layout engine, so it ships neither of these. cmdk (used by the
 * command palette) observes its list with ResizeObserver, and Radix measures
 * floating content with ResizeObserver/scrollIntoView. Every real browser has
 * them; the stubs below only satisfy the API surface the components touch.
 * ------------------------------------------------------------------ */
if (hasDom) {
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });
  }

  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
