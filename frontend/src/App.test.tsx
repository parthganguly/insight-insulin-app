import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

test('renders without crashing', () => {
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
});

test('signals shell readiness after the initial route shell commits', () => {
  const onShellReady = vi.fn();
  render(<App onShellReady={onShellReady} />);
  expect(onShellReady).toHaveBeenCalledTimes(1);
});
