import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BalanceChart() {
  return (
    <Card className="banking-card">
      <CardHeader>
        <CardTitle>Balance Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Recharts component will be implemented here
        </div>
      </CardContent>
    </Card>
  );
}