# Agro Sara Control

Controle financeiro para propriedade rural (React + Vite no front, Fastify + Prisma no back).

## Rodar

**Frontend** (raiz do projeto):

```bash
npm install
npm run dev
```

→ `http://localhost:5173`

**Backend** (API):

```bash
cd backend
npm install
cp .env.example .env
npm run generate
npm run migrate
npm run dev
```

→ `http://127.0.0.1:4000`

A API tem auth (register/login), CRUD de propriedade, culturas, safras, despesas e vendas, e rotas `/export` e `/import` para sincronizar com o app.
