import { describe, it, expect } from "vitest";
import { previousPeriodRange, mesAnterior, rangeMesCalendario } from "./comparisons";

describe("comparisons", () => {
  it("previousPeriodRange retorna o bloco de dias imediatamente anterior", () => {
    const p = previousPeriodRange("2025-01-01", "2025-01-31");
    expect(p).toEqual({ inicio: "2024-12-01", fim: "2024-12-31" });
  });

  it("mesAnterior e rangeMesCalendario", () => {
    expect(mesAnterior("2025-03")).toBe("2025-02");
    const r = rangeMesCalendario("2025-02");
    expect(r.inicio).toBe("2025-02-01");
    expect(r.fim).toBe("2025-02-28");
  });
});
