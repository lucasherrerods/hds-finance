# Deploy

A demonstração e a área admin vão juntas para a nuvem. A demonstração não guarda nada; a área admin guarda só os dados do dono, no Postgres do Neon.

| Parte | Onde | Por quê |
|---|---|---|
| Front (`web/`) | Vercel | build estático do Vite |
| Api (`api/`) | Render, plano gratuito, Docker | a Vercel não roda .NET |
| Banco da área admin | Neon, Postgres gratuito | só os dados do dono |

O plano gratuito do Render desliga a api depois de 15 minutos parada. A primeira requisição depois disso leva até um minuto, e a tela de envio avisa quando isso acontece.

## 1. Api no Render

1. No Render, crie um **Blueprint** apontando para este repositório. Ele lê o `render.yaml` da raiz e cria o serviço `hds-finance-api`, com Docker a partir de `api/Dockerfile`.
2. Preencha as variáveis que o blueprint deixa em aberto:

| Variável | Valor |
|---|---|
| `Cors__OrigensPermitidas__0` | o endereço do front na Vercel, por exemplo `https://hds-finance.vercel.app` (sem barra no fim) |
| `Admin__Email` | o seu e-mail: o único que entra na área admin |
| `ConnectionStrings__Banco` | a connection string do Neon (`Host=...;Database=...;Username=...;Password=...;SSL Mode=Require`) |
| `Email__ChaveDaApi` | a chave do Resend: manda o código de acesso e o fechamento |
| `Email__Remetente` | `hds finance <nao-responda@seu-dominio.com>`, de um domínio verificado no Resend |
| `Email__Destinatario` | o seu e-mail, para o fechamento do mês |

A `Admin__ChaveDeAssinatura` é gerada pelo próprio Render; trocar o valor derruba as sessões abertas. `Admin__CookieEntreSites=true` já vem no blueprint: front e api ficam em domínios diferentes, então o cookie de sessão precisa de `SameSite=None; Secure`. A imagem já vem com `Proxy__ConfiarNoEncaminhamento=true`, para o limite por IP usar o IP de quem chamou e não o do proxy do Render.

Sem `Admin__Email` ou `ConnectionStrings__Banco`, a api sobe só com a demonstração. As migrações rodam sozinhas quando a api sobe com a área admin ligada.

3. Depois do deploy, confira se `https://<sua-api>.onrender.com/health` responde `{"status":"ok"}`.

## 2. Front na Vercel

1. Importe o repositório na Vercel e defina **Root Directory** como `web`. O framework (Vite) é detectado sozinho.
2. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `VITE_URL_DA_API` | `https://<sua-api>.onrender.com` (sem barra no fim) |

3. O `web/vercel.json` manda toda rota para o `index.html`. Sem ele, abrir `/dashboard`, `/testar` ou `/admin` direto daria 404.

A área admin fica em `/admin/entrar`, sem link no site.

## 3. Depois do primeiro deploy

- Se o domínio do front mudar, atualize `Cors__OrigensPermitidas__0` no Render.
- O CI monta a mesma imagem, sobe o contêiner e gera um PDF a partir do extrato fictício, para garantir que o QuestPDF funciona no Linux antes de cada merge.

## Privacidade na nuvem

Valem as mesmas regras do resto do projeto: na demonstração o extrato é lido em memória e descartado no fim da requisição, sem banco nem disco, e os logs não levam valores nem descrições. O banco do Neon guarda só o que o admin incluiu. O Render guarda logs de acesso (rota, status e tempo), nunca o corpo das requisições.
