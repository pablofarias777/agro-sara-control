import type {
  CanalVenda,
  CategoriaDespesa,
  CentroCustoDespesa,
  CategoriaInsumo,
  Cultura,
  TipoEtapaSafra,
  UnidadeInsumo,
} from "./types";

export const CATEGORIA_LABELS: Record<CategoriaDespesa, string> = {
  sementes: "Sementes",
  adubo: "Adubo",
  defensivo: "Defensivo",
  combustivel: "Combustível",
  mao_de_obra: "Mão de Obra",
  manutencao: "Manutenção",
  outros: "Outros",
};

/** Ordem estável para listagens e gráficos */
export const CENTRO_CUSTO_ORDER: CentroCustoDespesa[] = [
  "plantio",
  "irrigacao",
  "mao_de_obra",
  "transporte",
  "insumos",
  "manutencao",
];

export const CENTRO_CUSTO_LABELS: Record<CentroCustoDespesa, string> = {
  plantio: "Plantio",
  irrigacao: "Irrigação",
  mao_de_obra: "Mão de obra",
  transporte: "Transporte",
  insumos: "Insumos",
  manutencao: "Manutenção",
};

export const CANAL_LABELS: Record<CanalVenda, string> = {
  feira: "Feira",
  atravessador: "Atravessador",
  cooperativa: "Cooperativa",
  outros: "Outros",
};

export const UNIDADE_LABELS: Record<Cultura["unidadePadrao"], string> = {
  kg: "Quilograma (kg)",
  saco: "Saco",
  unidade: "Unidade",
  caixa: "Caixa",
};

export const ETAPA_SAFRA_LABELS: Record<TipoEtapaSafra, string> = {
  plantio: "Plantio",
  adubacao: "Adubação",
  irrigacao: "Irrigação",
  aplicacao: "Aplicação",
  colheita: "Colheita",
};

export const CATEGORIA_INSUMO_LABELS: Record<CategoriaInsumo, string> = {
  sementes: "Sementes",
  fertilizantes: "Fertilizantes / adubo",
  defensivos: "Defensivos",
  combustivel: "Combustível",
  ferramentas: "Ferramentas",
  embalagens: "Embalagens",
  outros: "Outros",
};

export const UNIDADE_INSUMO_LABELS: Record<UnidadeInsumo, string> = {
  kg: "Quilograma (kg)",
  L: "Litro (L)",
  ml: "Mililitro (ml)",
  unidade: "Unidade",
  saco: "Saco",
  tonelada: "Tonelada (t)",
  ha: "Hectare (ha)",
};
