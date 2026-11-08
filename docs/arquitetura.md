# Arquitetura

O backend segue a arquitetura hexagonal (portas e adaptadores). O domínio fica no centro e não conhece arquivo, banco, HTTP, PDF nem e-mail.

```
Api / Worker / Cli   montam tudo e traduzem entrada e saída
        │
Infraestrutura       adaptadores: OFX/CSV, SQLite, memória, PDF, e-mail
        │
Aplicacao            casos de uso e portas (interfaces)
        │
Dominio              entidades e regras puras
```

As dependências apontam para dentro: `Dominio` não referencia nenhum pacote externo, e `Aplicacao` só conhece o `Dominio`.

## Modos

O mesmo código roda em dois modos, e a diferença é só qual adaptador entra em cada porta na composição (`Program.cs`):

- **Pessoal:** `RepositorioSqlite`, pasta vigiada pelo Worker, envio por e-mail quando o mês fica completo.
- **Demonstração:** `RepositorioEmMemoria` com tempo de vida da requisição. Nada é gravado.

## Front

O `web/` mostra o que a API devolve e não calcula o fechamento. Cada funcionalidade é um módulo em `src/modules/<nome>` com API pública em `index.ts`.
