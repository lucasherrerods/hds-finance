# hds-finance

Fechamento mensal das finanças a partir dos extratos do Banco Inter.

O Inter mostra o extrato e o saldo dos investimentos, mas não oferece uma visão consolidada do mês: entradas x saídas, evolução do saldo, gastos por categoria e posição dos investimentos, num lugar só. Também não há API de leitura de extrato para pessoa física. O hds-finance resolve isso a partir do arquivo que o próprio banco exporta (`.ofx` ou `.csv`).

> Projeto pessoal e de portfólio, em desenvolvimento.

## Como funciona

1. Exporte o extrato no app ou no site do Inter.
2. Envie o arquivo pelo painel web.
3. O hds-finance lê as transações, categoriza e calcula o fechamento do mês.
4. O resultado aparece num painel com gráficos e num PDF para baixar.

## Modos

| | Admin | Demonstração |
|---|---|---|
| Para quem | só o dono, com login por código no e-mail | quem quiser testar |
| Armazenamento | Postgres, só os dados do dono | nenhum: tudo em memória |
| Entrada | incluir extrato no painel | upload |
| Saída | painel, PDF e fechamento por e-mail | painel e PDF para baixar |

Na demonstração o servidor não guarda nada: o extrato é processado durante a requisição e descartado. A área admin guarda só os dados do próprio dono.

## Stack

- **API:** .NET 9, ASP.NET Core, EF Core + Postgres, QuestPDF
- **Web:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Testes:** xUnit, FluentAssertions, NSubstitute, Vitest, Testing Library
- **Arquitetura:** hexagonal (portas e adaptadores), com TDD

## Estrutura

```
api/    backend .NET (domínio, casos de uso, adaptadores, API, CLI)
web/    front React
docs/   arquitetura e imagens (images/)
```

## Rodando

```bash
cd api && dotnet test
cd api && dotnet run --project src/HdsFinance.Api
cd web && npm install && npm run dev
```

Para ler um extrato pelo terminal, sem gravar nada:

```bash
cd api && dotnet run --project src/HdsFinance.Cli -- importar caminho/extrato.ofx
```

O comando mostra quantas transações leu e as entradas, saídas e o resultado de cada mês.

Para testar pela tela, suba a API e o web em dois terminais, copie `web/.env.example` para `web/.env` e abra `http://localhost:5173`. O extrato enviado é lido em memória e descartado ao fim da requisição.

## Privacidade

- Extratos, bancos de dados e relatórios nunca entram no repositório.
- No modo demonstração nenhum dado financeiro é armazenado no servidor.
- Os logs não registram valores, descrições de transações nem dados pessoais.
