# Pontos instáveis para verificar depois

## Teste da entrada do admin estoura o tempo às vezes
- **Onde:** `web/src/app/App.test.tsx`, "a entrada pede o código e, confirmado, abre o histórico".
- **O que se viu:** estourou 5000 ms uma vez na suíte inteira. Sozinho passa em cerca de 0,6 s, e a suíte passou nas duas repetições.
- **Suspeita:** máquina carregada (logo depois dos testes da api) no primeiro carregamento dos gráficos; a espera do `findByRole` (5 s) é igual ao limite do teste, sem folga.
- **Próximo passo:** se voltar a acontecer, aumentar o `testTimeout` do Vitest ou carregar os gráficos antes dos testes.

## Aviso de servidor acordando falha na suíte inteira
- **Onde:** `web/src/modules/import/EnvioDeExtrato.test.tsx`, "se a api demora, avisa que o servidor pode estar acordando".
- **O que se viu:** falhou em três de três rodadas da suíte inteira, sem achar o texto. Sozinho, passa sempre.
- **Suspeita:** o teste liga os relógios falsos depois que outro teste deixou trabalho pendente, ou a máquina carregada atrasa o efeito que arma o relógio de 4 s antes do `advanceTimersByTimeAsync`.
- **Próximo passo:** ligar `vi.useFakeTimers()` num `beforeEach` desse bloco, com `vi.useRealTimers()` no `afterEach`, e conferir se o envio chega a começar antes de avançar o relógio.
