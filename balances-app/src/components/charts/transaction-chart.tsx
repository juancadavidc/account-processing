import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransactionChart() {
  return (
    <Card className="banking-card">
      <CardHeader>
        <CardTitle>Transaction Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Recharts component will be implemented here
        </div>
      </CardContent>
    </Card>
  );
}