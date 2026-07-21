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

// jsdom has no IntersectionObserver either. Ionic's ion-img then falls back to
// setTimeout(() => load(), 200); when a test file finishes inside that window
// the timer fires after vitest tears down jsdom and its dispatchEvent crashes
// the run as an unhandled error (observed in CI via AiMealAdd.campaignA).
// Report every observed element as immediately visible, synchronously, so
// lazy content loads while the test window still exists and no timer is armed.
// ion-img additionally requires `isIntersecting` on the entry *prototype*, so
// the stub entry exposes it as a prototype getter.
class StubIntersectionObserverEntry {
	get isIntersecting(): boolean {
		return true;
	}
}

class StubIntersectionObserver {
	constructor(private readonly callback: IntersectionObserverCallback) {}

	observe(target: Element): void {
		this.callback(
			[{ isIntersecting: true, target } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver,
		);
	}

	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

window.IntersectionObserver = window.IntersectionObserver || (StubIntersectionObserver as unknown as typeof IntersectionObserver);
window.IntersectionObserverEntry =
	window.IntersectionObserverEntry || (StubIntersectionObserverEntry as unknown as typeof IntersectionObserverEntry);
