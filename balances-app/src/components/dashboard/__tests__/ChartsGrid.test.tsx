/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import ChartsGrid from '../ChartsGrid';

// Mock chart components
jest.mock('@/components/charts/DepositTimeline', () => ({
  DepositTimeline: () => <div data-testid="deposit-timeline">Deposit Timeline</div>
}));

jest.mock('@/components/charts/HourlyPatterns', () => ({
  HourlyPatterns: () => <div data-testid="hourly-patterns">Hourly Patterns</div>
}));

jest.mock('@/components/charts/TopSenders', () => ({
  TopSenders: () => <div data-testid="top-senders">Top Senders</div>
}));

jest.mock('@/components/charts/DailyComparison', () => ({
  DailyComparison: () => <div data-testid="daily-comparison">Daily Comparison</div>
}));

describe('ChartsGrid', () => {
  test('renders all chart components', () => {
    render(<ChartsGrid />);
    
    expect(screen.getByText('Timeline de Depósitos')).toBeInTheDocument();
    expect(screen.getByText('Patrones por Hora')).toBeInTheDocument();
    expect(screen.getByText('Principales Remitentes')).toBeInTheDocument();
    expect(screen.getByText('Comparación Diaria')).toBeInTheDocument();
    
    expect(screen.getByTestId('deposit-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('hourly-patterns')).toBeInTheDocument();
    expect(screen.getByTestId('top-senders')).toBeInTheDocument();
    expect(screen.getByTestId('daily-comparison')).toBeInTheDocument();
  });

  test('has proper grid layout classes', () => {
    render(<ChartsGrid />);
    
    const grid = screen.getByTestId('deposit-timeline').closest('.grid');
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
  });
});