import "@testing-library/jest-dom";

// jsdom lacks a few browser APIs that Radix UI primitives rely on.
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView ??= jest.fn();
  window.HTMLElement.prototype.hasPointerCapture ??= jest.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture ??= jest.fn();
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
