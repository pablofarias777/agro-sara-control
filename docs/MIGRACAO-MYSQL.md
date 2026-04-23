# Migração do backend para MySQL

## O que é cada “banco” no projeto

| Onde | O quê |
|------|--------|
| **Navegador (IndexedDB)** | Usado pelo **React** (`agro-sara-control`). Guarda culturas, safras, despesas, vendas, etc. **Não é MySQL.** |
| **Backend Spring** (`backend/`) | Por padrão usa **SQLite** (`./dev.db`). Pode ser trocado para **MySQL** com o perfil abaixo. |
| **Porta 8080** | Servidor **Vite** (frontend). |
| **Porta 4000** (padrão no `application.yml`) | API **Spring Boot**. |

Colocar o Spring em MySQL **não remove** o load infinito do React se o problema for **IndexedDB travado** no navegador — são camadas independentes até existir código que chame a API em vez do IndexedDB.

---

## 1. Criar banco e usuário no MySQL

```sql
CREATE DATABASE agro_sara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'agro'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON agro_sara.* TO 'agro'@'localhost';
FLUSH PRIVILEGES;
```

Ajuste usuário/host conforme seu ambiente (Docker, nuvem, etc.).

---

## 2. Variáveis de ambiente (perfil `mysql`)

O arquivo `backend/src/main/resources/application.yml` já define o perfil `mysql`. Exemplo:

```bash
# Windows PowerShell
$env:SPRING_PROFILES_ACTIVE="mysql"
$env:MYSQL_URL="jdbc:mysql://localhost:3306/agro_sara?charset=utf8mb4&serverTimezone=America/Sao_Paulo"
$env:MYSQL_USER="agro"
$env:MYSQL_PASSWORD="sua_senha"
cd backend
mvn spring-boot:run
```

Ou em uma linha (Maven):

```bash
mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=mysql -Dspring-boot.run.jvmArguments="-DMYSQL_USER=agro -DMYSQL_PASSWORD=sua_senha"
```

O Hibernate com `ddl-auto: update` cria/atualiza tabelas na primeira subida (adequado para desenvolvimento; em produção use migrations controladas).

---

## 3. Conferir se a API subiu

Abra `http://127.0.0.1:4000` (ou a porta configurada em `PORT`) e verifique os endpoints existentes no projeto (controllers em `backend/src/main/java`).

---

## 4. Integrar frontend com o backend (próximo passo de produto)

Hoje o **frontend não consome** essa API para o fluxo principal; tudo vai ao IndexedDB.

Para “usar MySQL no app” de verdade, é preciso:

1. Manter contratos REST (ou GraphQL) alinhados aos tipos do domínio.
2. No React, substituir chamadas em `src/infra/storage/indexeddb.ts` por `fetch`/client HTTP para o Spring.
3. Tratar autenticação (JWT já existe no backend), CORS (`app.frontend-origin` no `application.yml`) e erros de rede.

Isso é um projeto à parte; migrar só o Spring para MySQL já deixa o servidor pronto para essa fase.

---

## 5. Se o React ficar em “Carregando…”

Isso costuma ser **IndexedDB** (outra aba aberta, migração bloqueada, ou dados corrompidos). No erro de timeout, o app oferece **“Apagar dados locais do app e recarregar”**. Também ajuda fechar todas as abas de `localhost:8080` e tentar de novo.

Não confundir com falha de MySQL: o navegador **não conecta** ao MySQL diretamente; só o backend Java faz isso.
