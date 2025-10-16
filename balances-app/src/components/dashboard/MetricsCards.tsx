'use client';

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/stores/dashboard';
import { DashboardMetrics } from '@/lib/types';

interface MetricCardProps {
  title: string;
  metrics: DashboardMetrics;
  previousMetrics?: DashboardMetrics;
  variant?: 'trust' | 'growth' | 'premium' | 'prosperity';
  updating?: boolean;
}

function MetricCard({ title, metrics, previousMetrics, variant = 'trust', updating = false }: MetricCardProps) {
  // Neuromarketing color classes based on psychological impact
  const getVariantClasses = (variant: string) => {
    const variants = {
      trust: {
        card: 'neuro-trust hover:shadow-md transition-all duration-200',
        title: 'neuro-trust-text uppercase tracking-wider',
        metric: 'neuro-trust-metric mb-1',
        badge: 'neuro-trust-badge banking-subtle'
      },
      growth: {
        card: 'neuro-growth hover:shadow-md transition-all duration-200',
        title: 'neuro-growth-text uppercase tracking-wider',
        metric: 'neuro-growth-metric mb-1',
        badge: 'neuro-growth-badge banking-subtle'
      },
      premium: {
        card: 'neuro-premium hover:shadow-md transition-all duration-200',
        title: 'neuro-premium-text uppercase tracking-wider',
        metric: 'neuro-premium-metric mb-1',
        badge: 'neuro-premium-badge banking-subtle'
      },
      prosperity: {
        card: 'neuro-prosperity hover:shadow-md transition-all duration-200',
        title: 'neuro-prosperity-text uppercase tracking-wider',
        metric: 'neuro-prosperity-metric mb-1',
        badge: 'neuro-prosperity-badge banking-subtle'
      }
    };
    return variants[variant as keyof typeof variants] || variants.trust;
  };
  
  const classes = getVariantClasses(variant);
  // Colombian Peso formatting with period as thousands separator
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('es-CO', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  // Calculate percentage change vs previous period
  const calculateChange = (): { percentage: number; isIncrease: boolean } | null => {
    if (!previousMetrics || previousMetrics.totalAmount === 0) return null;
    
    const currentAmount = metrics.totalAmount;
    const previousAmount = previousMetrics.totalAmount;
    const percentage = ((currentAmount - previousAmount) / previousAmount) * 100;
    
    return {
      percentage: Math.abs(percentage),
      isIncrease: percentage > 0
    };
  };

  const change = calculateChange();

  return (
    <Card className={`${classes.card} ${updating ? 'relative overflow-hidden' : ''}`}>
      {updating && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`${classes.title} flex items-center gap-2`}>
          {title}
          {updating && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
        <Badge variant="secondary" className={classes.badge}>
          {metrics.transactionCount} transacciones
        </Badge>
      </CardHeader>
      <CardContent>
        <div className={classes.metric}>
          {formatCurrency(metrics.totalAmount)}
        </div>
        <div className="banking-subtle mb-2">
          Promedio: <span className="banking-amount">{formatCurrency(metrics.averageAmount)}</span>
        </div>
        {change && (
          <div className={`banking-subtle flex items-center ${
            change.isIncrease 
              ? 'text-primary opacity-70' 
              : 'text-destructive opacity-70'
          }`}>
            <span className="mr-1">
              {change.isIncrease ? '↗' : '↘'}
            </span>
            {change.percentage.toFixed(1)}% vs período anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MetricsCards() {
  const { metrics, loading, metricsUpdating } = useDashboardStore();
  
  // Refs to preserve last known good values
  const lastDailyMetrics = useRef<DashboardMetrics | null>(null);
  const lastWeeklyMetrics = useRef<DashboardMetrics | null>(null);
  const lastMonthlyMetrics = useRef<DashboardMetrics | null>(null);
  
  // Update refs when new valid metrics arrive (not during updating state)
  useEffect(() => {
    if (!metricsUpdating) {
      if (metrics.daily) lastDailyMetrics.current = metrics.daily;
      if (metrics.weekly) lastWeeklyMetrics.current = metrics.weekly;
      if (metrics.monthly) lastMonthlyMetrics.current = metrics.monthly;
    }
  }, [metrics, metricsUpdating]);

  // Default empty metrics only for initial load (when no previous values exist)
  const getDefaultMetrics = (period: 'daily' | 'weekly' | 'monthly'): DashboardMetrics => ({
    period,
    totalAmount: 0,
    transactionCount: 0,
    averageAmount: 0,
    periodStart: new Date(),
    periodEnd: new Date(),
    lastUpdated: new Date()
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="banking-elegant animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Use current metrics if available, otherwise use last known values, otherwise use defaults
  const dailyMetrics = metrics.daily || lastDailyMetrics.current || getDefaultMetrics('daily');
  const weeklyMetrics = metrics.weekly || lastWeeklyMetrics.current || getDefaultMetrics('weekly');
  const monthlyMetrics = metrics.monthly || lastMonthlyMetrics.current || getDefaultMetrics('monthly');
  
  // Calculate overall average from all processed transactions
  const allTransactions = useDashboardStore.getState().transactions.filter(t => t.status === 'processed');
  const overallAverage = allTransactions.length > 0 
    ? allTransactions.reduce((sum, t) => sum + t.amount, 0) / allTransactions.length 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Hoy"
        metrics={dailyMetrics}
        variant="trust"
        updating={metricsUpdating}
      />
      
      <MetricCard
        title="Esta Semana"
        metrics={weeklyMetrics}
        variant="growth"
        updating={metricsUpdating}
      />
      
      <MetricCard
        title="Este Mes" 
        metrics={monthlyMetrics}
        variant="premium"
        updating={metricsUpdating}
      />
      
      <Card className={`neuro-prosperity hover:shadow-md transition-all duration-200 ${metricsUpdating ? 'relative overflow-hidden' : ''}`}>
        {metricsUpdating && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
        )}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={`neuro-prosperity-text uppercase tracking-wider flex items-center gap-2`}>
            Promedio
            {metricsUpdating && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </CardTitle>
          <Badge variant="secondary" className="neuro-prosperity-badge banking-subtle">
            Todas las transacciones
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="neuro-prosperity-metric mb-1">
            ${overallAverage.toLocaleString('es-CO', { 
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>
          <div className="banking-subtle">
            Por transacción
          </div>
        </CardContent>
      </Card>
    </div>
  );
}