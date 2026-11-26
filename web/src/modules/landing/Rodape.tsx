import { Link } from "react-router";
import { IconeGithub, IconeLinkedin } from "../../shared";

const links = [
  {
    href: "https://github.com/lucasherrerods/hds-finance",
    rotulo: "GitHub",
    Icone: IconeGithub,
  },
  {
    href: "https://www.linkedin.com/in/lucasherrero/",
    rotulo: "LinkedIn",
    Icone: IconeLinkedin,
  },
];

const anoAtual = new Date().getFullYear();

export function Rodape() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-12 text-texto-suave sm:flex-row">
      <span>© {anoAtual} hds finance · cada centavo no seu lugar</span>
      <nav aria-label="Rodapé" className="flex items-center gap-6">
        <Link to="/privacidade" className="transition-colors hover:text-texto">
          Política de Privacidade
        </Link>
        {links.map(({ href, rotulo, Icone }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-texto"
          >
            <Icone className="size-5 opacity-80" />
            {rotulo}
          </a>
        ))}
      </nav>
    </footer>
  );
}
