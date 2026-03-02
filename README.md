# Agro Sara Control

Controle financeiro para propriedade rural (React + Vite no front, Fastify + Prisma no back).

## Rodar

Use **dois terminais**: um para o back, outro para o front.

**Terminal 1 – Backend**

```bash
cd backend
npm install
cp .env.example .env   # só na primeira vez
npm run generate
npm run migrate        # só na primeira vez (ou depois de mudar o schema)
npm run dev
```

→ API em `http://127.0.0.1:4000`

**Terminal 2 – Frontend** (na raiz do projeto)

```bash
npm install
npm run dev
```

→ O navegador abre em `http://localhost:8080`. Se não abrir, acesse esse endereço manualmente.

---

A API tem auth (register/login), CRUD de propriedade, culturas, safras, despesas e vendas, e rotas `/export` e `/import` para sincronizar com o app. O front hoje usa só dados locais (IndexedDB); para usar a API é preciso integrar no app (login + chamadas à API).

---

## O que falta para ficar completo

- **Integração front + back** — O app ainda não tem tela de login nem chama a API. Falta: tela de login/cadastro, guardar o token JWT e usar a API em vez do IndexedDB (ou oferecer “sincronizar” enviando os dados locais para `/import`).

- **Banco de dados** — O back já está completo: SQLite + Prisma, tabelas criadas (User, Propriedade, Cultura, Safra, Despesa, Venda), migrations em `backend/prisma/migrations`. Em produção você pode trocar para PostgreSQL alterando o `provider` no `schema.prisma` e o `DATABASE_URL`.
