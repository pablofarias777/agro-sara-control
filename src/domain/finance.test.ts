import { describe, it, expect } from "vitest";
import {
  filterByDateRange,
  computeResumoPorCultura,
  computeResumoPorCentroCusto,
  computeResumoMensalLucroPrejuizo,
  sumFinanceiro,
  calcularIndicadoresSafra,
  calcularIndicadoresSafraNoPeriodo,
  getCentroCustoEfetivo,
} from "./finance";
import type { Safra } from "./types";
import type { Cultura, Despesa, Venda } from "./types";

describe("finance", () => {
  it("filterByDateRange inclui apenas datas no intervalo", () => {
    const rows = [
      { data: "2025-01-01", id: "1" },
      { data: "2025-02-15", id: "2" },
      { data: "2025-03-01", id: "3" },
    ];
    expect(filterByDateRange(rows, "2025-02-01", "2025-02-28")).toEqual([{ data: "2025-02-15", id: "2" }]);
  });

  it("sumFinanceiro calcula totais e saldo", () => {
    const despesas: Despesa[] = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-01-01",
        categoria: "outros",
        descricao: "x",
        valor: 100,
      },
    ];
    const vendas: Venda[] = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-01-01",
        culturaId: "c1",
        quantidade: 1,
        unidade: "kg",
        valorTotal: 250,
        canal: "feira",
      },
    ];
    expect(sumFinanceiro(despesas, vendas)).toEqual({
      totalDespesas: 100,
      totalVendas: 250,
      saldo: 150,
    });
  });

  it("computeResumoPorCultura agrega por cultura", () => {
    const culturas: Cultura[] = [
      { id: "c1", propriedadeId: "p1", nome: "Milho", unidadePadrao: "kg" },
      { id: "c2", propriedadeId: "p1", nome: "Soja", unidadePadrao: "saco" },
    ];
    const despesas: Despesa[] = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-01-01",
        categoria: "adubo",
        descricao: "a",
        valor: 50,
        culturaId: "c1",
      },
    ];
    const vendas: Venda[] = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-01-01",
        culturaId: "c1",
        quantidade: 10,
        unidade: "kg",
        valorTotal: 200,
        canal: "feira",
      },
    ];
    const resumo = computeResumoPorCultura(culturas, despesas, vendas);
    expect(resumo).toHaveLength(1);
    expect(resumo[0]).toMatchObject({
      culturaId: "c1",
      nome: "Milho",
      despesas: 50,
      vendas: 200,
      saldo: 150,
      despesasPorCentro: [{ centro: "insumos", total: 50 }],
    });
  });

  it("getCentroCustoEfetivo usa cadastro ou infere da categoria", () => {
    expect(
      getCentroCustoEfetivo({
        id: "1",
        propriedadeId: "p1",
        data: "2025-01-01",
        categoria: "adubo",
        descricao: "x",
        valor: 1,
        centroCusto: "irrigacao",
      })
    ).toBe("irrigacao");
    expect(
      getCentroCustoEfetivo({
        id: "2",
        propriedadeId: "p1",
        data: "2025-01-01",
        categoria: "combustivel",
        descricao: "x",
        valor: 1,
      })
    ).toBe("transporte");
  });

  it("computeResumoPorCentroCusto agrega e calcula percentuais", () => {
    const despesas: Despesa[] = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-01-01",
        categoria: "outros",
        descricao: "a",
        valor: 60,
        centroCusto: "plantio",
      },
      {
        id: "d2",
        propriedadeId: "p1",
        data: "2025-01-02",
        categoria: "outros",
        descricao: "b",
        valor: 40,
        centroCusto: "insumos",
      },
    ];
    const r = computeResumoPorCentroCusto(despesas);
    expect(r).toHaveLength(2);
    const plantio = r.find((x) => x.centro === "plantio");
    const insumos = r.find((x) => x.centro === "insumos");
    expect(plantio?.total).toBe(60);
    expect(plantio?.percentOfDespesas).toBeCloseTo(60, 5);
    expect(insumos?.total).toBe(40);
    expect(insumos?.percentOfDespesas).toBeCloseTo(40, 5);
  });

  it("calcularIndicadoresSafra soma receita no período e custo por safraId", () => {
    const safra: Safra = {
      id: "s1",
      propriedadeId: "p1",
      culturaId: "c1",
      dataInicio: "2025-01-01",
      dataFim: "2025-01-31",
    };
    const despesas = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-01-10",
        categoria: "outros" as const,
        descricao: "x",
        valor: 40,
        safraId: "s1",
      },
      {
        id: "d2",
        propriedadeId: "p1",
        data: "2025-01-11",
        categoria: "outros" as const,
        descricao: "y",
        valor: 10,
        culturaId: "c1",
      },
    ];
    const vendas = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-01-15",
        culturaId: "c1",
        quantidade: 1,
        unidade: "kg",
        valorTotal: 200,
        canal: "feira" as const,
      },
    ];
    const ind = calcularIndicadoresSafra(safra, despesas, vendas, "2025-01-20");
    expect(ind).toEqual({ receita: 200, custo: 40, saldo: 160 });
  });

  it("computeResumoMensalLucroPrejuizo agrega por mês", () => {
    const despesas: Despesa[] = [
      { id: "d1", propriedadeId: "p1", data: "2025-01-10", categoria: "outros", descricao: "a", valor: 100 },
    ];
    const vendas: Venda[] = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-01-20",
        culturaId: "c1",
        quantidade: 1,
        unidade: "kg",
        valorTotal: 300,
        canal: "feira",
      },
    ];
    const rows = computeResumoMensalLucroPrejuizo(despesas, vendas, "2025-01-01", "2025-01-31");
    const jan = rows.find((r) => r.mesKey === "2025-01");
    expect(jan?.totalDespesas).toBe(100);
    expect(jan?.totalVendas).toBe(300);
    expect(jan?.saldo).toBe(200);
  });

  it("calcularIndicadoresSafraNoPeriodo restringe ao intervalo", () => {
    const safra: Safra = {
      id: "s1",
      propriedadeId: "p1",
      culturaId: "c1",
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    };
    const vendas: Venda[] = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-06-15",
        culturaId: "c1",
        quantidade: 1,
        unidade: "kg",
        valorTotal: 500,
        canal: "feira",
      },
    ];
    const despesas: Despesa[] = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-06-01",
        categoria: "outros",
        descricao: "x",
        valor: 100,
        safraId: "s1",
      },
    ];
    const ind = calcularIndicadoresSafraNoPeriodo(safra, despesas, vendas, "2025-06-01", "2025-06-30", "2025-06-15");
    expect(ind.receita).toBe(500);
    expect(ind.custo).toBe(100);
  });
});
