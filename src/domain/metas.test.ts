import { describe, it, expect } from "vitest";
import { computeProgressosMetas, periodoEfetivoMeta } from "./metas";
import type { Cultura, Despesa, Meta, Safra, Venda } from "./types";

describe("metas", () => {
  it("periodoEfetivoMeta cultura usa o filtro do dashboard", () => {
    const meta: Meta = { id: "1", escopo: "cultura", culturaId: "c1", metaFaturamento: 100 };
    expect(periodoEfetivoMeta(meta, undefined, "2025-01-01", "2025-01-31", "2025-01-15")).toEqual({
      start: "2025-01-01",
      end: "2025-01-31",
    });
  });

  it("computeProgressosMetas calcula faturamento e quantidade na cultura", () => {
    const meta: Meta = {
      id: "m1",
      escopo: "cultura",
      culturaId: "c1",
      metaFaturamento: 1000,
      metaQuantidadeVendida: 100,
    };
    const culturas: Cultura[] = [{ id: "c1", propriedadeId: "p1", nome: "Milho", unidadePadrao: "kg" }];
    const vendas: Venda[] = [
      {
        id: "v1",
        propriedadeId: "p1",
        data: "2025-01-10",
        culturaId: "c1",
        quantidade: 40,
        unidade: "kg",
        valorTotal: 400,
        canal: "feira",
      },
    ];
    const [row] = computeProgressosMetas(
      [meta],
      culturas,
      [],
      [],
      vendas,
      "2025-01-01",
      "2025-01-31",
      "2025-01-20"
    );
    expect(row.faturamento?.atual).toBe(400);
    expect(row.faturamento?.pctBar).toBeCloseTo(40, 5);
    expect(row.quantidade?.atual).toBe(40);
    expect(row.quantidade?.pctBar).toBe(40);
  });

  it("limite de gasto marca excedeu", () => {
    const meta: Meta = { id: "m1", escopo: "cultura", culturaId: "c1", limiteGasto: 100 };
    const culturas: Cultura[] = [{ id: "c1", propriedadeId: "p1", nome: "Milho", unidadePadrao: "kg" }];
    const despesas: Despesa[] = [
      {
        id: "d1",
        propriedadeId: "p1",
        data: "2025-01-05",
        categoria: "outros",
        descricao: "x",
        valor: 150,
        culturaId: "c1",
      },
    ];
    const [row] = computeProgressosMetas(
      [meta],
      culturas,
      [],
      despesas,
      [],
      "2025-01-01",
      "2025-01-31",
      "2025-01-20"
    );
    expect(row.gasto?.excedeu).toBe(true);
    expect(row.gasto?.atual).toBe(150);
  });
});
