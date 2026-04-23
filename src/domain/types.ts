/** Entidades e tipos do domínio (AgroGestão) */

export interface Propriedade {
  id: string;
  nomePropriedade: string;
  nomeProdutor: string;
  criadoEm: string;
  /** Reservado para encaixe com contas de usuário / sincronização no futuro */
  workspaceId?: string;
}

export interface Cultura {
  id: string;
  /** Faz parte do isolamento por propriedade (base para multiusuário) */
  propriedadeId: string;
  nome: string;
  unidadePadrao: "kg" | "saco" | "unidade" | "caixa";
}

export interface Safra {
  id: string;
  propriedadeId: string;
  culturaId: string;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
}

/** Etapas do calendário agrícola vinculadas a uma safra */
export type TipoEtapaSafra = "plantio" | "adubacao" | "irrigacao" | "aplicacao" | "colheita";

export interface EtapaCalendarioSafra {
  id: string;
  safraId: string;
  tipo: TipoEtapaSafra;
  /** Data prevista (YYYY-MM-DD) */
  dataPrevista: string;
  concluida: boolean;
  /** Data em que foi marcada como concluída (YYYY-MM-DD) */
  concluidaEm?: string;
  observacao?: string;
}

export type CategoriaDespesa =
  | "sementes"
  | "adubo"
  | "defensivo"
  | "combustivel"
  | "mao_de_obra"
  | "manutencao"
  | "outros";

/** Centro de custo — agrupamento para análise (plantio, irrigação, etc.) */
export type CentroCustoDespesa =
  | "plantio"
  | "irrigacao"
  | "mao_de_obra"
  | "transporte"
  | "insumos"
  | "manutencao";

export interface Despesa {
  id: string;
  propriedadeId: string;
  data: string;
  categoria: CategoriaDespesa;
  /** Se ausente (dados antigos), o app infere a partir da categoria */
  centroCusto?: CentroCustoDespesa;
  descricao: string;
  valor: number;
  culturaId?: string;
  safraId?: string;
}

export type CanalVenda = "feira" | "atravessador" | "cooperativa" | "outros";

export interface Venda {
  id: string;
  propriedadeId: string;
  data: string;
  culturaId: string;
  quantidade: number;
  unidade: string;
  valorTotal: number;
  canal: CanalVenda;
}

export type CategoriaInsumo =
  | "sementes"
  | "fertilizantes"
  | "defensivos"
  | "combustivel"
  | "ferramentas"
  | "embalagens"
  | "outros";

export type UnidadeInsumo = "kg" | "L" | "ml" | "unidade" | "saco" | "tonelada" | "ha";

/** Metas de desempenho por cultura ou por safra */
export type EscopoMeta = "cultura" | "safra";

export interface Meta {
  id: string;
  escopo: EscopoMeta;
  culturaId?: string;
  safraId?: string;
  /** Meta de faturamento (R$) — vendas no período */
  metaFaturamento?: number;
  /** Teto de gastos (R$) — despesas no período */
  limiteGasto?: number;
  /** Meta de quantidade vendida (soma das quantidades das vendas) */
  metaQuantidadeVendida?: number;
}

/** Item de estoque de insumos */
export interface Insumo {
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeInsumo;
  quantidadeAtual: number;
  /** Alerta quando quantidade atual for menor ou igual a este valor */
  alertaEstoqueBaixo: number;
}
