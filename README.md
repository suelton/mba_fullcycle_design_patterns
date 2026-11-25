# Fechamento de Faturamento

Projeto do curso (design patterns) estendido com o fechamento do faturamento: calcula as faturas de um período (regime `cash` ou `accrual`) e as grava em `branas.invoice` de forma atômica, substituindo o fechamento anterior do mesmo período/regime.

## Subindo o banco

PostgreSQL local com usuário `postgres`, senha `123456`, banco `app` (connection string fixa em `src/infra/database/PgPromiseAdapter.ts`). O `create.sql` já cria a extensão `uuid-ossp`, usa `drop schema if exists` e pode ser reexecutado.

```bash
psql -U postgres -c "drop database if exists app;"
psql -U postgres -c "create database app;"
psql -U postgres -d app -v ON_ERROR_STOP=1 -f create.sql
```

Sem psql instalado, via Docker:

```bash
docker run -d --name pgmba -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=app -p 5432:5432 postgres:15
docker cp create.sql pgmba:/tmp/create.sql
docker exec pgmba psql -U postgres -d app -v ON_ERROR_STOP=1 -f /tmp/create.sql
```

Se recriar o schema com a API no ar, reinicie a API.

## Subindo a API e rodando a suíte

O `TZ` é obrigatório: os asserts assumem horários de São Paulo.

```bash
npm install
TZ=America/Sao_Paulo npx ts-node src/main.ts   # API na porta 3000
TZ=America/Sao_Paulo npx jest                   # com a API de pé (test/api.test.ts)
```

No PowerShell: `$env:TZ='America/Sao_Paulo'` antes dos comandos.

## Endpoints

| Rota | Efeito |
| --- | --- |
| `POST /close_invoicing` `{month, year, type, format?}` | Persiste as faturas do período e responde a lista (JSON ou CSV). Publica `InvoicesClosed` com `{ month, year, type, invoices, total }` (o `SendEmail` imprime no console). |
| `GET /invoices?month&year&type&format?` | Faturas fechadas do período, ordenadas por `date`; `[]` se não houver. |
| `POST /generate_invoices` | Simulação, não persiste. Passa a respeitar `format`. |

`format`: `json` (padrão) ou `csv` (`YYYY-MM-DD;amount` por linha, resposta em texto puro). Outro valor lança `Invalid format`; `type` desconhecido lança `Invalid type`.

## Decisões de arquitetura

- **Transação / Unit of Work**: `DatabaseConnection.transaction(work)` (porta em `src/infra/database`) é implementada no `PgPromiseAdapter` com `tx` do pg-promise. Quem a usa é o `InvoiceDatabaseRepository.replacePeriod`, que roda o `delete` do período/regime e todos os `insert` dentro de uma única transação. A aplicação só conhece a porta `InvoiceRepository`.
- **Prova da atomicidade** (`test/CloseInvoicing.test.ts`): fecha-se o período, depois tenta-se fechar de novo com um repositório de contratos que devolve, além do contrato real, um contrato inexistente no banco. O insert dele viola a FK no meio do lote (depois do `delete` e do primeiro `insert`). O teste confirma que o use case lança e que a tabela fica idêntica à anterior (mesmos `id_invoice`), ou seja, rollback total.
- **Presenter**: `PresenterFactory` (porta em `application`) com `PresenterFactoryImpl` em `infra`; o use case nunca instancia presenters.
- **Mediator**: interface em `src/application/Mediator.ts`, implementação em `src/infra/mediator`. Nenhum arquivo de `application` ou `domain` importa de `infra`.
- **HttpServer**: o callback recebe `(params, body, headers, query)`. Resposta `string` vai como texto puro; objeto/array como JSON.

## Limitações conhecidas

- Erros dentro de um use case continuam derrubando o processo (comportamento do projeto base, fora de escopo).
- Os testes de integração compartilham o banco `app`; `test/CloseInvoicing.test.ts` limpa `branas.invoice` a cada teste.
