# 5. Documentacao Tecnica

## 1. Descricao detalhada da arquitetura do sistema

O Agro Sara Control segue uma arquitetura web em camadas, separando interface, regras de negocio e persistencia:

```text
Frontend (React + Vite + TypeScript)
  -> HTTP/JSON
Backend (Fastify + TypeScript)
  -> Prisma ORM
MySQL
```

### 1.1 Frontend

- Responsavel pela experiencia do usuario, navegacao e formularios.
- Organizado em modulos como `pages`, `components`, `contexts`, `domain`, `infra` e `app`.
- Controle de autenticacao no cliente com contexto (`AuthContext`) e rotas protegidas.
- Consumo da API via cliente HTTP em `src/infra/api/client.ts`.

### 1.2 Backend

- API REST implementada com Fastify.
- Responsavel por autenticacao (JWT), validacao de payloads e regras de acesso por usuario.
- Validacoes feitas com Zod.
- Operacoes de dados realizadas pelo Prisma (camada de acesso ao banco).

### 1.3 Banco de dados

- MySQL como banco relacional principal.
- Estrutura controlada por `prisma/schema.prisma` e migrations versionadas em `backend/prisma/migrations`.
- Modelo orientado a entidades do dominio do sistema (usuarios, propriedades, culturas, safras, despesas, vendas, metas, insumos).

### 1.4 Fluxo principal

1. Usuario autentica via `/auth/login` ou `/auth/register`.
2. Backend valida credenciais e retorna token JWT.
3. Frontend envia token nas requisicoes autenticadas.
4. Backend valida token, aplica regras de acesso e persiste/consulta dados no MySQL via Prisma.

## 2. Tecnologias utilizadas

### 2.1 Frontend

- React 18
- Vite 5
- TypeScript 5
- React Router Dom
- React Query
- Tailwind CSS
- Radix UI (base para componentes)
- Vitest + Testing Library (testes)

### 2.2 Backend

- Node.js 20+
- Fastify 5
- TypeScript 5
- Prisma ORM
- Zod
- JWT (`@fastify/jwt`)
- bcryptjs

### 2.3 Banco e ferramentas

- MySQL 8+
- NPM
- ESLint

## 3. Decisoes de design e justificativas tecnicas

### 3.1 Separacao Frontend/Backend

Decisao:
- Aplicacoes separadas por responsabilidade.

Justificativa:
- Facilita manutencao, evolucao independente e deploy por camada.

### 3.2 TypeScript em todo o stack

Decisao:
- Uso de tipagem estatica no frontend e backend.

Justificativa:
- Reduz erros em tempo de execucao e melhora produtividade com autocomplete/refatoracao segura.

### 3.3 Fastify no backend

Decisao:
- Framework HTTP leve e performatico.

Justificativa:
- Inicializacao rapida, bom desempenho e ecossistema simples para APIs REST.

### 3.4 Prisma como ORM

Decisao:
- Mapear entidades e queries com Prisma.

Justificativa:
- Melhor legibilidade de acesso a dados, migrations versionadas e menor risco de SQL manual inconsistente.

### 3.5 Validacao de entrada com Zod

Decisao:
- Validar payloads de entrada no backend.

Justificativa:
- Evita dados invalidos, melhora mensagens de erro e aumenta confiabilidade da API.

### 3.6 Autenticacao com JWT

Decisao:
- API stateless com token.

Justificativa:
- Simplicidade de escalabilidade horizontal e integracao direta com frontend SPA.

### 3.7 Organizacao de UI reutilizavel

Decisao:
- Componentes reutilizaveis em `src/components/ui`.

Justificativa:
- Padroniza interface, reduz duplicacao e acelera criacao de novas telas.

### 3.8 Rotas centralizadas por constantes

Decisao:
- Centralizar caminhos em `src/app/paths.ts`.

Justificativa:
- Reduz erro de digitacao em strings de rota e facilita manutencao do fluxo de navegacao.

## 4. Consideracoes de qualidade e manutencao

- Testes automatizados no frontend com Vitest.
- Build de frontend e backend como verificacao tecnica de integridade.
- Controle de variaveis sensiveis via `.env` local (nao versionado).

## 5. Limitacoes atuais e evolucoes recomendadas

- Aumentar cobertura de testes de integracao no backend.
- Extrair o servidor backend em modulos menores (`routes`, `services`, `schemas`) para reduzir acoplamento.
- Melhorar particionamento de bundle frontend (code splitting em modulos pesados).
