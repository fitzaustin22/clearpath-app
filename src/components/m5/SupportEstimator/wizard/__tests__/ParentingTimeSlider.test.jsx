import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParentingTimeSlider from '../ParentingTimeSlider';

describe('ParentingTimeSlider', () => {
  it('renders the live percent + nights readout from the value', () => {
    render(<ParentingTimeSlider value={65} onChange={() => {}} />);
    expect(screen.getByTestId('se-parenting-pct-you')).toHaveTextContent('65%');
    expect(screen.getByTestId('se-parenting-you')).toHaveTextContent('237'); // round(65/100*365)
    expect(screen.getByTestId('se-parenting-spouse')).toHaveTextContent('35%');
  });
  it('emits numeric values on change (step 5, range 0–100)', () => {
    const onChange = vi.fn();
    render(<ParentingTimeSlider value={65} onChange={onChange} />);
    const input = screen.getByTestId('se-parenting-input');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '5');
    fireEvent.change(input, { target: { value: '70' } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
  it('clamps a value above 100 to 100', () => {
    render(<ParentingTimeSlider value={150} onChange={() => {}} />);
    expect(screen.getByTestId('se-parenting-pct-you')).toHaveTextContent('100%');
  });
  it('treats undefined value as 0', () => {
    render(<ParentingTimeSlider value={undefined} onChange={() => {}} />);
    expect(screen.getByTestId('se-parenting-pct-you')).toHaveTextContent('0%');
  });
});
