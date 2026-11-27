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

## Navegação da sidebar para Investimentos falha às vezes
- **Onde:** `web/src/app/App.test.tsx`, "a sidebar leva a cada seção".
- **O que se viu:** numa rodada da suíte inteira, o título "Investimentos" não apareceu. O arquivo sozinho passou três vezes, com e sem as mudanças da lista de transações.
- **Suspeita:** a mesma do teste da entrada do admin: máquina carregada e o `findByRole` sem folga para a seção carregar.
- **Próximo passo:** tratar junto com o `testTimeout` do item acima.
