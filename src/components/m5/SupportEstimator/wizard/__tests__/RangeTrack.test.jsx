import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RangeTrack from '../RangeTrack';

describe('RangeTrack', () => {
  it('renders low / likely / high figures formatted as currency', () => {
    render(<RangeTrack low={2725} likely={3200} high={3675} />);
    expect(screen.getByTestId('se-range-low')).toHaveTextContent('$2,725');
    expect(screen.getByTestId('se-range-likely')).toHaveTextContent('$3,200');
    expect(screen.getByTestId('se-range-high')).toHaveTextContent('$3,675');
  });
  it('formats zero-value inputs as $0', () => {
    render(<RangeTrack low={0} likely={0} high={0} />);
    expect(screen.getByTestId('se-range-low')).toHaveTextContent('$0');
  });
});
