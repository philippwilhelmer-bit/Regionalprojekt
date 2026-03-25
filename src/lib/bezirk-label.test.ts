import { describe, it, expect } from 'vitest';
import { computeBezirkLabel } from './bezirk-label';

const bezirke = [
  { slug: 'graz', name: 'Graz' },
  { slug: 'leoben', name: 'Leoben' },
  { slug: 'liezen', name: 'Liezen' },
];

describe('computeBezirkLabel', () => {
  it('returns "Steiermark" when slugs is empty array', () => {
    expect(computeBezirkLabel([], bezirke)).toBe('Steiermark');
  });

  it('returns "Graz" when single slug "graz" is provided', () => {
    expect(computeBezirkLabel(['graz'], bezirke)).toBe('Graz');
  });

  it('returns "Graz +1" when two slugs are provided', () => {
    expect(computeBezirkLabel(['graz', 'leoben'], bezirke)).toBe('Graz +1');
  });

  it('returns "Graz +2" when three slugs are provided', () => {
    expect(computeBezirkLabel(['graz', 'leoben', 'liezen'], bezirke)).toBe('Graz +2');
  });

  it('falls back to slug when name not found', () => {
    expect(computeBezirkLabel(['unknown-slug'], bezirke)).toBe('unknown-slug');
  });

  it('returns "Steiermark" when slugs is null', () => {
    expect(computeBezirkLabel(null, bezirke)).toBe('Steiermark');
  });

  it('returns "Steiermark" when slugs is undefined', () => {
    expect(computeBezirkLabel(undefined, bezirke)).toBe('Steiermark');
  });
});
