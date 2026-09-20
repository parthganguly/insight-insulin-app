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

// Node 26 ships its own `localStorage` global, which is inert unless the
// process was started with --localstorage-file. vitest's jsdom environment
// skips any key that already exists on globalThis, so jsdom's real Storage is
// never installed and every test touching localStorage throws
// "Cannot read properties of undefined". CI runs Node 22, where the global
// does not exist and jsdom wins, so this only bites local runs.
//
// The replacement backs `Storage.prototype` so existing quota tests can still
// spy on `Storage.prototype.setItem`. It is a test double for browser storage
// only; real browser storage and real quota behaviour are exercised by the
// Cypress suites.
if (typeof globalThis.localStorage === "undefined") {
	const contents = new WeakMap<Storage, Map<string, string>>();
	const entriesOf = (storage: Storage): Map<string, string> => {
		let entries = contents.get(storage);
		if (!entries) {
			entries = new Map<string, string>();
			contents.set(storage, entries);
		}
		return entries;
	};

	Object.defineProperties(Storage.prototype, {
		length: { configurable: true, get(this: Storage) { return entriesOf(this).size; } },
		clear: { configurable: true, writable: true, value(this: Storage) { entriesOf(this).clear(); } },
		getItem: {
			configurable: true,
			writable: true,
			value(this: Storage, key: string) {
				const entries = entriesOf(this);
				return entries.has(String(key)) ? entries.get(String(key)) as string : null;
			},
		},
		key: {
			configurable: true,
			writable: true,
			value(this: Storage, index: number) { return Array.from(entriesOf(this).keys())[index] ?? null; },
		},
		removeItem: { configurable: true, writable: true, value(this: Storage, key: string) { entriesOf(this).delete(String(key)); } },
		setItem: {
			configurable: true,
			writable: true,
			value(this: Storage, key: string, value: string) { entriesOf(this).set(String(key), String(value)); },
		},
	});

	for (const name of ["localStorage", "sessionStorage"] as const) {
		Object.defineProperty(globalThis, name, {
			configurable: true,
			writable: true,
			value: Object.create(Storage.prototype) as Storage,
		});
	}
}
