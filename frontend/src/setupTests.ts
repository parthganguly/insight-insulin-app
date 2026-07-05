// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
  };
};

// jsdom has no requestIdleCallback, so Ionic's ion-app falls back to
// setTimeout(cb, 32); when a test file finishes inside that window the timer
// fires after vitest tears down jsdom and crashes with "window is not
// defined" as an unhandled error. Run idle callbacks synchronously instead so
// Ionic's app setup happens while the test window still exists.
window.requestIdleCallback =
  window.requestIdleCallback ||
  function (callback: IdleRequestCallback): number {
    callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    return 0;
  };
window.cancelIdleCallback = window.cancelIdleCallback || function () {};
