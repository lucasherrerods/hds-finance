# hds-finance

Projeto pessoal e de portfólio que transforma os extratos do Banco Inter (`.ofx` e `.csv`) num fechamento mensal: entradas, saídas, saldo, gastos por categoria, evolução de 12 meses e posição dos investimentos, num painel web e num PDF.

O banco não oferece API de leitura de extrato para pessoa física, então a entrada é sempre o arquivo exportado pelo próprio usuário. Nada de raspar o site ou o app do banco, nem guardar senha ou token de conta bancária.

## Modos

O mesmo código roda de dois jeitos. A diferença é só qual adaptador entra em cada porta.

| | Pessoal | Demonstração |
|---|---|---|
| Quem usa | só o dono, na própria máquina | amigos e recrutadores, online |
| Armazenamento | SQLite local (histórico de 12 meses) | nada: tudo em memória, durante a requisição |
| Entrada | pasta vigiada ou upload | upload |
| Saída | painel, PDF e e-mail | painel, PDF para baixar e e-mail opcional |

- **Pessoal:** o Worker vigia uma pasta (`FileSystemWatcher`). Quando chega um extrato, ele importa, e se o mês ficou completo gera o fechamento e envia por e-mail. Não há agendamento por data, porque sem extrato importado não há o que consolidar.
- **Demonstração:** o extrato é lido do stream, consolidado em memória e descartado no fim da requisição. O servidor não guarda nada de quem usa.

## Repositório

```
api/                          backend .NET
  src/
    HdsFinance.Domain/          entidades e regras puras
    HdsFinance.Application/        casos de uso e portas (interfaces)
    HdsFinance.Infrastructure/   adaptadores: OFX/CSV, SQLite, repositório em memória, PDF, e-mail
    HdsFinance.Api/              ASP.NET Core: rotas usadas pelo front
    HdsFinance.Worker/           modo pessoal: vigia a pasta de extratos
    HdsFinance.Cli/              importar e gerar relatório pelo terminal
  tests/
    HdsFinance.Domain.Tests/
    HdsFinance.Application.Tests/
    HdsFinance.Infrastructure.Tests/
    HdsFinance.Api.Tests/          rotas com WebApplicationFactory
    samples/                       extratos fictícios
  HdsFinance.sln
web/                          front React
  docs/design.md              regras visuais
docs/
  arquitetura.md
  images/                     prints com dados fictícios para o README
.github/                      CI
CLAUDE.md                     este arquivo, único para o projeto inteiro
```

Cada lado tem as próprias dependências e comandos. Rode os comandos de dentro da pasta (`cd api`, `cd web`).

## Regras gerais

Valem para a api e para o web.

### TDD
- Escreva o teste antes da funcionalidade. O teste falha, o código o faz passar, depois refatore.
- Todo bug corrigido ganha um teste que reproduz o problema, para ele não voltar.
- Lógica (parsers, cálculos, categorização, agrupamento por mês, detecção de mês completo) fica em código puro testável, fora de rotas, componentes, Worker e acesso a banco.
- No .NET, cada projeto tem o seu projeto de testes espelhando as pastas: `Domain/FluxoDeCaixa.cs` → `Domain.Tests/FluxoDeCaixaTestes.cs`. No web, `arquivo.ts` → `arquivo.test.ts`.
- Parser de extrato se testa com arquivo de exemplo em `api/tests/samples/`, sempre com dados fictícios.

### Código
- Nunca duplique código. Se algo se repete, extraia para o módulo dono ou para a pasta compartilhada.
- Pastas e projetos em inglês, nos dois lados: na api `HdsFinance.Domain`, `HdsFinance.Application`, `HdsFinance.Infrastructure` e `HdsFinance.Domain.Tests`; no web `app`, `shared`, `modules/import`, `shared/format`. O resto em português: arquivos, classes, funções, variáveis, componentes, rotas, textos da interface e testes. Termos do .NET, do React e das bibliotecas continuam como são.
- Comentários só quando explicam algo que o código não mostra, em frases simples.
- Segredos só por variável de ambiente ou `dotnet user-secrets`. Toda configuração nova entra no `appsettings.example.json` ou no `.env.example` do lado dela, com valor fictício.

### Privacidade
Regra central do projeto: **o servidor nunca guarda dados financeiros de terceiros.**
- No modo demonstração não existe banco, arquivo temporário nem cache. Upload é lido direto do stream e o PDF é gerado em `byte[]`.
- Logs nunca contêm valores, descrições de transações, nomes, e-mails, telefones ou trechos do arquivo. Erro de parser diz a linha, não o conteúdo.
- Nada de gravar corpo de requisição em middleware, APM ou ferramenta de observabilidade.
- A tela da demo avisa claramente que nada é armazenado.
- Upload tem limite de tamanho, e as rotas da demo têm limite de requisições por IP.

### Economia de tokens
- Durante o trabalho, rode só o teste afetado: `dotnet test tests/HdsFinance.Domain.Tests --nologo -v q` ou `npm test -- --reporter=dot arquivo`. A suíte inteira roda só no final.
- Não rode builds a cada passo, só antes do PR.
- Leia `web/docs/design.md` só quando a mudança for de interface.
- Não leia nem busque em `bin`, `obj`, `TestResults`, `node_modules`, `dist`, `coverage`, `*.db` e PDFs gerados.

### Problemas encontrados de passagem
- Se aparecer algo instável ou suspeito que não tem a ver com a mudança em andamento (teste intermitente, aviso estranho, bug em outra tela), não corrija nesse PR: anote em `pontos-instaveis-para-verificar-depois.md`, na raiz, com onde apareceu, o que se viu, a suspeita e o próximo passo.
- Se o problema tiver a ver com a mudança em andamento, ele é parte dela: corrija no mesmo PR e não anote.
- Quando um item desse arquivo for resolvido, apague o item na mesma correção.

### Git
- Commits convencionais, curtos e em português: `feat: lê extrato em ofx`, `fix: corrige sinal de estorno`, `test: cobre agrupamento por mês`.
- Nunca adicione co-autor nos commits nem assinatura nas descrições de PR.
- Um PR por funcionalidade ou pedido, sem misturar contextos. Abra o PR ao terminar.
- A descrição do PR é escrita para quem vai revisar: o problema, o que mudou e por quê, como foi testado e o que precisa de configuração. Sem falar com o leitor nem recados da conversa.
- Cada PR parte da `main` atualizada e aponta para a `main`.
- Mudança que precisa dos dois lados (api + tela) pode ir num PR só, desde que seja uma funcionalidade só.
- **Dados financeiros nunca entram no git.** Extratos reais, bancos SQLite, PDFs gerados, saldos, CPF, número de conta, e-mails, telefones, chaves e tokens ficam fora de commits, mensagens e PRs. O `.gitignore` cobre `*.ofx`, `*.csv`, `*.db` e `relatorios/`, exceto `api/tests/samples/`. O repositório é público, e o que entra no histórico não sai mais.

## API (`api/`)

### Stack
- .NET 9, C# 13, ASP.NET Core (minimal APIs) com OpenAPI
- EF Core + SQLite (só no modo pessoal)
- QuestPDF, cliente HTTP do serviço de e-mail transacional
- xUnit, FluentAssertions, NSubstitute

### Comandos

```bash
cd api
dotnet build                                   # compila a solução
dotnet test --nologo -v q                      # todos os testes
dotnet run --project src/HdsFinance.Api        # sobe a API
dotnet run --project src/HdsFinance.Worker     # modo pessoal: vigia a pasta de extratos
dotnet run --project src/HdsFinance.Cli -- importar caminho/extrato.ofx
dotnet run --project src/HdsFinance.Cli -- relatorio --mes 2026-10
dotnet ef migrations add <Nome> -p src/HdsFinance.Infrastructure -s src/HdsFinance.Api
dotnet format                                  # o CI falha se houver diferença
```

### Arquitetura hexagonal

O domínio fica no centro e não conhece arquivo, banco, HTTP, PDF nem e-mail. O mundo de fora fala com ele por portas, e cada tecnologia é um adaptador.

```
Domain          Transacao, Categoria, PosicaoDeInvestimento, ResumoMensal, regras de cálculo
Application        casos de uso (ImportarExtrato, ConsolidarMes, GerarRelatorio, EnviarRelatorio) e portas:
                 ILeitorDeExtrato, IRepositorioDeTransacoes, IGeradorDeRelatorio, INotificador, TimeProvider
Infrastructure   LeitorOfx, LeitorCsvInter, RepositorioSqlite, RepositorioEmMemoria,
                 RelatorioQuestPdf, NotificadorEmail
Api/Worker/Cli   só montam tudo e traduzem entrada e saída
```

Regras:
- As dependências apontam para dentro. `Domain` não referencia pacote externo, e `Domain` e `Application` não usam EF Core, ASP.NET, QuestPDF nem `HttpClient`.
- Toda dependência externa (banco, arquivo, e-mail, relógio) entra por uma porta, para os testes trocarem por um fake. Nunca use `DateTime.Now` direto: use `TimeProvider`.
- Casos de uso são testados com fakes das portas, sem banco, sem disco e sem rede.
- O modo é escolhido na composição (`Program.cs`): pessoal liga `RepositorioSqlite`, demonstração liga `RepositorioEmMemoria` com tempo de vida da requisição.
- Rotas, Worker e CLI só traduzem: leem a entrada, chamam o caso de uso, devolvem o resultado. Sem regra de negócio neles.
- Entidades do EF Core, DTOs de JSON e formatos de arquivo ficam nos adaptadores. O domínio usa os próprios tipos.
- Erros esperados (arquivo inválido, mês sem dados, falha de envio) são resultados tipados, convertidos em resposta HTTP (`ProblemDetails`) num lugar só.
- Uma fonte nova (outro banco, outro formato) é um adaptador novo de `ILeitorDeExtrato`, sem mexer no domínio.
- `nullable` habilitado e avisos tratados como erro em todos os projetos. Convenções do C#: PascalCase para tipos e métodos, `_camelCase` para campos privados, interfaces com `I`.
- Dinheiro é sempre `decimal`. Datas com `DateOnly` quando não há hora. Prefira `record` para tipos imutáveis.
- Toda mudança de banco é uma migração nova. Nunca edite uma migração que já foi para a `main`.

### Regras do domínio
- Importar o mesmo extrato duas vezes não duplica transações: cada transação tem uma chave de deduplicação (id do OFX, ou data + valor + descrição normalizada).
- Entrada é valor positivo, saída é negativo. Transferências entre contas próprias e aplicações/resgates de investimento não contam como receita nem despesa.
- O resumo do mês fecha: saldo inicial + entradas − saídas = saldo final. Existe teste para isso.
- Categorização por regras configuráveis (palavras na descrição → categoria), com "Sem categoria" como padrão.
- O fechamento automático do modo pessoal só sai quando o mês está completo, e o mesmo mês não é enviado duas vezes, a menos que forçado pela CLI.

### Relatório e e-mail
- PDF com QuestPDF: resumo do mês, entradas x saídas dos últimos 12 meses (quando houver histórico), evolução do saldo, gastos por categoria e posição dos investimentos.
- Valores em `pt-BR` (`R$ 1.234,56`), datas `dd/MM/yyyy`.
- E-mail por serviço transacional (Resend, Brevo ou SES), nunca pelo SMTP de uma conta pessoal, para não deixar cópia na caixa de enviados.
- E-mail na demonstração:
  - o endereço fica no `localStorage` do navegador e só vai ao servidor na hora do envio;
  - na primeira vez a pessoa confirma o e-mail com um código; o navegador guarda um token assinado de e-mail confirmado, e o servidor não guarda nada;
  - limite de envios por e-mail e por IP; o conteúdo é só o relatório, sem texto livre.

## Web (`web/`)

### Stack
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + shadcn/ui + lucide-react
- Recharts para os gráficos
- Vitest + Testing Library

### Comandos

```bash
cd web
npm run dev         # sobe o front
npm test            # roda os testes uma vez
npm run build       # typecheck + build
```

### Estrutura

```
web/src/
  app/              composição das telas e navegação
  shared/           ui (shadcn), utilitários (formatar moeda e data) e estilos
  modules/<nome>/   uma pasta por funcionalidade (import, dashboard, report, email)
```

### Regras do web
- Cada módulo expõe uma API pública (`index.ts`). Outros módulos importam só dela.
- Toda chamada à API fica no `api.ts` do módulo dono, nunca dentro de componentes. O endereço vem de `VITE_URL_DA_API`.
- O front não calcula o fechamento: ele mostra o que a API devolve.
- `localStorage` guarda só preferências do navegador (e-mail, token de confirmação, tema), com leitura e escrita protegidas por `try/catch`. Nunca guarda extrato nem transações.

### Design
- Toda mudança de interface segue `web/docs/design.md`.
- Use os tokens de cor e espaçamento de `src/shared/styles`, nunca cores soltas. Os tokens já nascem seguindo o design: sem preto e branco puros, neutros levemente tingidos numa só temperatura, escala de 4/8.
- Tema claro e escuro. No escuro, elevação por diferença de brilho, sem sombras.
- Gráficos usam uma paleta própria nos tokens, com brilhos distintos entre as séries e cores que funcionam nos dois temas. Entrada e saída nunca se distinguem só pela cor: use também sinal, rótulo ou ícone.
- O PDF do relatório segue as mesmas regras de cor, escala e tipografia do web, com as cores vindas de um lugar só na api.
