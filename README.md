# Agro Sara Control

Controle financeiro para propriedade rural  
Frontend: React + Vite  
Backend: Fastify + Prisma + MySQL

## Como rodar

Use **dois terminais**: um para o backend e outro para o frontend.

---

### 1) Backend (API + MySQL)

Entre em `backend`:

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

API em `http://127.0.0.1:4000`.

> Sempre que atualizar o projeto e houver mudança de schema Prisma, rode `npm run migrate` novamente.

---

### 2) Frontend (Vite)

Na raiz do projeto:

```bash
npm install
```

Opcional: criar `.env.local` para apontar API:

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Depois:

```bash
npm run dev
```

Abra `http://localhost:8080`.

---

## Fluxo de uso

1. Cadastre usuário (`/register`) ou faça login (`/login`)
2. Faça setup da primeira propriedade (`/setup`)
3. Cadastre culturas, safras, despesas, vendas, metas e insumos
4. Exporte relatórios em `.xlsx` na tela **Exportar e relatórios**

---

## Armazenamento de dados

O frontend usa JWT no `localStorage` (sessão).  
Todos os dados de negócio vão para a API e são persistidos no **MySQL**.

Entidades principais na API:

- propriedade
- culturas
- safras
- despesas
- vendas
- insumos
- metas
- etapas de calendário da safra

Também há rotas de backup e restauração: `/export` e `/import`.

---

## Migração opcional de SQLite antigo

Se você tiver um `dev.db` antigo:

```bash
cd backend
npm run migrate:sqlite-to-mysql
```

Se o arquivo estiver em outro caminho, defina `SQLITE_DATABASE_PATH`.

---

## Problemas comuns

- **Erro de CORS:** confira `FRONTEND_ORIGIN` no `backend/.env`.
- **Erro de conexão MySQL:** revise `DATABASE_URL`, usuário/senha e se o MySQL está ativo.
- **Erro `EPERM` no `prisma generate` (Windows/OneDrive):** feche processos usando a pasta e rode novamente.
