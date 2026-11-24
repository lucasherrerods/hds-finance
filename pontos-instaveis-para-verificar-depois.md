# Pontos instáveis para verificar depois

## Teste da entrada do admin estoura o tempo às vezes
- **Onde:** `web/src/app/App.test.tsx`, "a entrada pede o código e, confirmado, abre o histórico".
- **O que se viu:** estourou 5000 ms uma vez na suíte inteira. Sozinho passa em cerca de 0,6 s, e a suíte passou nas duas repetições.
- **Suspeita:** máquina carregada (logo depois dos testes da api) no primeiro carregamento dos gráficos; a espera do `findByRole` (5 s) é igual ao limite do teste, sem folga.
- **Próximo passo:** se voltar a acontecer, aumentar o `testTimeout` do Vitest ou carregar os gráficos antes dos testes.
