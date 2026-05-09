# Relatorio de Testes - Agro Sara Control

Data: 09/05/2026  
Versao: 1.0

## 1. Evidencias da Execucao dos Testes (prints, logs ou registros)

### 1.1 Evidencias automatizadas

- Comando executado: `npm run test` (raiz)
- Resultado registrado: `14 passed (14)` em `4` arquivos de teste.

- Comando executado: `npm run build` (raiz)
- Resultado registrado: build de producao concluido com sucesso via Vite.

### 1.2 Evidencias funcionais manuais

Sugestao de anexos (prints):
- Print da tela de login (`/login`) autenticando com sucesso.
- Print da tela de setup concluido.
- Print da criacao de cultura/safra/despesa/venda.
- Print da tela de exportacao com geracao de `.xlsx`.
- Print de rotas protegidas redirecionando para login sem token.

## 2. Resultado por Caso de Teste

| ID | Status | Evidencia | Observacao |
|---|---|---|---|
| CT-01 | Pendente | Print de cadastro | A executar no ciclo manual final |
| CT-02 | Pendente | Print de login | A executar no ciclo manual final |
| CT-03 | Pendente | Print de redirecionamento | A executar no ciclo manual final |
| CT-04 | Pendente | Print do setup concluido | A executar no ciclo manual final |
| CT-05 | Pendente | Print/log de CRUD culturas | A executar no ciclo manual final |
| CT-06 | Pendente | Print/log de CRUD safras | A executar no ciclo manual final |
| CT-07 | Pendente | Print/log de CRUD despesas | A executar no ciclo manual final |
| CT-08 | Pendente | Print/log de CRUD vendas | A executar no ciclo manual final |
| CT-09 | Pendente | Print de metas | A executar no ciclo manual final |
| CT-10 | Pendente | Arquivo/export log | A executar no ciclo manual final |
| CT-11 | Pendente | Log do `npm run migrate` | Depende de credencial MySQL valida |
| CT-12 | Aprovado | Log `npm run test` e `npm run build` | Execucao automatizada concluida |

## 3. Analise dos Resultados Obtidos

- Estado atual: base tecnica apta para continuidade de validacao.
- Resultado automatizado: aprovado (testes unitarios e build ok).
- Pendencias: validacao manual dos fluxos funcionais fim a fim e migracao com credencial MySQL correta.
- Risco de entrega no estado atual: medio (nao por codigo, mas por pendencia de execucao funcional completa no ambiente).

## 4. Conclusao

O projeto apresenta estabilidade tecnica inicial para entrega de MVP, desde que os testes manuais pendentes (CT-01 a CT-11) sejam executados e registrados com evidencias antes do aceite final.
