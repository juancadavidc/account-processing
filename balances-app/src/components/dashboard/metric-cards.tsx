import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/lib/types';
import { TIME_PERIODS } from '@/lib/constants';

interface MetricCardsProps {
  metrics?: MetricCard[];
}

const defaultMetrics: MetricCard[] = [
  {
    title: 'Daily Total',
    value: 0,
    currency: 'COP',
    period: TIME_PERIODS.DAILY,
  },
  {
    title: 'Weekly Total', 
    value: 0,
    currency: 'COP',
    period: TIME_PERIODS.WEEKLY,
  },
  {
    title: 'Monthly Total',
    value: 0,
    currency: 'COP',
    period: TIME_PERIODS.MONTHLY,
  },
  {
    title: 'Average per Day',
    value: 0,
    currency: 'COP',
    period: TIME_PERIODS.AVERAGE,
  },
];

export default function MetricCards({ metrics = defaultMetrics }: MetricCardsProps) {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="banking-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {metric.period}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="banking-metric">
              {formatCurrency(metric.value, metric.currency)}
            </div>
            {metric.change && (
              <p className={`text-xs ${
                metric.changeType === 'increase' 
                  ? 'banking-success' 
                  : 'text-red-500'
              }`}>
                {metric.changeType === 'increase' ? '+' : '-'}
                {Math.abs(metric.change)}% from last period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}