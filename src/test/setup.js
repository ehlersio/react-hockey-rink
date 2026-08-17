import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no real <canvas> implementation. HeatmapLayer only needs enough
// of the 2D context API to run its KDE math without throwing — stub it.
const mockCtx = {
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: () => {},
  drawImage: () => {},
  filter: '',
};
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
