import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { env } from "./env.js";

function toZodError(err: unknown) {
  if (!(err instanceof z.ZodError)) return null;
  return {
    message: "Dados inválidos",
    issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function buildServer() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err: any, _req, reply) => {
    const zod = toZodError(err);
    if (zod) return reply.status(400).send(zod);
    if (err?.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
      return reply.status(401).send({ message: "Token expirado" });
    }
    app.log.error(err);
    return reply.status(500).send({ message: "Erro interno" });
  });

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = env.FRONTEND_ORIGIN ? [env.FRONTEND_ORIGIN] : true;
      if (allowed === true || (Array.isArray(allowed) && allowed.includes(origin))) return cb(null, true);
      return cb(new Error("Origin não permitida"), false);
    },
    credentials: true,
  });

  app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: "Não autenticado" });
    }
  });

  app.get("/health", async () => ({ ok: true }));

  const RegisterBody = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    nome: z.string().min(1).optional(),
  });
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterBody.parse((req as any).body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.status(409).send({ message: "Email já cadastrado" });
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, nome: body.nome },
      select: { id: true, email: true, nome: true },
    });
    const token = (app as any).jwt.sign({ sub: user.id });
    return reply.send({ token, user });
  });

  const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });
  app.post("/auth/login", async (req, reply) => {
    const body = LoginBody.parse((req as any).body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.status(401).send({ message: "Credenciais inválidas" });
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return reply.status(401).send({ message: "Credenciais inválidas" });
    const token = (app as any).jwt.sign({ sub: user.id });
    return reply.send({ token, user: { id: user.id, email: user.email, nome: user.nome } });
  });

  app.get("/me", { preHandler: (app as any).authenticate }, async (req: any) => {
    const userId = req.user.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nome: true, createdAt: true, updatedAt: true },
    });
    return { user };
  });

  const UnidadePadrao = z.enum(["kg", "saco", "unidade", "caixa"]);
  const CategoriaDespesa = z.enum([
    "sementes",
    "adubo",
    "defensivo",
    "combustivel",
    "mao_de_obra",
    "manutencao",
    "outros",
  ]);
  const CentroCustoDespesa = z.enum(["plantio", "irrigacao", "mao_de_obra", "transporte", "insumos", "manutencao"]);
  const CanalVenda = z.enum(["feira", "atravessador", "cooperativa", "outros"]);
  const PropriedadeSchema = z.object({
    id: z.string().min(1),
    nomePropriedade: z.string().min(1),
    nomeProdutor: z.string().min(1),
    criadoEm: z.string().min(1),
  });
  const CulturaSchema = z.object({
    id: z.string().min(1),
    propriedadeId: z.string().min(1),
    nome: z.string().min(1),
    unidadePadrao: UnidadePadrao,
  });
  const SafraSchema = z.object({
    id: z.string().min(1),
    culturaId: z.string().min(1),
    dataInicio: z.string().min(1),
    dataFim: z.string().min(1).optional(),
    observacoes: z.string().min(1).optional(),
  });
  const DespesaSchema = z.object({
    id: z.string().min(1),
    propriedadeId: z.string().min(1),
    data: z.string().min(1),
    categoria: CategoriaDespesa,
    centroCusto: CentroCustoDespesa.optional(),
    descricao: z.string().min(1),
    valor: z.number().finite(),
    culturaId: z.string().min(1).optional(),
    safraId: z.string().min(1).optional(),
  });
  const VendaSchema = z.object({
    id: z.string().min(1),
    data: z.string().min(1),
    culturaId: z.string().min(1),
    quantidade: z.number().finite(),
    unidade: z.string().min(1),
    valorTotal: z.number().finite(),
    canal: CanalVenda,
  });

  const CategoriaInsumo = z.enum([
    "sementes",
    "fertilizantes",
    "defensivos",
    "combustivel",
    "ferramentas",
    "embalagens",
    "outros",
  ]);
  const UnidadeInsumo = z.enum(["kg", "L", "ml", "unidade", "saco", "tonelada", "ha"]);
  const InsumoSchema = z.object({
    id: z.string().min(1),
    nome: z.string().min(1),
    categoria: CategoriaInsumo,
    unidade: UnidadeInsumo,
    quantidadeAtual: z.number().finite(),
    alertaEstoqueBaixo: z.number().finite(),
  });
  const EscopoMeta = z.enum(["cultura", "safra"]);
  const MetaSchema = z.object({
    id: z.string().min(1),
    escopo: EscopoMeta,
    culturaId: z.string().min(1).optional(),
    safraId: z.string().min(1).optional(),
    metaFaturamento: z.number().finite().optional(),
    limiteGasto: z.number().finite().optional(),
    metaQuantidadeVendida: z.number().finite().optional(),
  });
  const TipoEtapaSafra = z.enum(["plantio", "adubacao", "irrigacao", "aplicacao", "colheita"]);
  const EtapaSafraSchema = z.object({
    id: z.string().min(1),
    safraId: z.string().min(1),
    tipo: TipoEtapaSafra,
    dataPrevista: z.string().min(1),
    concluida: z.boolean(),
    concluidaEm: z.string().optional(),
    observacao: z.string().optional(),
  });

  app.get("/propriedades", { preHandler: (app as any).authenticate }, async (req: any) => {
    const propriedades = await prisma.propriedade.findMany({
      where: { userId: req.user.sub },
      orderBy: { nomePropriedade: "asc" },
    });
    return { propriedades };
  });

  const NovaPropriedadeBody = z.object({
    id: z.string().min(1),
    nomePropriedade: z.string().min(1),
    nomeProdutor: z.string().min(1),
    criadoEm: z.string().min(1),
  });
  app.post("/propriedades", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = NovaPropriedadeBody.parse(req.body);
    const propriedade = await prisma.propriedade.create({
      data: { ...body, userId: req.user.sub },
    });
    return { propriedade };
  });

  app.delete("/propriedades/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const n = await prisma.cultura.count({ where: { propriedadeId: id, userId: req.user.sub } });
    if (n > 0) return reply.status(400).send({ message: "Propriedade possui culturas cadastradas" });
    const r = await prisma.propriedade.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/propriedade", { preHandler: (app as any).authenticate }, async (req: any) => {
    const propriedade = await prisma.propriedade.findFirst({ where: { userId: req.user.sub } });
    return { propriedade };
  });

  app.put("/propriedade", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = PropriedadeSchema.parse(req.body);
    const propriedade = await prisma.propriedade.upsert({
      where: { id: body.id },
      update: {
        nomePropriedade: body.nomePropriedade,
        nomeProdutor: body.nomeProdutor,
        criadoEm: body.criadoEm,
      },
      create: {
        id: body.id,
        userId: req.user.sub,
        nomePropriedade: body.nomePropriedade,
        nomeProdutor: body.nomeProdutor,
        criadoEm: body.criadoEm,
      },
    });
    return { propriedade };
  });

  app.get("/culturas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const q = z.object({ propriedadeId: z.string().min(1).optional() }).parse(req.query ?? {});
    const culturas = await prisma.cultura.findMany({
      where: { userId: req.user.sub, ...(q.propriedadeId ? { propriedadeId: q.propriedadeId } : {}) },
      orderBy: { nome: "asc" },
    });
    return { culturas };
  });

  app.post("/culturas", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const body = CulturaSchema.parse(req.body);
    const prop = await prisma.propriedade.findFirst({
      where: { id: body.propriedadeId, userId: req.user.sub },
    });
    if (!prop) return reply.status(400).send({ message: "Propriedade inválida" });
    const cultura = await prisma.cultura.create({
      data: {
        id: body.id,
        userId: req.user.sub,
        propriedadeId: body.propriedadeId,
        nome: body.nome,
        unidadePadrao: body.unidadePadrao,
      },
    });
    return { cultura };
  });
  app.put("/culturas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = CulturaSchema.parse({ ...(req.body ?? {}), id });
    const prop = await prisma.propriedade.findFirst({
      where: { id: body.propriedadeId, userId: req.user.sub },
    });
    if (!prop) return reply.status(400).send({ message: "Propriedade inválida" });
    const r = await prisma.cultura.updateMany({
      where: { id, userId: req.user.sub },
      data: { nome: body.nome, unidadePadrao: body.unidadePadrao, propriedadeId: body.propriedadeId },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/culturas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.cultura.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/safras", { preHandler: (app as any).authenticate }, async (req: any) => {
    const q = z.object({ culturaId: z.string().min(1).optional() }).parse(req.query ?? {});
    const safras = await prisma.safra.findMany({
      where: { userId: req.user.sub, ...(q.culturaId ? { culturaId: q.culturaId } : {}) },
      orderBy: { dataInicio: "desc" },
    });
    return { safras };
  });
  app.post("/safras", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = SafraSchema.parse(req.body);
    const safra = await prisma.safra.create({
      data: {
        id: body.id,
        userId: req.user.sub,
        culturaId: body.culturaId,
        dataInicio: body.dataInicio,
        dataFim: body.dataFim,
        observacoes: body.observacoes,
      },
    });
    return { safra };
  });
  app.put("/safras/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = SafraSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.safra.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        culturaId: body.culturaId,
        dataInicio: body.dataInicio,
        dataFim: body.dataFim,
        observacoes: body.observacoes,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/safras/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.safra.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/despesas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const q = z.object({ from: z.string().min(1).optional(), to: z.string().min(1).optional() }).parse(req.query ?? {});
    const despesas = await prisma.despesa.findMany({
      where: {
        userId: req.user.sub,
        ...(q.from || q.to ? { data: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
      },
      orderBy: { data: "desc" },
    });
    return { despesas };
  });
  app.post("/despesas", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const body = DespesaSchema.parse(req.body);
    const prop = await prisma.propriedade.findFirst({
      where: { id: body.propriedadeId, userId: req.user.sub },
    });
    if (!prop) return reply.status(400).send({ message: "Propriedade inválida" });
    const despesa = await prisma.despesa.create({
      data: {
        id: body.id,
        propriedadeId: body.propriedadeId,
        data: body.data,
        categoria: body.categoria,
        centroCusto: body.centroCusto ?? undefined,
        descricao: body.descricao,
        valor: body.valor,
        culturaId: body.culturaId ?? undefined,
        safraId: body.safraId ?? undefined,
        userId: req.user.sub,
      },
    });
    return { despesa };
  });
  app.put("/despesas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = DespesaSchema.parse({ ...(req.body ?? {}), id });
    const prop = await prisma.propriedade.findFirst({
      where: { id: body.propriedadeId, userId: req.user.sub },
    });
    if (!prop) return reply.status(400).send({ message: "Propriedade inválida" });
    const { id: _id, ...rest } = body;
    const r = await prisma.despesa.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        propriedadeId: rest.propriedadeId,
        data: rest.data,
        categoria: rest.categoria,
        centroCusto: rest.centroCusto ?? null,
        descricao: rest.descricao,
        valor: rest.valor,
        culturaId: rest.culturaId ?? null,
        safraId: rest.safraId ?? null,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/despesas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.despesa.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/vendas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const q = z.object({ from: z.string().min(1).optional(), to: z.string().min(1).optional() }).parse(req.query ?? {});
    const vendas = await prisma.venda.findMany({
      where: {
        userId: req.user.sub,
        ...(q.from || q.to ? { data: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
      },
      orderBy: { data: "desc" },
    });
    return { vendas };
  });
  app.post("/vendas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = VendaSchema.parse(req.body);
    const venda = await prisma.venda.create({ data: { ...body, userId: req.user.sub } });
    return { venda };
  });
  app.put("/vendas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = VendaSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.venda.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        data: body.data,
        culturaId: body.culturaId,
        quantidade: body.quantidade,
        unidade: body.unidade,
        valorTotal: body.valorTotal,
        canal: body.canal,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/vendas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.venda.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/insumos", { preHandler: (app as any).authenticate }, async (req: any) => {
    const insumos = await prisma.insumo.findMany({
      where: { userId: req.user.sub },
      orderBy: { nome: "asc" },
    });
    return { insumos };
  });
  app.post("/insumos", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = InsumoSchema.parse(req.body);
    const insumo = await prisma.insumo.create({ data: { ...body, userId: req.user.sub } });
    return { insumo };
  });
  app.put("/insumos/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = InsumoSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.insumo.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        nome: body.nome,
        categoria: body.categoria,
        unidade: body.unidade,
        quantidadeAtual: body.quantidadeAtual,
        alertaEstoqueBaixo: body.alertaEstoqueBaixo,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/insumos/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.insumo.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/metas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const metas = await prisma.meta.findMany({ where: { userId: req.user.sub } });
    return { metas };
  });
  app.post("/metas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = MetaSchema.parse(req.body);
    const meta = await prisma.meta.create({ data: { ...body, userId: req.user.sub } });
    return { meta };
  });
  app.put("/metas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = MetaSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.meta.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        escopo: body.escopo,
        culturaId: body.culturaId ?? null,
        safraId: body.safraId ?? null,
        metaFaturamento: body.metaFaturamento ?? null,
        limiteGasto: body.limiteGasto ?? null,
        metaQuantidadeVendida: body.metaQuantidadeVendida ?? null,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/metas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.meta.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/etapas-safra", { preHandler: (app as any).authenticate }, async (req: any) => {
    const q = z.object({ safraId: z.string().min(1).optional() }).parse(req.query ?? {});
    const etapas = await prisma.etapaCalendarioSafra.findMany({
      where: { userId: req.user.sub, ...(q.safraId ? { safraId: q.safraId } : {}) },
      orderBy: { dataPrevista: "asc" },
    });
    return { etapas };
  });
  app.post("/etapas-safra", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = EtapaSafraSchema.parse(req.body);
    const etapa = await prisma.etapaCalendarioSafra.create({
      data: {
        ...body,
        userId: req.user.sub,
        observacao: body.observacao ?? null,
        concluidaEm: body.concluidaEm ?? null,
      },
    });
    return { etapa };
  });
  app.put("/etapas-safra/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = EtapaSafraSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.etapaCalendarioSafra.updateMany({
      where: { id, userId: req.user.sub },
      data: {
        safraId: body.safraId,
        tipo: body.tipo,
        dataPrevista: body.dataPrevista,
        concluida: body.concluida,
        concluidaEm: body.concluidaEm ?? null,
        observacao: body.observacao ?? null,
      },
    });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/etapas-safra/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.etapaCalendarioSafra.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/export", { preHandler: (app as any).authenticate }, async (req: any) => {
    const userId = req.user.sub;
    const [propriedade, culturas, safras, despesas, vendas, insumos, metas, etapas] = await Promise.all([
      prisma.propriedade.findMany({ where: { userId } }),
      prisma.cultura.findMany({ where: { userId } }),
      prisma.safra.findMany({ where: { userId } }),
      prisma.despesa.findMany({ where: { userId } }),
      prisma.venda.findMany({ where: { userId } }),
      prisma.insumo.findMany({ where: { userId } }),
      prisma.meta.findMany({ where: { userId } }),
      prisma.etapaCalendarioSafra.findMany({ where: { userId } }),
    ]);
    const strip = <T extends Record<string, unknown>>(rows: T[], keys: string[]) =>
      rows.map((row) => {
        const o = { ...row };
        for (const k of keys) delete o[k];
        return o;
      });
    return {
      propriedade: strip(propriedade as any, ["userId", "createdAt", "updatedAt"]),
      culturas: strip(culturas as any, ["userId", "createdAt", "updatedAt"]),
      safras: strip(safras as any, ["userId", "createdAt", "updatedAt"]),
      despesas: strip(despesas as any, ["userId", "createdAt", "updatedAt"]),
      vendas: strip(vendas as any, ["userId", "createdAt", "updatedAt"]),
      insumos: strip(insumos as any, ["userId", "createdAt", "updatedAt"]),
      metas: strip(metas as any, ["userId", "createdAt", "updatedAt"]),
      etapasSafra: strip(etapas as any, ["userId", "createdAt", "updatedAt"]),
    };
  });

  const ImportBody = z.object({
    propriedade: z.array(PropriedadeSchema).optional(),
    culturas: z.array(CulturaSchema).optional(),
    safras: z.array(SafraSchema).optional(),
    despesas: z.array(DespesaSchema).optional(),
    vendas: z.array(VendaSchema).optional(),
    insumos: z.array(InsumoSchema).optional(),
    metas: z.array(MetaSchema).optional(),
    etapasSafra: z.array(EtapaSafraSchema).optional(),
  });

  app.post("/import", { preHandler: (app as any).authenticate }, async (req: any) => {
    const userId = req.user.sub;
    const body = ImportBody.parse(req.body ?? {});
    await prisma.$transaction(async (tx) => {
      await tx.etapaCalendarioSafra.deleteMany({ where: { userId } });
      await tx.venda.deleteMany({ where: { userId } });
      await tx.despesa.deleteMany({ where: { userId } });
      await tx.safra.deleteMany({ where: { userId } });
      await tx.cultura.deleteMany({ where: { userId } });
      await tx.insumo.deleteMany({ where: { userId } });
      await tx.meta.deleteMany({ where: { userId } });
      await tx.propriedade.deleteMany({ where: { userId } });

      if (body.propriedade?.length)
        await tx.propriedade.createMany({ data: body.propriedade.map((p) => ({ ...p, userId })) });
      if (body.culturas?.length)
        await tx.cultura.createMany({ data: body.culturas.map((c) => ({ ...c, userId })) });
      if (body.safras?.length) await tx.safra.createMany({ data: body.safras.map((s) => ({ ...s, userId })) });
      if (body.despesas?.length)
        await tx.despesa.createMany({
          data: body.despesas.map((d) => ({
            ...d,
            userId,
            centroCusto: d.centroCusto ?? undefined,
          })),
        });
      if (body.vendas?.length) await tx.venda.createMany({ data: body.vendas.map((v) => ({ ...v, userId })) });
      if (body.insumos?.length) await tx.insumo.createMany({ data: body.insumos.map((i) => ({ ...i, userId })) });
      if (body.metas?.length) await tx.meta.createMany({ data: body.metas.map((m) => ({ ...m, userId })) });
      if (body.etapasSafra?.length)
        await tx.etapaCalendarioSafra.createMany({
          data: body.etapasSafra.map((e) => ({
            ...e,
            userId,
            observacao: e.observacao ?? null,
            concluidaEm: e.concluidaEm ?? null,
          })),
        });
    });
    return { ok: true };
  });

  return app;
}
