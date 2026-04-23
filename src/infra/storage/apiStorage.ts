/**
 * Persistência via API Fastify + MySQL (substitui IndexedDB).
 */
import type {
  Cultura,
  Despesa,
  EtapaCalendarioSafra,
  Insumo,
  Meta,
  Propriedade,
  Safra,
  Venda,
} from "@/domain/types";
import { createId } from "@/lib/id";
import { apiFetch, clearAuthStorage } from "@/infra/api/client";

export async function deleteAgroDatabaseLocal(): Promise<void> {
  clearAuthStorage();
}

type ApiPropriedade = Propriedade & { userId?: string };
type ApiCultura = Cultura & { userId?: string };
type ApiSafra = Omit<Safra, "propriedadeId"> & { userId?: string };
type ApiDespesa = Omit<Despesa, "propriedadeId" | "centroCusto"> & {
  userId?: string;
  /** Quando a API ainda não enviava o campo, inferimos por cultura/safra. */
  propriedadeId?: string;
  centroCusto?: Despesa["centroCusto"];
};
type ApiVenda = Omit<Venda, "propriedadeId"> & { userId?: string };

function stripUser<T extends Record<string, unknown>>(row: T): T {
  const { userId: _u, createdAt: _c, updatedAt: _up, ...rest } = row as T & {
    userId?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  return rest as T;
}

async function culturaIndex(): Promise<Map<string, Pick<Cultura, "propriedadeId">>> {
  const { culturas } = await apiFetch<{ culturas: ApiCultura[] }>("/culturas");
  const m = new Map<string, Pick<Cultura, "propriedadeId">>();
  for (const c of culturas) {
    m.set(c.id, { propriedadeId: c.propriedadeId });
  }
  return m;
}

async function safraById(): Promise<Map<string, ApiSafra>> {
  const { safras } = await apiFetch<{ safras: ApiSafra[] }>("/safras");
  const m = new Map<string, ApiSafra>();
  for (const s of safras) m.set(s.id, s);
  return m;
}

function inferPropriedadeDespesa(
  d: ApiDespesa,
  cultMap: Map<string, Pick<Cultura, "propriedadeId">>,
  safraMap: Map<string, ApiSafra>
): string {
  if (d.culturaId) return cultMap.get(d.culturaId)?.propriedadeId ?? "";
  if (d.safraId) {
    const s = safraMap.get(d.safraId);
    if (!s) return "";
    return cultMap.get(s.culturaId)?.propriedadeId ?? "";
  }
  return "";
}

function inferPropriedadeVenda(
  v: ApiVenda,
  cultMap: Map<string, Pick<Cultura, "propriedadeId">>
): string {
  return cultMap.get(v.culturaId)?.propriedadeId ?? "";
}

function mapDespesa(row: ApiDespesa, cultMap: Map<string, Pick<Cultura, "propriedadeId">>, safraMap: Map<string, ApiSafra>): Despesa {
  const o = stripUser(row as unknown as Record<string, unknown>) as unknown as ApiDespesa;
  const inferida = inferPropriedadeDespesa(o, cultMap, safraMap);
  const base: Despesa = {
    id: o.id,
    propriedadeId: o.propriedadeId && o.propriedadeId.length > 0 ? o.propriedadeId : inferida,
    data: o.data,
    categoria: o.categoria,
    descricao: o.descricao,
    valor: o.valor,
    culturaId: o.culturaId,
    safraId: o.safraId,
  };
  if (o.centroCusto != null) (base as Despesa).centroCusto = o.centroCusto as Despesa["centroCusto"];
  return base;
}

function mapVenda(row: ApiVenda, cultMap: Map<string, Pick<Cultura, "propriedadeId">>): Venda {
  const o = stripUser(row as unknown as Record<string, unknown>) as unknown as ApiVenda;
  return {
    id: o.id,
    propriedadeId: inferPropriedadeVenda(o, cultMap),
    data: o.data,
    culturaId: o.culturaId,
    quantidade: o.quantidade,
    unidade: o.unidade,
    valorTotal: o.valorTotal,
    canal: o.canal,
  };
}

function mapSafra(row: ApiSafra, cultMap: Map<string, Pick<Cultura, "propriedadeId">>): Safra {
  const o = stripUser(row as unknown as Record<string, unknown>) as unknown as ApiSafra;
  return {
    ...o,
    propriedadeId: cultMap.get(o.culturaId)?.propriedadeId ?? "",
  };
}

export async function getPropriedades(): Promise<Propriedade[]> {
  const { propriedades } = await apiFetch<{ propriedades: ApiPropriedade[] }>("/propriedades");
  return propriedades.map((p) => stripUser(p as unknown as Record<string, unknown>) as ApiPropriedade) as Propriedade[];
}

export async function getPropriedade(): Promise<Propriedade | undefined> {
  const list = await getPropriedades();
  return list[0];
}

export async function getPropriedadeById(id: string): Promise<Propriedade | undefined> {
  const list = await getPropriedades();
  return list.find((p) => p.id === id);
}

export async function savePropriedade(p: Propriedade): Promise<void> {
  await apiFetch("/propriedade", {
    method: "PUT",
    body: JSON.stringify({
      id: p.id,
      nomePropriedade: p.nomePropriedade,
      nomeProdutor: p.nomeProdutor,
      criadoEm: p.criadoEm,
    }),
  });
}

export async function deletePropriedade(id: string): Promise<"ok" | "tem-dados"> {
  try {
    await apiFetch(`/propriedades/${encodeURIComponent(id)}`, { method: "DELETE" });
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("culturas") || msg.includes("400")) return "tem-dados";
    throw e;
  }
}

export async function getCulturas(): Promise<Cultura[]> {
  const { culturas } = await apiFetch<{ culturas: ApiCultura[] }>("/culturas");
  return culturas.map((c) => stripUser(c as unknown as Record<string, unknown>) as Cultura);
}

export async function getCulturasByPropriedade(propriedadeId: string): Promise<Cultura[]> {
  const { culturas } = await apiFetch<{ culturas: ApiCultura[] }>(
    `/culturas?propriedadeId=${encodeURIComponent(propriedadeId)}`
  );
  return culturas.map((c) => stripUser(c as unknown as Record<string, unknown>) as Cultura);
}

export async function saveCultura(c: Cultura): Promise<void> {
  const body = {
    id: c.id,
    propriedadeId: c.propriedadeId,
    nome: c.nome,
    unidadePadrao: c.unidadePadrao,
  };
  const existing = await getCulturas();
  const isNew = !existing.some((x) => x.id === c.id);
  if (isNew) {
    await apiFetch("/culturas", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/culturas/${encodeURIComponent(c.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteCultura(id: string): Promise<void> {
  await apiFetch(`/culturas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSafras(): Promise<Safra[]> {
  const [{ safras }, cultMap] = await Promise.all([
    apiFetch<{ safras: ApiSafra[] }>("/safras"),
    culturaIndex(),
  ]);
  return safras.map((s) => mapSafra(s, cultMap));
}

export async function getSafrasByPropriedade(propriedadeId: string): Promise<Safra[]> {
  const culturas = await getCulturasByPropriedade(propriedadeId);
  const ids = new Set(culturas.map((c) => c.id));
  const all = await getSafras();
  return all.filter((s) => ids.has(s.culturaId));
}

export async function getSafrasByCultura(culturaId: string): Promise<Safra[]> {
  const { safras } = await apiFetch<{ safras: ApiSafra[] }>(
    `/safras?culturaId=${encodeURIComponent(culturaId)}`
  );
  const cultMap = await culturaIndex();
  return safras.map((s) => mapSafra(s, cultMap));
}

export async function saveSafra(s: Safra): Promise<void> {
  const body = {
    id: s.id,
    culturaId: s.culturaId,
    dataInicio: s.dataInicio,
    dataFim: s.dataFim,
    observacoes: s.observacoes,
  };
  const all = await getSafras();
  const isNew = !all.some((x) => x.id === s.id);
  if (isNew) {
    await apiFetch("/safras", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/safras/${encodeURIComponent(s.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteSafra(id: string): Promise<void> {
  await apiFetch(`/safras/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getEtapasBySafra(safraId: string): Promise<EtapaCalendarioSafra[]> {
  const { etapas } = await apiFetch<{ etapas: EtapaCalendarioSafra[] }>(
    `/etapas-safra?safraId=${encodeURIComponent(safraId)}`
  );
  return etapas.map((e) => ({
    id: e.id,
    safraId: e.safraId,
    tipo: e.tipo,
    dataPrevista: e.dataPrevista,
    concluida: e.concluida,
    concluidaEm: e.concluidaEm ?? undefined,
    observacao: e.observacao ?? undefined,
  }));
}

export async function getAllEtapasSafra(): Promise<EtapaCalendarioSafra[]> {
  const { etapas } = await apiFetch<{ etapas: EtapaCalendarioSafra[] }>("/etapas-safra");
  return etapas.map((e) => ({
    id: e.id,
    safraId: e.safraId,
    tipo: e.tipo,
    dataPrevista: e.dataPrevista,
    concluida: e.concluida,
    concluidaEm: e.concluidaEm ?? undefined,
    observacao: e.observacao ?? undefined,
  }));
}

export async function saveEtapaSafra(e: EtapaCalendarioSafra): Promise<void> {
  const body = {
    id: e.id,
    safraId: e.safraId,
    tipo: e.tipo,
    dataPrevista: e.dataPrevista,
    concluida: e.concluida,
    concluidaEm: e.concluidaEm,
    observacao: e.observacao,
  };
  const existing = await getAllEtapasSafra();
  const isNew = !existing.some((x) => x.id === e.id);
  if (isNew) {
    await apiFetch("/etapas-safra", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/etapas-safra/${encodeURIComponent(e.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteEtapaSafra(id: string): Promise<void> {
  await apiFetch(`/etapas-safra/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getDespesas(): Promise<Despesa[]> {
  const [{ despesas }, cultMap, safraMap] = await Promise.all([
    apiFetch<{ despesas: ApiDespesa[] }>("/despesas"),
    culturaIndex(),
    safraById(),
  ]);
  return despesas.map((d) => mapDespesa(d, cultMap, safraMap));
}

export async function getDespesasByPropriedade(propriedadeId: string): Promise<Despesa[]> {
  const all = await getDespesas();
  return all.filter((d) => d.propriedadeId === propriedadeId);
}

export async function saveDespesa(d: Despesa): Promise<void> {
  const body: Record<string, unknown> = {
    id: d.id,
    propriedadeId: d.propriedadeId,
    data: d.data,
    categoria: d.categoria,
    descricao: d.descricao,
    valor: d.valor,
    culturaId: d.culturaId,
    safraId: d.safraId,
  };
  if (d.centroCusto != null) body.centroCusto = d.centroCusto;

  const all = await getDespesas();
  const isNew = !all.some((x) => x.id === d.id);
  if (isNew) {
    await apiFetch("/despesas", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/despesas/${encodeURIComponent(d.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteDespesa(id: string): Promise<void> {
  await apiFetch(`/despesas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getVendas(): Promise<Venda[]> {
  const [{ vendas }, cultMap] = await Promise.all([apiFetch<{ vendas: ApiVenda[] }>("/vendas"), culturaIndex()]);
  return vendas.map((v) => mapVenda(v, cultMap));
}

export async function getVendasByPropriedade(propriedadeId: string): Promise<Venda[]> {
  const all = await getVendas();
  return all.filter((v) => v.propriedadeId === propriedadeId);
}

export async function saveVenda(v: Venda): Promise<void> {
  const body = {
    id: v.id,
    data: v.data,
    culturaId: v.culturaId,
    quantidade: v.quantidade,
    unidade: v.unidade,
    valorTotal: v.valorTotal,
    canal: v.canal,
  };
  const all = await getVendas();
  const isNew = !all.some((x) => x.id === v.id);
  if (isNew) {
    await apiFetch("/vendas", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/vendas/${encodeURIComponent(v.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteVenda(id: string): Promise<void> {
  await apiFetch(`/vendas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getInsumos(): Promise<Insumo[]> {
  const { insumos } = await apiFetch<{ insumos: Insumo[] }>("/insumos");
  return insumos.map((i) => stripUser(i as unknown as Record<string, unknown>) as Insumo);
}

export async function saveInsumo(i: Insumo): Promise<void> {
  const body = {
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    unidade: i.unidade,
    quantidadeAtual: i.quantidadeAtual,
    alertaEstoqueBaixo: i.alertaEstoqueBaixo,
  };
  const all = await getInsumos();
  const isNew = !all.some((x) => x.id === i.id);
  if (isNew) {
    await apiFetch("/insumos", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/insumos/${encodeURIComponent(i.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteInsumo(id: string): Promise<void> {
  await apiFetch(`/insumos/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getMetas(): Promise<Meta[]> {
  const { metas } = await apiFetch<{ metas: Meta[] }>("/metas");
  return metas.map((m) => stripUser(m as unknown as Record<string, unknown>) as Meta);
}

export async function saveMeta(m: Meta): Promise<void> {
  const body: Record<string, unknown> = {
    id: m.id,
    escopo: m.escopo,
    culturaId: m.culturaId,
    safraId: m.safraId,
    metaFaturamento: m.metaFaturamento,
    limiteGasto: m.limiteGasto,
    metaQuantidadeVendida: m.metaQuantidadeVendida,
  };
  const all = await getMetas();
  const isNew = !all.some((x) => x.id === m.id);
  if (isNew) {
    await apiFetch("/metas", { method: "POST", body: JSON.stringify(body) });
  } else {
    await apiFetch(`/metas/${encodeURIComponent(m.id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

export async function deleteMeta(id: string): Promise<void> {
  await apiFetch(`/metas/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function exportAllData() {
  return apiFetch<
    Record<string, unknown> & {
      propriedade: Propriedade[];
      culturas: Cultura[];
      safras: Safra[];
      despesas: Despesa[];
      vendas: Venda[];
      insumos: Insumo[];
      metas: Meta[];
      etapasSafra: EtapaCalendarioSafra[];
    }
  >("/export");
}

export async function importAllData(data: {
  propriedade?: Propriedade[];
  culturas?: Cultura[];
  safras?: Safra[];
  despesas?: Despesa[];
  vendas?: Venda[];
  etapasSafra?: EtapaCalendarioSafra[];
  insumos?: Insumo[];
  metas?: Meta[];
}): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.propriedade) {
    payload.propriedade = data.propriedade.map((p) => ({
      id: p.id,
      nomePropriedade: p.nomePropriedade,
      nomeProdutor: p.nomeProdutor,
      criadoEm: p.criadoEm,
    }));
  }
  if (data.culturas) {
    payload.culturas = data.culturas.map((c) => ({
      id: c.id,
      propriedadeId: c.propriedadeId,
      nome: c.nome,
      unidadePadrao: c.unidadePadrao,
    }));
  }
  if (data.safras) {
    payload.safras = data.safras.map((s) => ({
      id: s.id,
      culturaId: s.culturaId,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      observacoes: s.observacoes,
    }));
  }
  if (data.despesas) {
    payload.despesas = data.despesas.map((d) => ({
      id: d.id,
      propriedadeId: d.propriedadeId,
      data: d.data,
      categoria: d.categoria,
      centroCusto: d.centroCusto,
      descricao: d.descricao,
      valor: d.valor,
      culturaId: d.culturaId,
      safraId: d.safraId,
    }));
  }
  if (data.vendas) {
    payload.vendas = data.vendas.map((v) => ({
      id: v.id,
      data: v.data,
      culturaId: v.culturaId,
      quantidade: v.quantidade,
      unidade: v.unidade,
      valorTotal: v.valorTotal,
      canal: v.canal,
    }));
  }
  if (data.insumos) {
    payload.insumos = data.insumos.map((i) => ({
      id: i.id,
      nome: i.nome,
      categoria: i.categoria,
      unidade: i.unidade,
      quantidadeAtual: i.quantidadeAtual,
      alertaEstoqueBaixo: i.alertaEstoqueBaixo,
    }));
  }
  if (data.metas) {
    payload.metas = data.metas.map((m) => ({
      id: m.id,
      escopo: m.escopo,
      culturaId: m.culturaId,
      safraId: m.safraId,
      metaFaturamento: m.metaFaturamento,
      limiteGasto: m.limiteGasto,
      metaQuantidadeVendida: m.metaQuantidadeVendida,
    }));
  }
  if (data.etapasSafra) {
    payload.etapasSafra = data.etapasSafra.map((e) => ({
      id: e.id,
      safraId: e.safraId,
      tipo: e.tipo,
      dataPrevista: e.dataPrevista,
      concluida: e.concluida,
      concluidaEm: e.concluidaEm,
      observacao: e.observacao,
    }));
  }
  await apiFetch("/import", { method: "POST", body: JSON.stringify(payload) });
}
