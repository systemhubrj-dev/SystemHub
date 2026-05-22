import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  expenseByCategory: Record<string, number>;
  totalExpense: number;
  totalIncome: number;
  getCategoryLabel: (value: string) => string;
}

export default function FinanceiroSummary({ expenseByCategory, totalExpense, totalIncome, getCategoryLabel }: Props) {
  const sorted = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const profit = totalIncome - totalExpense;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada</p>
          ) : (
            <div className="space-y-4">
              {sorted.map(([cat, value]) => {
                const pct = totalExpense > 0 ? (value / totalExpense) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{getCategoryLabel(cat)}</span>
                      <span className="text-muted-foreground">R$ {value.toFixed(2)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Total de receitas</span>
            <span className="font-semibold text-emerald-600">R$ {totalIncome.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Total de despesas</span>
            <span className="font-semibold text-red-600">R$ {totalExpense.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-sm font-medium">Lucro Real</span>
            <span className={`text-lg font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {profit.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Margem de lucro</span>
            <span className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
