# Pontos instáveis para verificar depois

## Teste do exemplo com gráficos às vezes estoura o tempo

- **Onde:** `web/src/modules/landing/Landing.test.tsx`, teste "mostra a evolução dos meses fictícios".
- **O que se viu:** numa rodada de `npm test` com a suíte inteira, o `findByRole` da tabela "Entradas e saídas por mês" não encontrou o elemento dentro de 5 s. Rodando de novo três vezes, passou em todas.
- **Suspeita:** os gráficos carregam com `React.lazy`, e o primeiro `import()` do Recharts no Vitest leva mais tempo quando vários arquivos de teste rodam em paralelo.
- **Próximo passo:** nos testes da landing, simular o módulo dos gráficos (`vi.mock`) em vez de esperar o carregamento real, ou carregar o módulo antes do teste. Conferir com a suíte inteira rodando várias vezes.
