/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AmountRangeFilter from '../amount-range-filter';

// Mock the dashboard store
const mockSetFilters = jest.fn();
const mockAmountRange = { min: undefined, max: undefined };

jest.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({
    amountRange: mockAmountRange,
    setFilters: mockSetFilters,
  }),
}));

describe('AmountRangeFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders min and max input fields', () => {
    render(<AmountRangeFilter />);
    
    expect(screen.getByPlaceholderText('Mínimo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Máximo')).toBeInTheDocument();
  });

  test('displays dollar sign icons', () => {
    render(<AmountRangeFilter />);
    
    const dollarIcons = screen.getAllByTestId('dollar-sign');
    expect(dollarIcons).toHaveLength(2);
  });

  test('formats Colombian peso input with thousand separators', async () => {
    const user = userEvent.setup();
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    
    await user.type(minInput, '100000');
    expect(minInput).toHaveValue('100.000');
  });

  test('debounces input and calls setFilters after 300ms', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    await user.type(minInput, '50000');
    
    // Should not call setFilters immediately
    expect(mockSetFilters).not.toHaveBeenCalled();
    
    // Fast forward 300ms
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith({
        amountRange: { min: 50000, max: undefined }
      });
    });
    
    jest.useRealTimers();
  });

  test('shows validation error when min > max', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    const maxInput = screen.getByPlaceholderText('Máximo');
    
    await user.type(minInput, '100000');
    await user.type(maxInput, '50000');
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText('El monto mínimo debe ser menor o igual al máximo')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  test('shows validation error for negative amounts', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    
    await user.type(minInput, '-1000');
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText('Los montos no pueden ser negativos')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  test('applies error styling when validation fails', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    const maxInput = screen.getByPlaceholderText('Máximo');
    
    await user.type(minInput, '100000');
    await user.type(maxInput, '50000');
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(minInput).toHaveClass('border-red-500');
      expect(maxInput).toHaveClass('border-red-500');
    });
    
    jest.useRealTimers();
  });

  test('sets both min and max values correctly', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    const maxInput = screen.getByPlaceholderText('Máximo');
    
    await user.type(minInput, '50000');
    await user.type(maxInput, '200000');
    
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith({
        amountRange: { min: 50000, max: 200000 }
      });
    });
    
    jest.useRealTimers();
  });

  test('clears validation error when valid range is entered', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup();
    
    render(<AmountRangeFilter />);
    
    const minInput = screen.getByPlaceholderText('Mínimo');
    const maxInput = screen.getByPlaceholderText('Máximo');
    
    // First enter invalid range
    await user.type(minInput, '100000');
    await user.type(maxInput, '50000');
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText('El monto mínimo debe ser menor o igual al máximo')).toBeInTheDocument();
    });
    
    // Clear max input and enter valid value
    await user.clear(maxInput);
    await user.type(maxInput, '150000');
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.queryByText('El monto mínimo debe ser menor o igual al máximo')).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});