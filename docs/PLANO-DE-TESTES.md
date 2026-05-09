# Plano de Testes - Agro Sara Control

Data: 09/05/2026  
Versao: 1.0

## 1. Objetivo

Validar os fluxos principais do sistema Agro Sara Control para entrega de MVP, garantindo que autenticacao, cadastro de dados operacionais e exportacao funcionem conforme esperado.

## 2. Escopo

Em escopo:
- Frontend React (navegacao e formularios principais)
- Backend Fastify (autenticacao e CRUD principal)
- Persistencia MySQL via Prisma
- Exportacao de relatorios

Fora de escopo:
- Testes de carga/performance
- Testes de seguranca aprofundados (pentest)
- Compatibilidade ampla entre navegadores legados

## 3. Ambiente de Teste

- Sistema operacional: macOS
- Frontend: `npm run dev` (porta `http://localhost:8080`)
- Backend: `npm run dev` em `backend/` (porta `http://127.0.0.1:4000`)
- Banco: MySQL 8+
- Variaveis:
  - `backend/.env` com `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`
  - `.env.local` com `VITE_API_URL=http://127.0.0.1:4000`

## 4. Casos de Teste Definidos com Base nos Requisitos

| ID | Requisito | Pre-condicao | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-01 | Cadastro de usuario | API e banco ativos | Acessar `/register`, preencher email/senha valida e enviar | Usuario criado e redirecionamento para `/setup` |
| CT-02 | Login de usuario | Usuario cadastrado | Acessar `/login`, informar credenciais validas e enviar | Login realizado e acesso ao app autenticado |
| CT-03 | Protecao de rotas | Usuario deslogado | Tentar acessar rota interna (ex.: `/metas`) | Redirecionamento para `/login` |
| CT-04 | Setup inicial | Usuario autenticado sem propriedade | Abrir `/setup` e concluir formulario | Propriedade criada e acesso ao dashboard |
| CT-05 | CRUD de culturas | Setup concluido | Criar, editar e excluir cultura | Operacoes concluidas e lista atualizada |
| CT-06 | CRUD de safras | Cultura existente | Criar, editar e excluir safra | Operacoes concluidas sem erro |
| CT-07 | CRUD de despesas | Setup concluido | Criar, editar e excluir despesa | Totais e lista atualizados corretamente |
| CT-08 | CRUD de vendas | Setup concluido | Criar, editar e excluir venda | Totais e lista atualizados corretamente |
| CT-09 | Metas | Dados minimos cadastrados | Criar meta e visualizar progresso | Meta salva e exibicao coerente |
| CT-10 | Exportacao | Dados cadastrados | Acessar tela exportar e gerar arquivo | Arquivo `.xlsx` gerado sem erro |
| CT-11 | Validacao de backend | Backend configurado | Executar `npm run migrate` em `backend/` | Migrations aplicadas sem erro |
| CT-12 | Qualidade automatizada | Dependencias instaladas | Executar `npm run test` e `npm run build` na raiz | Testes e build concluidos com sucesso |

## 5. Criterio de Aprovacao

- 100% dos casos criticos (CT-01 a CT-04) aprovados.
- Minimo de 90% dos casos totais aprovados.
- Sem erro bloqueante em autenticacao, setup, CRUD principal e exportacao.

## 6. Riscos Conhecidos

- Dependencia de configuracao correta do MySQL no ambiente local.
- Possiveis diferencas de comportamento entre ambientes (dev/prod) para CORS e auth.
