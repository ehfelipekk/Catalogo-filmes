# Só Filmes

Catálogo geral de filmes do TMDB (antes se chamava "Em Cartaz" e só mostrava os filmes em cartaz). Tem pesquisa por nome, filtros de gênero e nota mínima, fileiras de Populares, Mais bem avaliados e Em cartaz no Brasil, e página de detalhes. No ar em https://catalogocartazteste.netlify.app, com código em https://github.com/ehfelipekk/Catalogo-filmes. A Netlify publica automaticamente a cada push no `main`.

## Sobre o autor

É o primeiro projeto de programação do autor, que é iniciante. O Claude escreve o código e **explica cada parte em português simples**: o que foi feito e por quê, sem jargão. O objetivo é que o autor entenda o próprio site.

## Regras do projeto

- **O token do TMDB nunca pode ser exposto.** Ele fica só em `.env` (ignorado pelo git) e na variável `TMDB_TOKEN` do painel da Netlify. O navegador nunca fala direto com `api.themoviedb.org`; tudo passa por `netlify/functions/tmdb.js`. Nunca imprima o token no chat ou em logs.
- **Só `public/` é publicado** (`netlify.toml`: `publish = "public"`). Isso existe para o `.env` nunca ser servido.
- **Sem frameworks, bundlers ou bibliotecas no navegador.** Use HTML, CSS e JavaScript puros (módulos ES), com código pequeno e comentado.
- **As telas nunca chamam `fetch` direto.** Todo acesso ao servidor passa por `public/js/api.js`.
- Região sempre `BR`, idioma sempre `pt-BR`. Campos vazios não são exibidos (nunca mostre "undefined").
- O rodapé mantém o logo do TMDB e o aviso de atribuição.
- Lógica pura vai em `public/js/util.js`, com testes. Escreva o teste antes (TDD). Rode `npm test` (node:test, sem dependências).
- O autor escolheu manter o botão "Carregar mais", e não a rolagem infinita.
- **Rotas do servidor** (`tmdb.js`, só estas): `now_playing`, `filme`, `populares`, `mais_avaliados`, `pesquisa` e `descobrir`. Para acrescentar outra, crie uma rota nova com os valores conferidos, nunca um repasse aberto.
- **Pesquisa e filtros são separados de propósito:** o TMDB não combina pesquisa por nome com gênero e nota. Com texto na pesquisa, os filtros ficam desligados e são ignorados.
- **O estado da pesquisa fica no endereço** (`?busca=`, `?genero=` e `?nota=`, lidos por `lerFiltrosDaUrl` em util.js), via um `<form method="get">` comum. Assim o Voltar e os links compartilhados funcionam.
- **"Mais bem avaliados"** usa `/discover` com no mínimo 2.000 votos (a lista `top_rated` do TMDB punha lançamentos com poucos votos na frente dos clássicos). O filtro de nota exige 100 votos.

## Como rodar

`npm run dev` (Netlify CLI, em http://localhost:8888) e `npm test`. O README tem os detalhes.

## Documentos

- Design original (decisões e porquês): `docs/superpowers/specs/2026-11-16-catalogo-filmes-design.md`
- Plano original: `docs/superpowers/plans/2026-11-16-catalogo-filmes.md`
- Design da busca, filtros e catálogo geral: `docs/superpowers/specs/2026-11-17-busca-e-filtros-design.md`
- Plano da busca e filtros: `docs/superpowers/plans/2026-11-17-busca-e-filtros.md`

## Próxima etapa planejada: usuários e favoritos

Nada disso foi construído ainda, mas a estrutura já está preparada:
- **Banco e login:** escolher quando a etapa começar. O Supabase é o candidato natural (grátis, banco e login prontos); a outra opção é o banco da própria Netlify.
- **Funções de servidor:** novas funções ao lado de `tmdb.js` (ex.: `netlify/functions/favoritos.js`), com segredos em variáveis de ambiente.
- **Acesso pelo site:** novas funções em `api.js` (ex.: `listarFavoritos()`, `favoritar(id)`).
- **O que o favorito guarda:** o `id` numérico do TMDB.
- **Interface:** o botão "Entrar" ou o nome do usuário vai no `<div id="area-usuario">` do cabeçalho (`criarCabecalho` em `public/js/componentes.js`). O botão de favoritar vai em `criarCartao` (componentes.js) e em `montarDetalhes` (`public/js/filme.js`).

## Pendências conhecidas (o autor decidiu deixar para depois)

1. Um filme inexistente (404 do TMDB) mostra "O TMDB recusou o pedido." com "Tentar de novo". O certo seria "Filme não encontrado." só com o link de volta.
2. `lerIdDaUrl` (util.js) não tem limite superior: um `id` gigante chega ao servidor e volta 400.
3. Em `api.js`, uma resposta 200 que não seja JSON vira `{}` e gera uma mensagem técnica.
4. `montarDetalhes` é exportada sem uso (de propósito, para favoritos). Falta um comentário explicando.
5. Em `filme.js`, o `backdrop_path` entra no `url()` do CSS sem escape. O risco é mínimo, porque o dado vem do TMDB.

Sugestão ao autor: trocar o token do TMDB, que apareceu numa conversa.
