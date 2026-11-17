# Só Filmes: busca, filtros e catálogo geral (design)

Data: 2026-11-17. Continua o design original em `2026-11-16-catalogo-filmes-design.md`.

## Intenção e porquê

Hoje o site "Em Cartaz" só mostra os filmes em cartaz nos cinemas do Brasil. O autor quer ampliá-lo para ser **uma pesquisa por filmes em geral**: qualquer filme do TMDB, mesmo os que nunca passaram no cinema. Para isso entram três ferramentas: a **pesquisa por nome**, o **filtro por gênero** e o **filtro por nota mínima**. O site muda de nome para **"Só Filmes"**.

O autor é iniciante e o projeto serve para ele aprender. Valem todas as regras do `CLAUDE.md`: JavaScript puro, token só no servidor, `fetch` só em `api.js`, lógica pura em `util.js` com teste escrito antes, região `BR` e idioma `pt-BR`, campos vazios não exibidos, "Carregar mais" em vez de rolagem infinita, rodapé do TMDB mantido.

## Objetivos

- Pesquisar qualquer filme do TMDB pelo nome.
- Explorar o catálogo inteiro filtrando por gênero e/ou nota mínima.
- Nova página inicial de catálogo geral, com "em cartaz" virando só uma seção.
- O botão Voltar do navegador e o compartilhamento de links preservam a pesquisa e os filtros.

## Fora do escopo

- **Combinar pesquisa por nome com filtros.** O TMDB não oferece isso: `/search/movie` não filtra por gênero nem por nota, e `/discover/movie` não aceita nome. O autor escolheu manter os dois separados.
- Outros filtros ou ordenações (ano, idioma, "ordenar por"), pesquisa de atores, favoritos e login (são a próxima etapa).
- As pendências conhecidas do `CLAUDE.md` (404 de filme etc.), salvo onde este trabalho já mexe nelas.

## O que não pode acontecer (anti-objetivos)

- O token aparecer no navegador, ou o servidor virar um repasse aberto para qualquer endereço do TMDB.
- Filmes com pouquíssimos votos dominarem os resultados filtrados por nota (um "10" com 1 voto na frente de clássicos).
- Aparecer "undefined" ou campo vazio em filmes antigos ou obscuros, que costumam ter dados faltando.
- Conteúdo adulto nos resultados (`include_adult=false` em todos os pedidos).

## Abordagens consideradas

**Onde fica o estado da pesquisa e dos filtros.**

- **A) No endereço da página (escolhida pelo autor).** `index.html?busca=batman` ou `index.html?genero=27&nota=7`. O Voltar funciona, dá para compartilhar o link, e a leitura do endereço é lógica pura e testável.
- B) Só na memória da página. É mais simples, mas a pesquisa se perde ao abrir um filme e voltar.

**Como pesquisa e filtros convivem.**

- **A) Separados (escolhida pelo autor).** Se houver texto na pesquisa, os filtros ficam desativados e são ignorados. Sem texto, os filtros usam o `/discover`.
- B) Pesquisar e depois "peneirar" os resultados no navegador. Foi descartada porque as páginas viriam quase vazias e o "Carregar mais" ficaria imprevisível.

**Página inicial.** Ficou com a opção "catálogo geral" (escolha do autor). A outra opção era manter a vitrine de filmes em cartaz com a busca no topo.

## Como funciona

### Página inicial (`index.html`)

```
┌─ painel lateral ─┐  [ Pesquisar filme...               ] [Buscar]
│ Só Filmes        │  Gênero: [Todos ▾]  Nota: [Qualquer ▾]  [Limpar]
│ ⌂ Início         │
│ ★ Populares      │  Populares agora        ‹ ›   (3 cartões grandes)
│ ▲ Mais bem aval. │  Mais bem avaliados     ‹ ›   (top 10 numerado, de todos os tempos)
│ 🎬 Em cartaz     │  Em cartaz no Brasil    ‹ ›   (fileira de cartões)
│ ▦ Explorar       │  Explorar                     (grade + "Carregar mais")
└──────────────────┘
```

- **Populares agora:** página 1 de `/movie/popular`, com 3 cartões grandes. Substitui o "Em destaque" e usa `escolherDestaques`.
- **Mais bem avaliados:** os 10 primeiros, numerados, de `/discover/movie` com `sort_by=vote_average.desc` e `vote_count.gte=2000` (escolha do autor). Não usa `/movie/top_rated`: em 17/11/2026, essa lista trazia no topo lançamentos de 2026 com 400 a 1.500 votos, na frente de clássicos como O Poderoso Chefão. Com o mínimo de 2.000 votos, o top 10 mistura clássicos e grandes sucessos, e a nota é mais confiável.
- **Em cartaz no Brasil:** página 1 de `/movie/now_playing`, numa fileira de cartões comuns com setas, como as outras.
- **Explorar:** uma grade com "Carregar mais". Sem filtro, mostra `/movie/popular` página a página.
- Cada fileira carrega de forma independente: se uma falhar, só ela mostra o erro com "Tentar de novo", e as outras seguem normais.
- O menu lateral ganha os itens Início, Populares, Mais bem avaliados, Em cartaz e Explorar, cada um com âncora para sua seção. "Em cartaz" precisa de um ícone novo.

### Pesquisa e filtros

- Ficam num formulário HTML comum (`<form method="get" action="index.html">`) com os campos `busca`, `genero` e `nota`. Ao enviar, a página recarrega com esses valores no endereço. Por isso o Voltar e os links compartilhados funcionam sem código extra.
- **A pesquisa é enviada com Enter ou com o botão "Buscar"**, e não a cada letra digitada (decisão de quem constrói: menos pedidos e código mais simples).
- Mudar o gênero ou a nota envia o formulário na hora (um evento `change`).
- Enquanto o campo de pesquisa tiver texto, os seletores de gênero e nota ficam desativados (`disabled`). Campos desativados não vão no endereço, o que já reforça a regra.
- **"Limpar"** é um link para `index.html`, sem parâmetros.
- O gênero vai no endereço pelo número do TMDB (`?genero=27`). As opções do seletor vêm da tabela `GENEROS`, que já existe em `util.js`, em ordem alfabética.
- As opções de nota são: Qualquer, 5+, 6+, 7+ e 8+.

**Com pesquisa ou filtro ativo:** as três fileiras ficam escondidas e só a seção "Explorar" aparece, com um título que descreve o que está sendo mostrado: `Resultados para "batman"`, `Terror`, `Nota 7+` ou `Terror · nota 7+`. Os campos do formulário vêm preenchidos com os valores do endereço.

- Pesquisa por nome: `/search/movie`, na ordem do TMDB.
- Filtros: `/discover/movie` com `sort_by=popularity.desc`, `with_genres`, `vote_average.gte` e `vote_count.gte=100`. O mínimo de votos só se aplica quando há filtro de nota (decisão de quem constrói, para evitar notas "infladas" por poucos votos).
- Nenhum resultado: "Nenhum filme encontrado para "x"." ou "Nenhum filme encontrado com esses filtros.", junto com o link Limpar.

### Leitura do endereço (`util.js`, com testes primeiro)

`lerFiltrosDaUrl(search)` devolve `{ busca, genero, nota }` já validados:

- `busca`: o texto sem espaços nas pontas, com no máximo 100 caracteres. Vazio vira `''`.
- `genero`: só se for um número presente em `GENEROS`. Qualquer outra coisa vira `null`.
- `nota`: só se for 5, 6, 7 ou 8. Qualquer outra coisa vira `null`.
- Se `busca` não estiver vazia, `genero` e `nota` viram `null` (a pesquisa tem prioridade).

Também vão para `util.js`: `tituloDosResultados(filtros)`, que monta o título da seção, e a lista de gêneros ordenada para o seletor. Todas com testes.

### Servidor (`netlify/functions/tmdb.js`)

Continua aceitando só rotas conhecidas, cada uma com os valores conferidos. Entram estas, além de `now_playing` e `filme`, que já existem:

| rota | TMDB | parâmetros aceitos |
|---|---|---|
| `populares` | `/movie/popular` | `page` 1–500 |
| `mais_avaliados` | `/discover/movie?sort_by=vote_average.desc&vote_count.gte=2000` | `page` 1–500 |
| `pesquisa` | `/search/movie` | `q` com 1–100 caracteres (após tirar os espaços das pontas), `page` 1–500 |
| `descobrir` | `/discover/movie` | `genero` (inteiro positivo, opcional), `nota` (5–8, opcional), `page` 1–500 |

Todas usam `language=pt-BR`, `region=BR` e `include_adult=false`. Testado em 17/11/2026: `region=BR` não muda o resultado de `/movie/popular` nem de `/movie/top_rated`, então manter a regra "região sempre BR" não esconde filmes do catálogo. O texto da pesquisa é escapado com `encodeURIComponent` / `URLSearchParams`. Testes novos em `tests/tmdb.test.js` para cada rota e para os pedidos inválidos.

### Acesso pelo site (`public/js/api.js`)

Novas funções: `buscarPopulares(pagina)`, `buscarMaisAvaliados(pagina)`, `pesquisarFilmes(texto, pagina)` e `descobrirFilmes({ genero, nota }, pagina)`. `buscarEmCartaz` continua.

### Nome do site e textos

- Marca no painel: "Só Filmes". `<title>` da inicial: "Só Filmes". O `<h1>` escondido para leitores de tela vira "Só Filmes: pesquise e explore filmes".
- O link de volta na página do filme passa a ser "← Voltar para os filmes". **Decisão de quem constrói:** se o visitante chegou ao filme pela inicial do próprio site (o `document.referrer` tem a mesma origem e aponta para `index.html`, com ou sem parâmetros), o link volta para esse mesmo endereço e mantém a pesquisa e os filtros. Caso contrário, vai para `index.html`. A escolha do destino é uma função pura em `util.js`, com testes.
- A mensagem "Nenhum filme em cartaz no momento." vale só para a fileira de em cartaz.
- Atualizar os comentários do topo de `lista.js` e `api.js`, o README e o `CLAUDE.md` (nome, rotas novas, uso de `/discover`).

### Página do filme

A única mudança de comportamento é o link de volta (acima). Ela já funciona com qualquer `id`. Filmes antigos costumam não ter classificação, trailer ou duração. As regras atuais já escondem esses campos vazios, e isso deve ser conferido com um filme antigo de verdade.

## O que fica para quem constrói

- A organização interna de `lista.js` (pode crescer bastante; separar em funções pequenas e comentadas).
- O ícone de "Em cartaz" e os ajustes de CSS do formulário, mantendo o visual de vidro atual e funcionando no celular.
- Os textos exatos das mensagens de carregamento e erro, seguindo o tom das atuais.
