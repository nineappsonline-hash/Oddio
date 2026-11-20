import { describe, expect, it } from 'vitest';
import { moveItem } from './reorder-items';

describe('moveItem', () => {
  it('moves an item forward without modifying the original', () => {
    const original = ['a', 'b', 'c', 'd'];
    expect(moveItem(original, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(original).toEqual(['a', 'b', 'c', 'd']);
  });
  it('moves an item backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
  it('preserves items for out-of-range, fractional or unchanged indices', () => {
    const values = ['one', 'two'];
    for (const [from, to] of [[-1, 0], [0, 2], [0.5, 1], [0, 0], [2, 0]]) {
      expect(moveItem(values, from, to)).toEqual(values);
    }
  });
  it('preserves object identity and handles an empty list', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    expect(moveItem([first, second], 1, 0)).toEqual([second, first]);
    expect(moveItem([first, second], 1, 0)[0]).toBe(second);
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});
