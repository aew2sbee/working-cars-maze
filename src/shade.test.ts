import { describe, expect, it } from 'vitest';
import { tint } from './shade';

describe('tint', () => {
  it('leaves the colour as it is at 0', () => {
    expect(tint('#3a2213', 0)).toBe('rgb(58, 34, 19)');
  });

  it('goes all the way to white or black at 1', () => {
    expect(tint('#3a2213', 1)).toBe('rgb(255, 255, 255)');
    expect(tint('#3a2213', -1)).toBe('rgb(0, 0, 0)');
  });

  it('mixes part of the way', () => {
    expect(tint('#808080', 0.5)).toBe('rgb(192, 192, 192)');
    expect(tint('#808080', -0.5)).toBe('rgb(64, 64, 64)');
  });
});
