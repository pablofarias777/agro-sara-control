/**
 * Copia dados de um arquivo SQLite antigo (Prisma sqlite) para o MySQL configurado em DATABASE_URL.
 * Pré-requisitos: DATABASE_URL apontando para MySQL e tabelas já criadas (`npm run migrate:deploy`).
 * Uso:
 *   SQLITE_DATABASE_PATH=./dev.db npm run migrate:sqlite-to-mysql
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  type CanalVenda,
  type CategoriaDespesa,
  type UnidadePadrao,
} from "@prisma/client";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");

function resolveSqlitePath(): string {
  const fromEnv = process.env.SQLITE_DATABASE_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [join(backendRoot, "dev.db"), join(backendRoot, "prisma", "dev.db")];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Arquivo SQLite não encontrado. Defina SQLITE_DATABASE_PATH ou coloque dev.db em ${backendRoot}.`,
  );
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  throw new Error(`Valor de data inválido: ${String(value)}`);
}

function mustBeMysql(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("mysql:")) {
    throw new Error(
      "DATABASE_URL deve ser MySQL (ex.: mysql://usuario:senha@127.0.0.1:3306/agro_sara). defina antes de rodar este script.",
    );
  }
}

async function main(): Promise<void> {
  mustBeMysql();

  const sqlitePath = resolveSqlitePath();
  console.log(`Lendo SQLite em modo somente leitura: ${sqlitePath}`);

  const sq = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const prisma = new PrismaClient();

  try {
    await prisma.$transaction(async (tx) => {
      const users = sq.prepare("SELECT * FROM User").all() as Record<string, unknown>[];
      if (users.length) {
        await tx.user.createMany({
          data: users.map((r) => ({
            id: String(r.id),
            email: String(r.email),
            passwordHash: String(r.passwordHash),
            nome: r.nome != null ? String(r.nome) : null,
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      const propriedades = sq.prepare("SELECT * FROM Propriedade").all() as Record<string, unknown>[];
      if (propriedades.length) {
        await tx.propriedade.createMany({
          data: propriedades.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            nomePropriedade: String(r.nomePropriedade),
            nomeProdutor: String(r.nomeProdutor),
            criadoEm: String(r.criadoEm),
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      const culturas = sq.prepare("SELECT * FROM Cultura").all() as Record<string, unknown>[];
      if (culturas.length) {
        await tx.cultura.createMany({
          data: culturas.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            nome: String(r.nome),
            unidadePadrao: String(r.unidadePadrao) as UnidadePadrao,
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      const safras = sq.prepare("SELECT * FROM Safra").all() as Record<string, unknown>[];
      if (safras.length) {
        await tx.safra.createMany({
          data: safras.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            culturaId: String(r.culturaId),
            dataInicio: String(r.dataInicio),
            dataFim: r.dataFim != null ? String(r.dataFim) : null,
            observacoes: r.observacoes != null ? String(r.observacoes) : null,
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      const despesas = sq.prepare("SELECT * FROM Despesa").all() as Record<string, unknown>[];
      if (despesas.length) {
        await tx.despesa.createMany({
          data: despesas.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            data: String(r.data),
            categoria: String(r.categoria) as CategoriaDespesa,
            descricao: String(r.descricao),
            valor: Number(r.valor),
            culturaId: r.culturaId != null ? String(r.culturaId) : null,
            safraId: r.safraId != null ? String(r.safraId) : null,
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      const vendas = sq.prepare("SELECT * FROM Venda").all() as Record<string, unknown>[];
      if (vendas.length) {
        await tx.venda.createMany({
          data: vendas.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            data: String(r.data),
            culturaId: String(r.culturaId),
            quantidade: Number(r.quantidade),
            unidade: String(r.unidade),
            valorTotal: Number(r.valorTotal),
            canal: String(r.canal) as CanalVenda,
            createdAt: parseDate(r.createdAt),
            updatedAt: parseDate(r.updatedAt),
          })),
          skipDuplicates: true,
        });
      }

      console.log(
        `Importados: User=${users.length}, Propriedade=${propriedades.length}, Cultura=${culturas.length}, Safra=${safras.length}, Despesa=${despesas.length}, Venda=${vendas.length}`,
      );
    });
  } finally {
    sq.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
