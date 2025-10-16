'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DepositTimeline } from '@/components/charts/DepositTimeline';
import { HourlyPatterns } from '@/components/charts/HourlyPatterns';
import { TopSenders } from '@/components/charts/TopSenders';
import { DailyComparison } from '@/components/charts/DailyComparison';

export default function ChartsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="banking-elegant">
        <CardHeader>
          <CardTitle className="banking-subtle uppercase tracking-wider">Timeline de Depósitos</CardTitle>
        </CardHeader>
        <CardContent>
          <DepositTimeline />
        </CardContent>
      </Card>

      <Card className="banking-elegant">
        <CardHeader>
          <CardTitle className="banking-subtle uppercase tracking-wider">Patrones por Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <HourlyPatterns />
        </CardContent>
      </Card>

      <Card className="banking-elegant">
        <CardHeader>
          <CardTitle className="banking-subtle uppercase tracking-wider">Principales Remitentes</CardTitle>
        </CardHeader>
        <CardContent>
          <TopSenders />
        </CardContent>
      </Card>

      <Card className="banking-elegant">
        <CardHeader>
          <CardTitle className="banking-subtle uppercase tracking-wider">Comparación Diaria</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyComparison />
        </CardContent>
      </Card>
    </div>
  );
}