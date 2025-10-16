// Chart-related type definitions for Recharts components

export interface TooltipPayload {
  color?: string;
  dataKey?: string;
  fill?: string;
  formatter?: (value: number | string) => string | number;
  name?: string;
  payload?: Record<string, unknown>;
  stroke?: string;
  strokeDasharray?: string;
  type?: string;
  unit?: string;
  value?: number | string;
}

export interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

export interface ChartDataPoint {
  [key: string]: string | number | boolean;
}