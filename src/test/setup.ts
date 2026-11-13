import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom не реализует ResizeObserver (нужен Recharts ResponsiveContainer)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver ??= ResizeObserverStub;

// jsdom (v25) не реализует PointerEvent — нужен для тестов перетаскивания границ
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  (globalThis as unknown as { PointerEvent: typeof PointerEventStub }).PointerEvent = PointerEventStub;
}
