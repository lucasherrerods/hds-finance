import { Revelar } from '../../shared'
import { pontos } from './pontos'

const CODIGO = 'https://github.com/lucasherrerods/hds-finance'

const detalhes = [
  {
    titulo: 'Quem hospeda',
    texto: 'As páginas ficam na Vercel e o servidor que lê o extrato, na Render. Como qualquer hospedagem, elas podem registrar dados técnicos do acesso, como IP, horário e endereço da página, pelas políticas delas. O conteúdo do seu arquivo não entra nos registros do hds finance.',
  },
  {
    titulo: 'Registros do servidor',
    texto: 'Valores, descrições, nomes e trechos do arquivo nunca são registrados. Se o arquivo tem um erro, a mensagem diz só a linha. O IP é usado em memória, por um minuto, para limitar o excesso de envios.',
  },
  {
    titulo: 'PDF, imagem e compartilhar',
    texto: 'O PDF é montado na memória do servidor e entregue a você. A imagem é desenhada no seu navegador. Ao compartilhar, o arquivo vai para o aplicativo que você escolher, e passa a valer a política dele.',
  },
  {
    titulo: 'Seus direitos',
    texto: 'Pela LGPD, você pode pedir acesso, correção ou exclusão dos seus dados. Aqui não sobra nada para consultar ou apagar, porque o extrato não é guardado. Dúvidas podem ser abertas no GitHub, sem incluir dados pessoais.',
  },
]

export function PoliticaDePrivacidade() {
  return (
    <article className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-16 pb-24">
      <Revelar className="flex flex-col gap-4">
        <h1 className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Política de privacidade</h1>
        <p className="max-w-[60ch] text-lg text-texto-suave">
          Esta página vale para quem usa o hds finance sem conta e explica, em linguagem simples, o que acontece com os seus dados.
        </p>
      </Revelar>
      <div className="grid gap-8 md:grid-cols-2">
        {[...pontos, ...detalhes].map((p, i) => (
          <Revelar key={p.titulo} atraso={(i % 2) * 0.08}>
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{p.titulo}</h2>
              <p className="max-w-[60ch] text-texto-suave">{p.texto}</p>
            </section>
          </Revelar>
        ))}
      </div>
      <Revelar>
      <p className="max-w-[60ch] text-texto-suave">
        Não precisa acreditar na palavra: o{' '}
        <a href={CODIGO} target="_blank" rel="noreferrer" className="font-medium text-primaria underline underline-offset-4">
          código é aberto
        </a>{' '}
        e dá para conferir cada promessa.
      </p>
      </Revelar>
    </article>
  )
}
