# Agro Sara Control

Aplicação web para gestão financeira de propriedades rurais, com foco em controle operacional, acompanhamento de custos e apoio à tomada de decisão.

## Resumo

O Agro Sara Control é composto por duas aplicações:

- **Frontend** em React + Vite para operação diária.
- **Backend** em Fastify + Prisma para autenticação, regras de negócio e persistência.

## Principais funcionalidades

- Cadastro e autenticação de usuários via JWT.
- Setup inicial da propriedade rural.
- Gestão de culturas, safras, despesas, vendas, insumos e metas.
- Exportação de relatórios em `.xlsx`.
- Rotas de backup e restauração (`/export` e `/import`).

## Arquitetura

```text
Frontend (React/Vite)
  -> HTTP API (Fastify)
    -> Prisma ORM
      -> MySQL
```

## Stack técnica

- React 18 + Vite + TypeScript
- Fastify + TypeScript
- Prisma ORM
- MySQL
- JWT

## Pré-requisitos

- Node.js 20+
- NPM 10+
- MySQL 8+

## Como rodar

Use **dois terminais**: um para o backend e outro para o frontend.

### 1) Backend (API + MySQL)

Entre em `backend` e instale as dependências:

```bash
cd backend
npm install
```

Copie o arquivo de ambiente:

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite `backend/.env` e configure:

- `DATABASE_URL` (MySQL)
- `FRONTEND_ORIGIN=http://localhost:8080`
- `JWT_SECRET` com pelo menos 16 caracteres

Exemplo de `DATABASE_URL`:

```env
DATABASE_URL="mysql://usuario:senha@127.0.0.1:3306/agro_sara"
```

Crie o banco antes da migration:

```sql
CREATE DATABASE agro_sara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Rode Prisma e backend:

```bash
npm run generate
npm run migrate
npm run dev
```

API disponível em `http://127.0.0.1:4000`.

> Sempre que houver mudança no schema do Prisma, rode `npm run migrate` novamente.

### 2) Frontend (Vite)

Na raiz do projeto, instale as dependências:

```bash
npm install
```

Opcional: criar `.env.local` para apontar a API:

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Inicie o frontend:

```bash
npm run dev
```

Aplicação disponível em `http://localhost:8080`.

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição | Exemplo |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão MySQL usada pelo Prisma | `mysql://usuario:senha@127.0.0.1:3306/agro_sara` |
| `PORT` | Não | Porta da API | `4000` |
| `HOST` | Não | Host de bind da API | `127.0.0.1` |
| `JWT_SECRET` | Sim | Segredo para assinatura de tokens JWT | `troque-este-segredo-min-16-chars` |
| `FRONTEND_ORIGIN` | Sim | Origem permitida no CORS | `http://localhost:8080` |
| `SQLITE_DATABASE_PATH` | Não | Caminho do `dev.db` antigo para migração | `./dev.db` |

### Frontend (`.env.local`)

| Variável | Obrigatória | Descrição | Exemplo |
| --- | --- | --- | --- |
| `VITE_API_URL` | Sim | URL base da API | `http://127.0.0.1:4000` |

## Scripts úteis

### Frontend (raiz)

- `npm run dev`: inicia a aplicação em modo desenvolvimento.
- `npm run build`: gera build de produção.
- `npm run test`: executa testes automatizados.

### Backend (`backend/`)

- `npm run dev`: inicia a API em modo desenvolvimento.
- `npm run generate`: gera o client Prisma.
- `npm run migrate`: aplica migrations em desenvolvimento.
- `npm run migrate:deploy`: aplica migrations em ambiente de deploy.
- `npm run migrate:sqlite-to-mysql`: migra dados legados de SQLite para MySQL.

## Fluxo de uso

1. Cadastre usuário (`/register`) ou faça login (`/login`).
2. Execute o setup da primeira propriedade (`/setup`).
3. Cadastre culturas, safras, despesas, vendas, metas e insumos.
4. Exporte relatórios em `.xlsx` na tela **Exportar e relatórios**.

## Migração opcional de SQLite antigo

Se você tiver um `dev.db` antigo:

```bash
cd backend
npm run migrate:sqlite-to-mysql
```

Se o arquivo estiver em outro caminho, defina `SQLITE_DATABASE_PATH` no ambiente.

## Problemas comuns

- **Erro de CORS**: confira `FRONTEND_ORIGIN` no `backend/.env`.
- **Erro de conexão MySQL**: revise `DATABASE_URL`, usuário/senha e se o MySQL está ativo.
- **Erro `EPERM` no `prisma generate` (Windows/OneDrive)**: feche processos usando a pasta e rode novamente.
