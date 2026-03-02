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
    "sementes", "adubo", "defensivo", "combustivel", "mao_de_obra", "manutencao", "outros",
  ]);
  const CanalVenda = z.enum(["feira", "atravessador", "cooperativa", "outros"]);
  const PropriedadeSchema = z.object({
    id: z.string().min(1),
    nomePropriedade: z.string().min(1),
    nomeProdutor: z.string().min(1),
    criadoEm: z.string().min(1),
  });
  const CulturaSchema = z.object({
    id: z.string().min(1),
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
    data: z.string().min(1),
    categoria: CategoriaDespesa,
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

  app.get("/propriedade", { preHandler: (app as any).authenticate }, async (req: any) => {
    const propriedade = await prisma.propriedade.findFirst({ where: { userId: req.user.sub } });
    return { propriedade };
  });
  app.put("/propriedade", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = PropriedadeSchema.parse(req.body);
    const propriedade = await prisma.propriedade.upsert({
      where: { id: body.id },
      update: { nomePropriedade: body.nomePropriedade, nomeProdutor: body.nomeProdutor, criadoEm: body.criadoEm },
      create: { id: body.id, userId: req.user.sub, nomePropriedade: body.nomePropriedade, nomeProdutor: body.nomeProdutor, criadoEm: body.criadoEm },
    });
    return { propriedade };
  });

  app.get("/culturas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const culturas = await prisma.cultura.findMany({ where: { userId: req.user.sub }, orderBy: { nome: "asc" } });
    return { culturas };
  });
  app.post("/culturas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = CulturaSchema.parse(req.body);
    const cultura = await prisma.cultura.create({
      data: { id: body.id, userId: req.user.sub, nome: body.nome, unidadePadrao: body.unidadePadrao },
    });
    return { cultura };
  });
  app.put("/culturas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = CulturaSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.cultura.updateMany({ where: { id, userId: req.user.sub }, data: { nome: body.nome, unidadePadrao: body.unidadePadrao } });
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
      data: { id: body.id, userId: req.user.sub, culturaId: body.culturaId, dataInicio: body.dataInicio, dataFim: body.dataFim, observacoes: body.observacoes },
    });
    return { safra };
  });
  app.put("/safras/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = SafraSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.safra.updateMany({ where: { id, userId: req.user.sub }, data: { culturaId: body.culturaId, dataInicio: body.dataInicio, dataFim: body.dataFim, observacoes: body.observacoes } });
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
  app.post("/despesas", { preHandler: (app as any).authenticate }, async (req: any) => {
    const body = DespesaSchema.parse(req.body);
    const despesa = await prisma.despesa.create({ data: { ...body, userId: req.user.sub } });
    return { despesa };
  });
  app.put("/despesas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const body = DespesaSchema.parse({ ...(req.body ?? {}), id });
    const r = await prisma.despesa.updateMany({ where: { id, userId: req.user.sub }, data: body });
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
    const r = await prisma.venda.updateMany({ where: { id, userId: req.user.sub }, data: body });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });
  app.delete("/vendas/:id", { preHandler: (app as any).authenticate }, async (req: any, reply) => {
    const id = z.string().min(1).parse((req.params as any)?.id);
    const r = await prisma.venda.deleteMany({ where: { id, userId: req.user.sub } });
    if (r.count === 0) return reply.status(404).send({ message: "Não encontrado" });
    return { ok: true };
  });

  app.get("/export", { preHandler: (app as any).authenticate }, async (req: any) => {
    const userId = req.user.sub;
    const [propriedade, culturas, safras, despesas, vendas] = await Promise.all([
      prisma.propriedade.findMany({ where: { userId } }),
      prisma.cultura.findMany({ where: { userId } }),
      prisma.safra.findMany({ where: { userId } }),
      prisma.despesa.findMany({ where: { userId } }),
      prisma.venda.findMany({ where: { userId } }),
    ]);
    return {
      propriedade: propriedade.map(({ userId: _u, createdAt: _c, updatedAt: _up, ...p }) => p),
      culturas: culturas.map(({ userId: _u, createdAt: _c, updatedAt: _up, ...c }) => c),
      safras: safras.map(({ userId: _u, createdAt: _c, updatedAt: _up, ...s }) => s),
      despesas: despesas.map(({ userId: _u, createdAt: _c, updatedAt: _up, ...d }) => d),
      vendas: vendas.map(({ userId: _u, createdAt: _c, updatedAt: _up, ...v }) => v),
    };
  });

  const ImportBody = z.object({
    propriedade: z.array(PropriedadeSchema).optional(),
    culturas: z.array(CulturaSchema).optional(),
    safras: z.array(SafraSchema).optional(),
    despesas: z.array(DespesaSchema).optional(),
    vendas: z.array(VendaSchema).optional(),
  });
  app.post("/import", { preHandler: (app as any).authenticate }, async (req: any) => {
    const userId = req.user.sub;
    const body = ImportBody.parse(req.body ?? {});
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.propriedade.deleteMany({ where: { userId } }),
        tx.venda.deleteMany({ where: { userId } }),
        tx.despesa.deleteMany({ where: { userId } }),
        tx.safra.deleteMany({ where: { userId } }),
        tx.cultura.deleteMany({ where: { userId } }),
      ]);
      if (body.propriedade?.length) await tx.propriedade.createMany({ data: body.propriedade.map((p) => ({ ...p, userId })) });
      if (body.culturas?.length) await tx.cultura.createMany({ data: body.culturas.map((c) => ({ ...c, userId })) });
      if (body.safras?.length) await tx.safra.createMany({ data: body.safras.map((s) => ({ ...s, userId })) });
      if (body.despesas?.length) await tx.despesa.createMany({ data: body.despesas.map((d) => ({ ...d, userId })) });
      if (body.vendas?.length) await tx.venda.createMany({ data: body.vendas.map((v) => ({ ...v, userId })) });
    });
    return { ok: true };
  });

  return app;
}
