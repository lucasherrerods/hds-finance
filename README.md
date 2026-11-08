# hds-finance

Fechamento mensal das finanças a partir dos extratos do Banco Inter.

O Inter mostra o extrato e o saldo dos investimentos, mas não oferece uma visão consolidada do mês: entradas x saídas, evolução do saldo, gastos por categoria e posição dos investimentos, num lugar só. Também não há API de leitura de extrato para pessoa física. O hds-finance resolve isso a partir do arquivo que o próprio banco exporta (`.ofx` ou `.csv`).

> Projeto pessoal e de portfólio, em desenvolvimento.

## Como funciona

1. Exporte o extrato no app ou no site do Inter.
2. Envie o arquivo pelo painel web, ou salve na pasta vigiada (modo pessoal).
3. O hds-finance lê as transações, categoriza e calcula o fechamento do mês.
4. O resultado aparece num painel com gráficos e num PDF, que pode ser baixado ou enviado por e-mail.

## Modos

| | Pessoal | Demonstração |
|---|---|---|
| Para quem | o dono, na própria máquina | quem quiser testar |
| Armazenamento | SQLite local, com histórico de 12 meses | nenhum: tudo em memória |
| Entrada | pasta vigiada ou upload | upload |
| Saída | painel, PDF e e-mail | painel, PDF para baixar e e-mail opcional |

No modo demonstração o servidor não guarda nada: o extrato é processado durante a requisição e descartado.

## Stack

- **API:** .NET 9, ASP.NET Core, EF Core + SQLite, QuestPDF
- **Web:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Testes:** xUnit, FluentAssertions, NSubstitute, Vitest, Testing Library
- **Arquitetura:** hexagonal (portas e adaptadores), com TDD

## Estrutura

```
api/    backend .NET (domínio, casos de uso, adaptadores, API, Worker, CLI)
web/    front React
docs/   arquitetura e imagens
```

## Rodando

```bash
cd api && dotnet test
cd api && dotnet run --project src/HdsFinance.Api
cd web && npm install && npm run dev
```

Ou, com Docker, `docker compose up --build` (API em `localhost:5000`, web em `localhost:5173`).

A aplicação ainda está no começo: por enquanto existem a estrutura, o cálculo do resumo mensal e a rota `/saude`.

## Privacidade

- Extratos, bancos de dados e relatórios nunca entram no repositório.
- No modo demonstração nenhum dado financeiro é armazenado no servidor.
- Os logs não registram valores, descrições de transações nem dados pessoais.
