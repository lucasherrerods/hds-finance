# Deploy da demonstração

Só a demonstração vai para a nuvem. O modo pessoal (SQLite, Worker, e-mail do fechamento) continua na máquina do dono, que é onde ficam os dados reais.

| Parte | Onde | Por quê |
|---|---|---|
| Front (`web/`) | Vercel | build estático do Vite |
| Api (`api/`) | Render, plano gratuito, Docker | a Vercel não roda .NET |

O plano gratuito do Render desliga a api depois de 15 minutos parada. A primeira requisição depois disso leva até um minuto, e a tela de envio avisa quando isso acontece.

## 1. Api no Render

1. No Render, crie um **Blueprint** apontando para este repositório. Ele lê o `render.yaml` da raiz e cria o serviço `hds-finance-api`, com Docker a partir de `api/Dockerfile`.
2. Preencha as variáveis que o blueprint deixa em aberto:

| Variável | Valor |
|---|---|
| `Cors__OrigensPermitidas__0` | o endereço do front na Vercel, por exemplo `https://hds-finance.vercel.app` (sem barra no fim) |
| `Email__ChaveDaApi` | a chave do Resend, se quiser o envio por e-mail |
| `Email__Remetente` | `hds finance <nao-responda@seu-dominio.com>`, de um domínio verificado no Resend |

A `Demonstracao__ChaveDeAssinatura` é gerada pelo próprio Render. A imagem já vem com `Modo=Demonstracao` e `Proxy__ConfiarNoEncaminhamento=true`, para o limite por IP usar o IP de quem chamou e não o do proxy do Render.

3. Depois do deploy, confira se `https://<sua-api>.onrender.com/health` responde `{"status":"ok"}`.

## 2. Front na Vercel

1. Importe o repositório na Vercel e defina **Root Directory** como `web`. O framework (Vite) é detectado sozinho.
2. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `VITE_URL_DA_API` | `https://<sua-api>.onrender.com` (sem barra no fim) |
| `VITE_MODO` | `demonstracao` |

3. O `web/vercel.json` manda toda rota para o `index.html`. Sem ele, abrir `/dashboard` ou `/testar` direto daria 404.

## 3. Depois do primeiro deploy

- Se o domínio do front mudar, atualize `Cors__OrigensPermitidas__0` no Render.
- O CI monta a mesma imagem, sobe o contêiner e gera um PDF a partir do extrato fictício, para garantir que o QuestPDF funciona no Linux antes de cada merge.

## Privacidade na nuvem

Valem as mesmas regras do resto do projeto: o extrato é lido em memória e descartado no fim da requisição, não existe banco nem disco, e os logs não levam valores nem descrições. O Render guarda logs de acesso (rota, status e tempo), nunca o corpo das requisições.
