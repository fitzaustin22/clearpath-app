import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DefinitionList from '../DefinitionList.jsx';

const ITEMS = [
  { number: '01', title: 'First principle', body: 'Body copy for the first row.' },
  { number: '02', title: 'Second principle', body: 'Body copy for the second row.' },
  { number: '03', title: 'Third principle', body: 'Body copy for the third row.' },
  { number: '04', title: 'Fourth principle', body: 'Body copy for the fourth row.' },
];

describe('DefinitionList', () => {
  it('renders one row per item', () => {
    render(<DefinitionList items={ITEMS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('renders the number, title, and body of each item', () => {
    render(<DefinitionList items={ITEMS} />);
    for (const item of ITEMS) {
      expect(screen.getByText(item.number)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 3, name: item.title }),
      ).toBeInTheDocument();
      expect(screen.getByText(item.body)).toBeInTheDocument();
    }
  });

  it('renders every title as a level-3 heading', () => {
    render(<DefinitionList items={ITEMS} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('marks only the first row with data-first="true"', () => {
    render(<DefinitionList items={ITEMS} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('data-first', 'true');
    for (const row of rows.slice(1)) {
      expect(row).toHaveAttribute('data-first', 'false');
    }
  });
});
