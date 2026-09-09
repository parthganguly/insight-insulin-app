import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from './stores/settingsStore';
import App from './App';

const { setAppearance } = vi.hoisted(() => ({ setAppearance: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@capacitor/core', async () => ({
  ...await vi.importActual<typeof import('@capacitor/core')>('@capacitor/core'),
  registerPlugin: vi.fn(() => ({ setAppearance })),
}));

beforeEach(() => { setAppearance.mockResolvedValue(undefined); });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setAppearance.mockClear();
  useSettingsStore.setState({ darkMode: null });
});

test.each([false, true])('syncs Paper, Ink and resolved System navigation intent (system Ink=%s)', (prefersInk) => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: prefersInk, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  render(<App />);
  expect(setAppearance).toHaveBeenLastCalledWith({ lightNavigationBars: !prefersInk });
  for (const darkMode of [false, true, null]) {
    act(() => useSettingsStore.getState().toggleDarkMode(darkMode));
    expect(setAppearance).toHaveBeenLastCalledWith({ lightNavigationBars: !(darkMode ?? prefersInk) });
  }
});

test('does not call the navigation bridge in a browser', () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  render(<App />);
  act(() => useSettingsStore.getState().toggleDarkMode(true));
  expect(setAppearance).not.toHaveBeenCalled();
});

test('a rejected navigation bridge does not prevent shell readiness', async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  setAppearance.mockRejectedValueOnce(new Error('unavailable'));
  const onShellReady = vi.fn();
  await act(async () => { render(<App onShellReady={onShellReady} />); });
  expect(setAppearance).toHaveBeenCalled();
  expect(onShellReady).toHaveBeenCalledTimes(1);
});

test('renders without crashing', () => {
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
});

test('signals shell readiness after the initial route shell commits', () => {
  const onShellReady = vi.fn();
  render(<App onShellReady={onShellReady} />);
  expect(onShellReady).toHaveBeenCalledTimes(1);
});
