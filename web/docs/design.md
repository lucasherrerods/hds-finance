# Design Rules

Regras de design visual seguras para seguir sempre. Baseadas em "Visual design rules you can safely follow every time", de Anthony Hobday (https://anthonyhobday.com/sideprojects/saferules/).

As 28 regras vêm primeiro. Depois vêm como elas valem neste projeto, as exceções e o checklist.

Nenhuma regra é obrigatória: quebre qualquer uma quando houver um bom motivo. Sem um motivo, siga-as.

## Cor

1. **Não use preto puro nem branco puro.** Use quase-preto (ex.: `#111`–`#1a1a1a`) e quase-branco (ex.: `#fafafa`). O preto puro cria contraste agressivo e o branco puro é brilhante demais.
2. **Sature os neutros.** Adicione um leve tom da cor principal aos cinzas, brancos e pretos (saturação HSB abaixo de ~5%).
3. **Tons quentes OU frios, nunca os dois.** Se saturar os neutros, escolha uma única temperatura.
4. **Cores da paleta com brilho distinto.** Cada cor deve ter um valor de brilho diferente, para que não disputem atenção.
5. **Alto contraste para o que importa.** Botões e conteúdo principal com contraste alto. Elementos estruturais e sombras com o menor contraste possível.
6. **Brilho do container dentro de limites.** A diferença de brilho HSB entre o container e o fundo deve ser de até **12% no modo escuro** e até **7% no modo claro**.
7. **Elementos mais próximos são mais claros.** Vale tanto no tema claro quanto no escuro (elevação = mais claro).
8. **Ícones ao lado de texto com menos contraste.** Ícones pesam mais que o texto, então reduza a opacidade ou o contraste deles.

## Bordas, profundidade e sombras

9. **A borda contrasta com o container e com o fundo.** No escuro, a borda é mais clara que os dois. No claro, é mais escura que os dois.
10. **O blur da sombra é o dobro do deslocamento Y.** Ex.: `0 4px 8px`. Quanto mais "perto" do usuário estiver o elemento, menor a opacidade da sombra.
11. **Sem sombras em interfaces escuras.** Use diferença de brilho para criar elevação.
12. **Não misture técnicas de profundidade.** Escolha uma (ex.: sombras suaves) e use-a de forma consistente.
13. **Não coloque dois divisores rígidos lado a lado.** Mudança de fundo, borda de container e linha divisória são divisores rígidos. Use apenas um por vez.
14. **Cantos aninhados:** raio interno = raio externo − espaçamento entre eles. Ex.: externo 30px, gap 20px → interno 10px.

## Layout e espaçamento

15. **Seja deliberado em tudo.** Espaço em branco, alinhamento, tamanho, espaçamento, cor e sombra precisam ter um motivo que você consiga explicar.
16. **Alinhe tudo com alguma coisa.** Elementos desalinhados parecem não pertencer ao layout.
17. **O alinhamento óptico costuma vencer o matemático.** Ajuste no olho quando a forma parecer descentralizada (ex.: ícone de play).
18. **Medidas relacionadas matematicamente.** Use uma escala de espaçamento e tamanho (ex.: múltiplos de 4/8: 8, 16, 24, 32, 48, 64).
19. **Grid de 12 colunas** quando usar grid horizontal (divide em 1, 2, 3, 4 e 6).
20. **Meça o espaço entre pontos de alto contraste.** Meça a partir da borda visível (ex.: do fim do texto até o início do fundo escuro), não da caixa invisível.
21. **Padding externo ≥ padding interno.** Assim os elementos relacionados continuam agrupados.
22. **Ordene por peso visual.** Em uma linha ou coluna, o elemento mais pesado vem primeiro e fica na borda externa.
23. **Simples sobre complexo, ou complexo sobre simples.** Nunca complexo sobre complexo (ex.: texto detalhado sobre foto movimentada).

## Tipografia

24. **Texto do corpo com no mínimo 16px.**
25. **Linha com cerca de 70 caracteres.** 60–80 é aceitável (`max-width: ~65ch–70ch`).
26. **Texto grande com menos letter-spacing e line-height. Texto pequeno com mais.** Ex.: títulos com `line-height: 1.1` e `letter-spacing: -0.02em`. Corpo com `line-height: 1.5–1.6`.
27. **No máximo duas fontes.**

## Componentes

28. **Padding horizontal do botão = 2× o vertical.** Ex.: `padding: 12px 24px`.

---

## Como as regras valem aqui

| Assunto | Decisão | Onde fica |
|---|---|---|
| Cores (1, 2, 3) | Neutros frios, tingidos de verde, saturação HSB perto de 5%. Nunca uma cor solta no componente. | `src/shared/styles/tokens.css` |
| Gráficos (4) | Cinco cores com pelo menos 5 pontos de brilho HSB entre elas, em cada tema. | `--color-grafico-*` |
| Profundidade (6, 7, 10, 11, 12) | Uma técnica só: superfície mais clara que o fundo, mais uma borda. Sem sombra em nenhum tema, nem brilho em volta de botão. | `bg-superficie` + `border-borda` |
| Cartão (14, 21) | `rounded-2xl` com `p-6`. Blocos dentro dele usam `rounded-xl` ou menos e `p-4`. | `Cartao`, `CartaoDeNumero` |
| Espaço (18) | Escala de 4/8: `gap-2`, `gap-4`, `gap-6`, `gap-8`, `gap-12`. | classes do Tailwind |
| Botão (28) | `px-6 py-3` no principal, `px-4 py-2` no pequeno. Um só botão preenchido por tela. | |
| Ícone com texto (8) | `opacity-70` e menor que a linha (`size-4`). | |
| Texto (24, 25, 26) | Corpo de 16px, até 60ch. Título com `tracking` negativo, rótulo em caixa alta com `tracking-wider`. | |
| Fonte (27) | Só a Inter, hospedada no próprio site. | `@fontsource-variable/inter` |
| Peso visual (22) | Na linha: ícone e nome à esquerda, valor em negrito à direita. | listas e tabelas |
| Conteúdo que importa (5) | Nome de categoria e valor em dinheiro nunca são cortados: o nome quebra a linha. Só a descrição longa pode ter reticências, com o texto inteiro no `title`. | `PrincipaisCategorias` |
| Diálogo | Um componente só, sobre o `dialog` nativo. | `Dialogo` |

As regras 1, 2, 4, 6, 7, 9 e 11 são conferidas por `src/shared/styles/tokens.test.ts`. O PDF usa as mesmas cores, em `CoresDoRelatorio.cs`.

## Exceções, e por quê

- **14px** (`text-sm`) em rótulo, legenda, data e etiqueta: são apoio, e o corpo continua em 16px. **12px** só nos números do mapa de calor, que não cabem maiores.
- **Saturação até 7%** nos neutros perto do preto: nessa faixa, um único passo de cor já vale mais de 5%.
- **Laranja do Inter e roxo do Nubank** são quentes e frios ao mesmo tempo: identificam o banco e ficam iguais nos dois temas.
- **Mancha de luz no fundo** (`bg-brilho`) no topo das páginas: é decoração, atrás de tudo, e não indica profundidade.

---

## Checklist rápido

- [ ] Sem `#000` / `#fff` puros. Neutros levemente tingidos, com uma única temperatura
- [ ] Espaçamentos e tamanhos em uma escala (4/8)
- [ ] Corpo ≥ 16px, linhas com ~70ch, no máximo 2 fontes
- [ ] Botões com padding `y : x = 1 : 2`
- [ ] Uma única técnica de profundidade: brilho e borda, sem sombras
- [ ] Nomes de categoria e valores aparecem inteiros no celular e no computador
- [ ] Container vs. fundo: Δ de brilho ≤ 7% (claro) / ≤ 12% (escuro)
- [ ] Raios aninhados: `interno = externo − gap`
- [ ] Nunca dois divisores rígidos juntos
- [ ] Ícones junto ao texto com contraste reduzido
- [ ] Tudo alinhado a alguma coisa, e cada decisão tem justificativa
