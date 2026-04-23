import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatBRL, formatQuantidade, parseDecimalInput } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Info } from "lucide-react";
import { cn } from "@/lib/utils";

function parsePositive(raw: string): number | null {
  const n = parseDecimalInput(raw || "0");
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export default function SimulacaoLucro() {
  const [quantidadeStr, setQuantidadeStr] = useState("");
  const [precoVendaStr, setPrecoVendaStr] = useState("");
  const [custoUnitStr, setCustoUnitStr] = useState("");

  const resultado = useMemo(() => {
    const qtd = parsePositive(quantidadeStr);
    const precoVenda = parsePositive(precoVendaStr);
    const custoUnit = parsePositive(custoUnitStr);
    if (qtd == null || precoVenda == null || custoUnit == null) return null;
    if (qtd <= 0) return null;

    const receita = qtd * precoVenda;
    const custoTotal = qtd * custoUnit;
    const lucro = receita - custoTotal;
    /** Preço unitário mínimo para receita = custo total (empate / sem prejuízo) */
    const precoMinimoUnitario = custoUnit;
    const lucroPorUnidade = precoVenda - custoUnit;
    const margemSobreReceita = receita > 0 ? (lucro / receita) * 100 : null;

    return {
      receita,
      custoTotal,
      lucro,
      precoMinimoUnitario,
      lucroPorUnidade,
      margemSobreReceita,
      qtd,
    };
  }, [quantidadeStr, precoVendaStr, custoUnitStr]);

  return (
    <Layout title="Simulação de lucro">
      <p className="text-sm text-muted-foreground mb-6 max-w-lg">
        Informe a quantidade comercializada, o preço de venda unitário e o custo estimado por unidade. Os valores são
        apenas uma simulação e não são salvos.
      </p>

      <div className="rounded-xl bg-card border border-border p-4 md:p-5 mb-6 space-y-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Use a mesma unidade para preço e custo (ex.: R$/kg). O preço mínimo sem prejuízo corresponde ao custo unitário
            estimado.
          </span>
        </div>

        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input
            value={quantidadeStr}
            onChange={(e) => setQuantidadeStr(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 1500"
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label>Preço de venda (por unidade)</Label>
          <Input
            value={precoVendaStr}
            onChange={(e) => setPrecoVendaStr(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 2,80"
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label>Custo estimado (por unidade)</Label>
          <Input
            value={custoUnitStr}
            onChange={(e) => setCustoUnitStr(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 2,10"
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold">Resultado</h2>
        </div>

        {!resultado ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Preencha quantidade maior que zero e os valores em R$.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultadoItem label="Receita total" value={formatBRL(resultado.receita)} variant="income" />
              <ResultadoItem label="Custo total estimado" value={formatBRL(resultado.custoTotal)} variant="neutral" />
              <ResultadoItem
                label="Lucro"
                value={formatBRL(resultado.lucro)}
                variant={resultado.lucro >= 0 ? "income" : "expense"}
                hint={
                  resultado.margemSobreReceita != null
                    ? `Margem sobre a receita: ${resultado.margemSobreReceita.toFixed(1)}%`
                    : undefined
                }
              />
              <ResultadoItem
                label="Preço mínimo sem prejuízo"
                value={formatBRL(resultado.precoMinimoUnitario)}
                variant="neutral"
                hint="Por unidade — abaixo disso, a operação tende a prejuízo com este custo"
              />
            </div>
            <div className="pt-3 border-t border-border text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Lucro por unidade:{" "}
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    resultado.lucroPorUnidade >= 0 ? "text-income" : "text-expense"
                  )}
                >
                  {formatBRL(resultado.lucroPorUnidade)}
                </span>
              </span>
              <span className="tabular-nums">
                Quantidade: {formatQuantidade(resultado.qtd)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function ResultadoItem({
  label,
  value,
  variant,
  hint,
}: {
  label: string;
  value: string;
  variant: "income" | "expense" | "neutral";
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/80 p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          variant === "income" && "text-income",
          variant === "expense" && "text-expense",
          variant === "neutral" && "text-foreground"
        )}
      >
        {value}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{hint}</p>}
    </div>
  );
}
