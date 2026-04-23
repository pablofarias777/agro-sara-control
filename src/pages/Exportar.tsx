import { useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import {
  exportAllData,
  importAllData,
  getDespesasByPropriedade,
  getVendasByPropriedade,
  getCulturasByPropriedade,
  getSafrasByPropriedade,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import { downloadFile } from "@/lib/csv";
import { CATEGORIA_LABELS, CANAL_LABELS, CENTRO_CUSTO_LABELS } from "@/domain/labels";
import {
  getCentroCustoEfetivo,
  filterByDateRange,
  computeResumoPorCultura,
  computeResumoPorCentroCusto,
  computeResumoMensalLucroPrejuizo,
  sumFinanceiro,
  margemSobreVendasPercent,
  calcularIndicadoresSafraNoPeriodo,
} from "@/domain/finance";
import { formatDate, today } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CalendarRange,
  Leaf,
  Sprout,
  BarChart3,
  Table2,
  Database,
} from "lucide-react";
import { toast } from "sonner";

function fileSuffixPeriodo(inicio: string, fim: string): string {
  return `${inicio}_a_${fim}`;
}

export default function Exportar() {
  const { propriedadeAtivaId, ready, propriedadeAtiva } = usePropriedade();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => today());

  const periodoValido = useMemo(() => dataInicio <= dataFim, [dataInicio, dataFim]);

  const exportCSVDespesas = async () => {
    if (!propriedadeAtivaId) return;
    const [despesas, culturas, safras] = await Promise.all([
      getDespesasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
    ]);
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Despesas");
    const sorted = [...despesas].sort((a, b) => a.data.localeCompare(b.data));
    const rows = sorted.map((d) => {
      const safra = d.safraId ? safras.find((x) => x.id === d.safraId) : undefined;
      return {
        data: new Date(`${d.data}T00:00:00`),
        categoria: CATEGORIA_LABELS[d.categoria],
        centro: CENTRO_CUSTO_LABELS[getCentroCustoEfetivo(d)],
        cultura: culturas.find((c) => c.id === d.culturaId)?.nome || "",
        safra: safra ? (safra.dataFim ? `${formatDate(safra.dataInicio)} a ${formatDate(safra.dataFim)}` : `${formatDate(safra.dataInicio)} em andamento`) : "",
        descricao: d.descricao,
        valor: d.valor,
      };
    });

    ws.addTable({
      name: "TabelaDespesas",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "Data", totalsRowLabel: "TOTAL" },
        { name: "Categoria" },
        { name: "Centro de custo" },
        { name: "Cultura" },
        { name: "Safra" },
        { name: "Descricao" },
        { name: "Valor (R$)", totalsRowFunction: "sum" },
      ],
      rows: rows.map((r) => [r.data, r.categoria, r.centro, r.cultura, r.safra, r.descricao, r.valor]),
    });

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 18;
    ws.getColumn(5).width = 28;
    ws.getColumn(6).width = 36;
    ws.getColumn(7).width = 14;
    ws.getColumn(1).numFmt = "dd/mm/yyyy";
    ws.getColumn(7).numFmt = "#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.eachRow((row) => {
      row.alignment = { vertical: "middle" };
    });

    await downloadWorkbook(workbook, "despesas-lancamentos.xlsx");
    toast.success("Despesas exportadas em XLSX!");
  };

  const exportCSVVendas = async () => {
    if (!propriedadeAtivaId) return;
    const [vendas, culturas, safras] = await Promise.all([
      getVendasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
    ]);
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Vendas");
    const sorted = [...vendas].sort((a, b) => a.data.localeCompare(b.data));
    const rows = sorted.map((v) => {
      const safra = safras.find((x) => x.culturaId === v.culturaId && x.dataInicio <= v.data && (!x.dataFim || x.dataFim >= v.data));
      return {
        data: new Date(`${v.data}T00:00:00`),
        cultura: culturas.find((c) => c.id === v.culturaId)?.nome || "",
        safra: safra ? (safra.dataFim ? `${formatDate(safra.dataInicio)} a ${formatDate(safra.dataFim)}` : `${formatDate(safra.dataInicio)} em andamento`) : "",
        quantidade: v.quantidade,
        unidade: v.unidade,
        valorTotal: v.valorTotal,
        canal: CANAL_LABELS[v.canal],
      };
    });

    ws.addTable({
      name: "TabelaVendas",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "Data", totalsRowLabel: "TOTAL" },
        { name: "Cultura" },
        { name: "Safra" },
        { name: "Quantidade" },
        { name: "Unidade" },
        { name: "Valor total (R$)", totalsRowFunction: "sum" },
        { name: "Canal" },
      ],
      rows: rows.map((r) => [r.data, r.cultura, r.safra, r.quantidade, r.unidade, r.valorTotal, r.canal]),
    });

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 14;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 16;
    ws.getColumn(7).width = 16;
    ws.getColumn(1).numFmt = "dd/mm/yyyy";
    ws.getColumn(4).numFmt = "#,##0.00";
    ws.getColumn(6).numFmt = "#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.eachRow((row) => {
      row.alignment = { vertical: "middle" };
    });

    await downloadWorkbook(workbook, "vendas-lancamentos.xlsx");
    toast.success("Vendas exportadas em XLSX!");
  };

  const runRelatorios = async () => {
    if (!periodoValido) {
      toast.error("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    if (!propriedadeAtivaId) return;
    const [despesas, vendas, culturas, safras] = await Promise.all([
      getDespesasByPropriedade(propriedadeAtivaId),
      getVendasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
    ]);
    return { despesas, vendas, culturas, safras };
  };

  const exportRelatorioFinanceiroPeriodo = async () => {
    const data = await runRelatorios();
    if (!data) return;
    const { despesas, vendas } = data;
    const fd = filterByDateRange(despesas, dataInicio, dataFim);
    const fv = filterByDateRange(vendas, dataInicio, dataFim);
    const { totalDespesas, totalVendas, saldo } = sumFinanceiro(fd, fv);
    const margem = margemSobreVendasPercent(totalVendas, totalDespesas);
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const wsResumo = workbook.addWorksheet("Resumo financeiro");
    wsResumo.addTable({
      name: "TabelaResumoFinanceiro",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "Data inicio" },
        { name: "Data fim" },
        { name: "Total despesas (R$)" },
        { name: "Total vendas / receita (R$)" },
        { name: "Saldo (R$)" },
        { name: "Margem sobre vendas (%)" },
      ],
      rows: [[new Date(`${dataInicio}T00:00:00`), new Date(`${dataFim}T00:00:00`), totalDespesas, totalVendas, saldo, margem ?? 0]],
    });
    wsResumo.getColumn(1).numFmt = "dd/mm/yyyy";
    wsResumo.getColumn(2).numFmt = "dd/mm/yyyy";
    wsResumo.getColumn(1).width = 14;
    wsResumo.getColumn(2).width = 14;
    wsResumo.getColumn(3).width = 22;
    wsResumo.getColumn(4).width = 28;
    wsResumo.getColumn(5).width = 14;
    wsResumo.getColumn(6).width = 20;
    wsResumo.getColumn(3).numFmt = "#,##0.00";
    wsResumo.getColumn(4).numFmt = "#,##0.00";
    wsResumo.getColumn(5).numFmt = "#,##0.00";
    wsResumo.getColumn(6).numFmt = "0.00";
    wsResumo.views = [{ state: "frozen", ySplit: 1 }];

    const centros = computeResumoPorCentroCusto(fd);
    const wsCentro = workbook.addWorksheet("Centros de custo");
    wsCentro.addTable({
      name: "TabelaCentroCusto",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "Centro de custo", totalsRowLabel: "TOTAL" },
        { name: "Valor (R$)", totalsRowFunction: "sum" },
        { name: "% do total de despesas" },
      ],
      rows: centros.map((c) => [c.label, c.total, Number(c.percentOfDespesas.toFixed(2))]),
    });
    wsCentro.getColumn(1).width = 24;
    wsCentro.getColumn(2).width = 16;
    wsCentro.getColumn(3).width = 24;
    wsCentro.getColumn(2).numFmt = "#,##0.00";
    wsCentro.getColumn(3).numFmt = "0.00";
    wsCentro.views = [{ state: "frozen", ySplit: 1 }];

    await downloadWorkbook(workbook, `relatorio-financeiro_${fileSuffixPeriodo(dataInicio, dataFim)}.xlsx`);
    toast.success("Relatório financeiro exportado em XLSX!");
  };

  const exportRelatorioPorCultura = async () => {
    const data = await runRelatorios();
    if (!data) return;
    const fd = filterByDateRange(data.despesas, dataInicio, dataFim);
    const fv = filterByDateRange(data.vendas, dataInicio, dataFim);
    const resumo = computeResumoPorCultura(data.culturas, fd, fv);
    if (resumo.length === 0) {
      toast.message("Nenhum movimento por cultura neste período.", { description: "O arquivo conterá apenas o cabeçalho." });
    }
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Relatorio por cultura");
    ws.addTable({
      name: "TabelaRelatorioCultura",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "ID cultura", totalsRowLabel: "TOTAL" },
        { name: "Cultura" },
        { name: "Despesas (R$)", totalsRowFunction: "sum" },
        { name: "Vendas (R$)", totalsRowFunction: "sum" },
        { name: "Saldo (R$)", totalsRowFunction: "sum" },
      ],
      rows: resumo.map((r) => [r.culturaId, r.nome, r.despesas, r.vendas, r.saldo]),
    });
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(3).numFmt = "#,##0.00";
    ws.getColumn(4).numFmt = "#,##0.00";
    ws.getColumn(5).numFmt = "#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 1 }];

    await downloadWorkbook(workbook, `relatorio-por-cultura_${fileSuffixPeriodo(dataInicio, dataFim)}.xlsx`);
    toast.success("Relatório por cultura exportado em XLSX!");
  };

  const exportRelatorioPorSafra = async () => {
    const data = await runRelatorios();
    if (!data) return;
    const { despesas, vendas, culturas, safras } = data;
    const hoje = today();
    const rows = safras.map((s) => {
      const { receita, custo, saldo } = calcularIndicadoresSafraNoPeriodo(s, despesas, vendas, dataInicio, dataFim, hoje);
      const nome = culturas.find((c) => c.id === s.culturaId)?.nome ?? "—";
      const periodoSafra = s.dataFim
        ? `${formatDate(s.dataInicio)} — ${formatDate(s.dataFim)}`
        : `${formatDate(s.dataInicio)} — em andamento`;
      return {
        safraId: s.id,
        cultura: nome,
        periodoSafra,
        receitaNoPeriodo: receita,
        custoNoPeriodo: custo,
        saldoNoPeriodo: saldo,
      };
    });
    if (rows.length === 0) {
      toast.message("Nenhuma safra cadastrada.", { description: "Cadastre safras para usar este relatório." });
    }
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Relatorio por safra");
    ws.addTable({
      name: "TabelaRelatorioSafra",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "ID safra", totalsRowLabel: "TOTAL" },
        { name: "Cultura" },
        { name: "Periodo da safra" },
        { name: "Receita no filtro (R$)", totalsRowFunction: "sum" },
        { name: "Custo no filtro (R$)", totalsRowFunction: "sum" },
        { name: "Saldo no filtro (R$)", totalsRowFunction: "sum" },
      ],
      rows: rows.map((r) => [r.safraId, r.cultura, r.periodoSafra, r.receitaNoPeriodo, r.custoNoPeriodo, r.saldoNoPeriodo]),
    });
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 30;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 20;
    ws.getColumn(6).width = 18;
    ws.getColumn(4).numFmt = "#,##0.00";
    ws.getColumn(5).numFmt = "#,##0.00";
    ws.getColumn(6).numFmt = "#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 1 }];

    await downloadWorkbook(workbook, `relatorio-por-safra_${fileSuffixPeriodo(dataInicio, dataFim)}.xlsx`);
    toast.success("Relatório por safra exportado em XLSX!");
  };

  const exportResumoMensal = async () => {
    const data = await runRelatorios();
    if (!data) return;
    const { despesas, vendas } = data;
    const mensal = computeResumoMensalLucroPrejuizo(despesas, vendas, dataInicio, dataFim);
    const ExcelJS = await import("exceljs");
    const { downloadWorkbook } = await import("@/lib/excel");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGestao";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Resumo mensal");
    ws.addTable({
      name: "TabelaResumoMensal",
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: "Mes (AAAA-MM)", totalsRowLabel: "TOTAL" },
        { name: "Mes" },
        { name: "Despesas (R$)", totalsRowFunction: "sum" },
        { name: "Vendas (R$)", totalsRowFunction: "sum" },
        { name: "Saldo lucro/prejuizo (R$)", totalsRowFunction: "sum" },
      ],
      rows: mensal.map((m) => [m.mesKey, m.mesLabel, m.totalDespesas, m.totalVendas, m.saldo]),
    });
    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 24;
    ws.getColumn(3).numFmt = "#,##0.00";
    ws.getColumn(4).numFmt = "#,##0.00";
    ws.getColumn(5).numFmt = "#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 1 }];

    await downloadWorkbook(workbook, `resumo-mensal-lucro-prejuizo_${fileSuffixPeriodo(dataInicio, dataFim)}.xlsx`);
    toast.success("Resumo mensal exportado em XLSX!");
  };

  const exportBackup = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, "agrogestao-backup.json", "application/json");
    toast.success("Backup criado!");
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!confirm("Isso substituirá todos os dados atuais. Continuar?")) return;
      await importAllData(parsed);
      toast.success("Dados restaurados com sucesso!");
      window.location.reload();
    } catch {
      toast.error("Erro ao ler o arquivo. Verifique se é um backup válido.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Exportar e relatórios">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Exportar e relatórios">
      <p className="text-sm text-muted-foreground mb-2 max-w-2xl">
        Relatórios e planilhas de lançamentos referem-se à propriedade ativa:{" "}
        <strong className="text-foreground">{propriedadeAtiva?.nomePropriedade ?? "—"}</strong>. Troque no menu lateral ou no
        cabeçalho.
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Gere relatórios em XLSX para planilhas e faça backup completo dos dados. Os relatórios consolidados usam o{" "}
        <strong>período</strong> abaixo; os arquivos de lançamento trazem o histórico desta propriedade.
      </p>

      <section className="rounded-xl border border-border bg-card p-4 md:p-5 mb-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="h-5 w-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold">Período dos relatórios consolidados</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Aplica-se a: resumo financeiro, por cultura, por safra e resumo mensal. Lançamentos detalhados (abaixo) cobrem a
          propriedade ativa.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-11" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-11" />
          </div>
        </div>
        {!periodoValido && <p className="text-xs text-destructive mt-2">Ajuste as datas para início ≤ fim.</p>}
      </section>

      <div className="space-y-8 max-w-2xl">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Relatórios consolidados (XLSX)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Valores filtrados pelo período acima. O relatório financeiro inclui totais e despesas por centro de custo.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto min-h-12 py-3 justify-start gap-3 text-left text-base"
              onClick={exportRelatorioFinanceiroPeriodo}
              disabled={!periodoValido}
            >
              <FileSpreadsheet className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-medium">Financeiro do período</span>
                <span className="block text-xs text-muted-foreground font-normal">Totais, saldo, margem e centros de custo</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-12 py-3 justify-start gap-3 text-left text-base"
              onClick={exportRelatorioPorCultura}
              disabled={!periodoValido}
            >
              <Leaf className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-medium">Por cultura</span>
                <span className="block text-xs text-muted-foreground font-normal">Despesas, vendas e saldo por cultura</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-12 py-3 justify-start gap-3 text-left text-base"
              onClick={exportRelatorioPorSafra}
              disabled={!periodoValido}
            >
              <Sprout className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-medium">Por safra</span>
                <span className="block text-xs text-muted-foreground font-normal">Receita, custo e saldo no período</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-12 py-3 justify-start gap-3 text-left text-base"
              onClick={exportResumoMensal}
              disabled={!periodoValido}
            >
              <Table2 className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-medium">Mensal — lucro e prejuízo</span>
                <span className="block text-xs text-muted-foreground font-normal">Cada mês com totais e saldo</span>
              </span>
            </Button>
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Lançamentos detalhados (completo)</h2>
          </div>
          <p className="text-sm text-muted-foreground">Todas as despesas e vendas cadastradas, sem filtro de data.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 justify-start gap-3 text-base" onClick={exportCSVDespesas}>
              <FileSpreadsheet className="h-5 w-5" /> Despesas
            </Button>
            <Button variant="outline" className="h-12 flex-1 justify-start gap-3 text-base" onClick={exportCSVVendas}>
              <FileSpreadsheet className="h-5 w-5" /> Vendas
            </Button>
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Backup completo</h2>
          </div>
          <p className="text-sm text-muted-foreground">Cópia de segurança em JSON (inclui culturas, safras, metas, etc.).</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 justify-start gap-3 text-base" onClick={exportBackup}>
              <Download className="h-5 w-5" /> Fazer backup (JSON)
            </Button>
            <Button variant="outline" className="h-12 flex-1 justify-start gap-3 text-base" onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5" /> Restaurar backup
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".json" onChange={importBackup} className="hidden" />
        </section>
      </div>
    </Layout>
  );
}
