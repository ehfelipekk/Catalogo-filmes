# Só Filmes: busca, filtros e catálogo geral (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o site "Em Cartaz" no "Só Filmes": um catálogo geral do TMDB com pesquisa por nome, filtros de gênero e nota mínima, e uma página inicial com as fileiras Populares, Mais bem avaliados e Em cartaz.

**Architecture:** A função `netlify/functions/tmdb.js` ganha quatro rotas fixas (`populares`, `mais_avaliados`, `pesquisa`, `descobrir`), cada uma com os valores conferidos. O `api.js` ganha uma função para cada rota. A pesquisa e os filtros ficam num `<form method="get">` comum, e por isso o estado mora no endereço da página. O `util.js` lê e valida esse endereço (`lerFiltrosDaUrl`), e o `lista.js` decide se mostra as fileiras ou só a grade de resultados.

**Tech Stack:** HTML, CSS e JavaScript puros (módulos ES), Netlify Functions v2, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-17-busca-e-filtros-design.md`

## Global Constraints

- O token do TMDB só existe em `process.env.TMDB_TOKEN`. Nunca imprima o token. O navegador nunca chama `api.themoviedb.org`.
- O servidor só aceita rotas conhecidas. Qualquer parâmetro presente e inválido devolve 400 `{ "erro": "Pedido inválido." }`.
- Todas as rotas novas usam `language=pt-BR`, `region=BR` e `include_adult=false`.
- As telas nunca chamam `fetch`. Todo acesso passa por `public/js/api.js`.
- Lógica pura vai em `public/js/util.js`, com o teste escrito antes. Rode `npm test`.
- Sem frameworks nem bibliotecas no navegador. Código pequeno e comentado em português.
- Campos vazios não são exibidos (nunca "undefined"). O rodapé mantém o logo do TMDB e o aviso.
- O botão é "Carregar mais", sem rolagem infinita.
- Nome do site: **"Só Filmes"**.
- Pontos de explicação: ao fim de cada task, explique ao autor (iniciante) em português simples o que foi feito e por quê.

## Review Focus

1. **Texto com símbolos na pesquisa** (`Amélie`, `a&b #1`, `100%`): precisa chegar intacto ao TMDB, sem quebrar o endereço. Teste em Task 1.
2. **Pesquisa só com espaços, ou endereço editado à mão** (`?busca=%20%20`, `?genero=abc&nota=9`): deve mostrar a inicial normal, sem erro. Testes em Task 2 (util) e Task 1 (o servidor recusa `q` vazio).
3. **Link compartilhado com pesquisa e filtro juntos** (`?busca=batman&genero=27`): a pesquisa vence e o filtro é ignorado, tanto no título quanto no pedido. Teste em Task 2.
4. **"Carregar mais" depois da página 500**: o TMDB recusa páginas acima de 500, mas `total_pages` de populares/descobrir passa disso. O botão deve sumir na página 500. Teste em Task 2 (`temMaisPaginas`).
5. **Abrir um filme por link direto ou vindo de outro site e clicar em "← Voltar"**: deve ir para `index.html`, nunca para fora do site. Teste em Task 2 (`destinoDoVoltar`).

---

### Task 1: Rotas novas no servidor

**Files:**
- Modify: `netlify/functions/tmdb.js` (comentário do topo e `montarUrlTmdb`)
- Test: `tests/tmdb.test.js`

**Interfaces:**
- Produces: as rotas `?rota=populares&page=N`, `?rota=mais_avaliados&page=N`, `?rota=pesquisa&q=TEXTO&page=N` e `?rota=descobrir[&genero=G][&nota=N]&page=N`. `page` é opcional (padrão 1, faixa 1–500), igual ao `now_playing`.

Os endereços exatos (prefixo `B = https://api.themoviedb.org/3`, `C = language=pt-BR&region=BR&include_adult=false`):

| rota | endereço |
|---|---|
| populares | `B/movie/popular?C&page=P` |
| mais_avaliados | `B/discover/movie?C&sort_by=vote_average.desc&vote_count.gte=2000&page=P` |
| pesquisa | `B/search/movie?C&query=<encodeURIComponent(q sem espaços nas pontas)>&page=P` |
| descobrir | `B/discover/movie?C&sort_by=popularity.desc` + `&with_genres=G` (se houver gênero) + `&vote_average.gte=N&vote_count.gte=100` (se houver nota) + `&page=P` |

Regras: em `pesquisa`, o `q` sem espaços nas pontas deve ter de 1 a 100 caracteres. Em `descobrir`, `genero` ausente significa sem filtro, e presente deve ser um inteiro de 1 a `Number.MAX_SAFE_INTEGER`. `nota` ausente significa sem filtro, e presente deve ser um inteiro de 5 a 8. Qualquer valor presente e inválido (inclusive `''`) devolve `null`, o que vira 400.

- [ ] **Step 1: Escrever os testes que falham** em `tests/tmdb.test.js`, no estilo dos que já existem (`pedir(query)` e `chamadas[0].url`):

```js
const C = 'language=pt-BR&region=BR&include_adult=false';
const B = 'https://api.themoviedb.org/3';

test('populares', async () => {
  await pedir('rota=populares&page=3');
  assert.equal(chamadas[0].url, `${B}/movie/popular?${C}&page=3`);
});

test('mais_avaliados exige 2000 votos e ordena pela nota', async () => {
  await pedir('rota=mais_avaliados');
  assert.equal(chamadas[0].url, `${B}/discover/movie?${C}&sort_by=vote_average.desc&vote_count.gte=2000&page=1`);
});

test('pesquisa codifica símbolos e tira espaços das pontas', async () => {
  await pedir(`rota=pesquisa&q=${encodeURIComponent('  a&b #1 100%  ')}&page=2`);
  assert.equal(chamadas[0].url, `${B}/search/movie?${C}&query=a%26b%20%231%20100%25&page=2`);
});

test('pesquisa recusa texto vazio, só espaços ou com mais de 100 caracteres', async () => {
  for (const q of ['', '%20%20', 'a'.repeat(101)]) {
    assert.equal((await pedir(`rota=pesquisa&q=${q}`)).status, 400);
  }
  assert.equal((await pedir(`rota=pesquisa&q=${'a'.repeat(100)}`)).status, 200);
  assert.equal(chamadas.length, 1);
});

test('descobrir sem filtros, só gênero, e gênero com nota', async () => {
  await pedir('rota=descobrir');
  await pedir('rota=descobrir&genero=27&page=2');
  await pedir('rota=descobrir&genero=27&nota=7');
  assert.equal(chamadas[0].url, `${B}/discover/movie?${C}&sort_by=popularity.desc&page=1`);
  assert.equal(chamadas[1].url, `${B}/discover/movie?${C}&sort_by=popularity.desc&with_genres=27&page=2`);
  assert.equal(chamadas[2].url, `${B}/discover/movie?${C}&sort_by=popularity.desc&with_genres=27&vote_average.gte=7&vote_count.gte=100&page=1`);
});

test('descobrir recusa gênero ou nota inválidos', async () => {
  for (const q of ['genero=abc', 'genero=', 'genero=0', 'nota=4', 'nota=9', 'nota=7.5', 'page=501']) {
    assert.equal((await pedir(`rota=descobrir&${q}`)).status, 400, q);
  }
  assert.equal(chamadas.length, 0);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm test`. Expected: os 6 testes novos falham (status 400 ou `chamadas[0]` indefinido). Os antigos passam.

- [ ] **Step 3: Implementar os quatro ramos novos em `montarUrlTmdb(params)`**, reaproveitando `inteiroEntre`. Coloque o trecho comum `language=pt-BR&region=BR&include_adult=false` numa constante. Monte a parte de `descobrir` com `if`s, na ordem da tabela. Atualize o comentário do topo listando as seis rotas.

- [ ] **Step 4: Rodar e ver passar.** Run: `npm test`. Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/tmdb.js tests/tmdb.test.js
git commit -m "feat(servidor): rotas de populares, mais avaliados, pesquisa e descobrir"
```

---

### Task 2: Lógica pura de filtros, títulos e voltar (`util.js`)

**Files:**
- Modify: `public/js/util.js`
- Test: `tests/util.test.js`

**Interfaces:**
- Consumes: a constante `GENEROS`, que já existe em `util.js`.
- Produces:
  - `lerFiltrosDaUrl(search: string) -> { busca: string, genero: number|null, nota: number|null }`
  - `temFiltroAtivo(filtros) -> boolean`
  - `tituloDosResultados(filtros) -> string`
  - `mensagemSemResultados(filtros) -> string`
  - `listaDeGeneros() -> Array<{ id: number, nome: string }>`
  - `destinoDoVoltar(referrer: string, origem: string) -> string`
  - `temMaisPaginas(dados)` muda: agora para em 500.
  - `maisBemAvaliados` é **removida**, junto com o seu teste. A fileira passa a vir pronta do servidor e o `lista.js` deixa de usá-la na Task 4. Até lá, o `lista.js` antigo ainda a importa, então **remova-a só na Task 4**, no mesmo commit em que o `lista.js` é reescrito.

- [ ] **Step 1: Escrever os testes que falham** em `tests/util.test.js` (acrescente os nomes ao `import`):

```js
test('lerFiltrosDaUrl lê busca, gênero e nota válidos', () => {
  assert.deepEqual(lerFiltrosDaUrl('?genero=27&nota=7'), { busca: '', genero: 27, nota: 7 });
  assert.deepEqual(lerFiltrosDaUrl('?busca=%20batman%20'), { busca: 'batman', genero: null, nota: null });
  assert.deepEqual(lerFiltrosDaUrl(''), { busca: '', genero: null, nota: null });
});

test('lerFiltrosDaUrl ignora valores inválidos e só espaços', () => {
  assert.deepEqual(lerFiltrosDaUrl('?busca=%20%20&genero=abc&nota=9'), { busca: '', genero: null, nota: null });
  assert.deepEqual(lerFiltrosDaUrl('?genero=99999&nota=4'), { busca: '', genero: null, nota: null });
  assert.deepEqual(lerFiltrosDaUrl('?genero=&nota='), { busca: '', genero: null, nota: null });
});

test('lerFiltrosDaUrl: a pesquisa vence os filtros e é cortada em 100 caracteres', () => {
  assert.deepEqual(lerFiltrosDaUrl('?busca=batman&genero=27&nota=7'), { busca: 'batman', genero: null, nota: null });
  assert.equal(lerFiltrosDaUrl(`?busca=${'a'.repeat(150)}`).busca.length, 100);
});

test('temFiltroAtivo', () => {
  assert.equal(temFiltroAtivo({ busca: '', genero: null, nota: null }), false);
  assert.equal(temFiltroAtivo({ busca: 'x', genero: null, nota: null }), true);
  assert.equal(temFiltroAtivo({ busca: '', genero: null, nota: 5 }), true);
});

test('tituloDosResultados', () => {
  assert.equal(tituloDosResultados({ busca: 'batman', genero: null, nota: null }), 'Resultados para "batman"');
  assert.equal(tituloDosResultados({ busca: '', genero: 27, nota: null }), 'Terror');
  assert.equal(tituloDosResultados({ busca: '', genero: null, nota: 7 }), 'Nota 7+');
  assert.equal(tituloDosResultados({ busca: '', genero: 27, nota: 7 }), 'Terror · nota 7+');
  assert.equal(tituloDosResultados({ busca: '', genero: null, nota: null }), 'Explorar');
});

test('mensagemSemResultados', () => {
  assert.equal(mensagemSemResultados({ busca: 'xyz', genero: null, nota: null }), 'Nenhum filme encontrado para "xyz".');
  assert.equal(mensagemSemResultados({ busca: '', genero: 27, nota: 8 }), 'Nenhum filme encontrado com esses filtros.');
  assert.equal(mensagemSemResultados({ busca: '', genero: null, nota: null }), 'Nenhum filme encontrado.');
});

test('listaDeGeneros vem em ordem alfabética', () => {
  const lista = listaDeGeneros();
  assert.equal(lista.length, 19);
  assert.deepEqual(lista[0], { id: 28, nome: 'Ação' });
  assert.deepEqual(lista.at(-1), { id: 53, nome: 'Thriller' });
});

test('destinoDoVoltar volta para a pesquisa só se veio da inicial do próprio site', () => {
  const o = 'http://localhost:8888';
  assert.equal(destinoDoVoltar(`${o}/index.html?busca=batman`, o), 'index.html?busca=batman');
  assert.equal(destinoDoVoltar(`${o}/?genero=27#explorar`, o), 'index.html?genero=27');
  assert.equal(destinoDoVoltar(`${o}/filme.html?id=2`, o), 'index.html');
  assert.equal(destinoDoVoltar('https://google.com/index.html?q=x', o), 'index.html');
  assert.equal(destinoDoVoltar('', o), 'index.html');
});

test('temMaisPaginas para na página 500, o limite do TMDB', () => {
  assert.equal(temMaisPaginas({ page: 499, total_pages: 1001 }), true);
  assert.equal(temMaisPaginas({ page: 500, total_pages: 1001 }), false);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm test`. Expected: os testes novos falham (`is not a function` / `temMaisPaginas` devolve true).

- [ ] **Step 3: Implementar em `public/js/util.js`**, cada função com um comentário de exemplo, como as que já existem:
  - `lerFiltrosDaUrl`: use `URLSearchParams`. Para `busca`: `trim()` e depois `slice(0, 100)`. `genero` vale só se for `/^\d+$/` e existir em `GENEROS`. `nota` vale só se for 5, 6, 7 ou 8. Se `busca !== ''`, zere `genero` e `nota`.
  - `tituloDosResultados` e `mensagemSemResultados`: usam exatamente os textos dos testes, com o nome do gênero tirado de `GENEROS`.
  - `listaDeGeneros`: `Object.entries(GENEROS)` em ordem `localeCompare(…, 'pt-BR')`.
  - `destinoDoVoltar`: use `new URL(referrer)` dentro de `try`, porque referrer vazio ou inválido vai para `'index.html'`. Aceite só se `url.origin === origem` e o `pathname` for `/` ou terminar em `/index.html`. Devolve `'index.html' + url.search`, sem o `#`.
  - `temMaisPaginas`: `dados.page < Math.min(dados.total_pages, 500)`.

- [ ] **Step 4: Rodar e ver passar.** Run: `npm test`. Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add public/js/util.js tests/util.test.js
git commit -m "feat(util): ler filtros do endereço, títulos dos resultados e destino do voltar"
```

---

### Task 3: Funções novas em `api.js`

**Files:**
- Modify: `public/js/api.js`
- Test: `tests/pagina.test.js`

**Interfaces:**
- Produces (todas devolvem `{ page, total_pages, results }`):
  - `buscarPopulares(pagina)` → `{ rota: 'populares', page }`
  - `buscarMaisAvaliados(pagina)` → `{ rota: 'mais_avaliados', page }`
  - `pesquisarFilmes(texto, pagina)` → `{ rota: 'pesquisa', q: texto, page }`
  - `descobrirFilmes({ genero, nota }, pagina)` → `{ rota: 'descobrir', genero?, nota?, page }`. Só inclui `genero`/`nota` quando não forem `null`, nessa ordem.

- [ ] **Step 1: Escrever o teste que falha** em `tests/pagina.test.js`:

```js
test('api.js monta o pedido certo para cada rota nova', async () => {
  const pedidos = [];
  globalThis.fetch = async (url) => {
    pedidos.push(url);
    return new Response('{"page":1,"total_pages":1,"results":[]}');
  };
  await buscarPopulares(2);
  await buscarMaisAvaliados(1);
  await pesquisarFilmes('a&b', 1);
  await descobrirFilmes({ genero: 27, nota: null }, 3);
  await descobrirFilmes({ genero: null, nota: 7 }, 1);
  const F = '/.netlify/functions/tmdb?';
  assert.deepEqual(pedidos, [
    `${F}rota=populares&page=2`,
    `${F}rota=mais_avaliados&page=1`,
    `${F}rota=pesquisa&q=a%26b&page=1`,
    `${F}rota=descobrir&genero=27&page=3`,
    `${F}rota=descobrir&nota=7&page=1`,
  ]);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm test`. Expected: falha com erro de import (`does not provide an export named`).
- [ ] **Step 3: Implementar as quatro funções** em `api.js`, todas usando `pedir(parametros)`. Atualize o comentário do topo.
- [ ] **Step 4: Rodar e ver passar.** Run: `npm test`. Expected: todos passam.
- [ ] **Step 5: Commit**

```bash
git add public/js/api.js tests/pagina.test.js
git commit -m "feat(api): funções para populares, mais avaliados, pesquisa e descobrir"
```

---

### Task 4: Nova página inicial (HTML, menu, CSS e `lista.js`)

**Files:**
- Modify: `public/index.html` (reescrever o `<main>` e o `<title>`)
- Modify: `public/js/componentes.js:14-58` (`ICONES`, marca e itens do menu)
- Modify: `public/js/lista.js` (reescrever)
- Modify: `public/css/style.css` (estilos do formulário)
- Modify: `public/js/util.js` e `tests/util.test.js` (remover `maisBemAvaliados`)
- Test: `tests/pagina.test.js`

**Interfaces:**
- Consumes: as funções da Task 2 (`lerFiltrosDaUrl`, `temFiltroAtivo`, `tituloDosResultados`, `mensagemSemResultados`, `listaDeGeneros`) e da Task 3 (`buscarPopulares`, `buscarMaisAvaliados`, `pesquisarFilmes`, `descobrirFilmes`), além de `buscarEmCartaz`, `escolherDestaques`, `removerRepetidos`, `temMaisPaginas`, `criarCartao`, `criarDestaque`, `mostrarErro` e `adicionarSetas`.

**Estrutura do `<main>`** (ids fixos, usados pelo teste e pelo menu):

- `<h1 class="so-leitor">Só Filmes: pesquise e explore filmes</h1>`, e `<title>Só Filmes</title>`.
- `<form id="busca" class="busca" role="search" method="get" action="index.html">` contendo:
  - um `<label class="so-leitor" for="campo-busca">Pesquisar filme</label>`;
  - `<input id="campo-busca" name="busca" type="search" maxlength="100" placeholder="Pesquisar filme...">`;
  - `<button class="botao" type="submit">Buscar</button>`;
  - um `<label>` "Gênero" com `<select id="filtro-genero" name="genero">`, cuja primeira opção é `<option value="">Todos</option>` (o resto vem do JS);
  - um `<label>` "Nota" com `<select id="filtro-nota" name="nota">` e as opções `""`=Qualquer, `5`=5+, `6`=6+, `7`=7+, `8`=8+;
  - `<a class="botao" href="index.html">Limpar</a>`.
- Seções, nesta ordem, cada uma com `<h2>`, a fileira e um `<div class="estado" role="status">` próprio:
  - `#populares`: `h2` "Populares agora", `#fileira-populares.fileira.fileira-grande`, `#estado-populares`;
  - `#ranking`: `h2` "Mais bem avaliados", `<ol id="fileira-ranking" class="fileira">`, `#estado-ranking`;
  - `#em-cartaz`: `h2` "Em cartaz no Brasil", `#fileira-em-cartaz.fileira`, `#estado-em-cartaz`;
  - `#explorar`: `<h2 id="titulo-explorar">Explorar</h2>`, `#grade`, `#estado`, `#carregar-mais`. Mantenha essa ordem, que o teste antigo confere.
- As seções **não** começam com `hidden`. Cada uma mostra "Carregando…" no seu estado.

**Menu** (`criarCabecalho`): a marca vira `'Só Filmes'`. Os itens passam a ser `['inicio','Início','index.html']`, `['destaque','Populares','index.html#populares']`, `['ranking','Mais bem avaliados','index.html#ranking']`, `['cartaz','Em cartaz','index.html#em-cartaz']` e `['todos','Explorar','index.html#explorar']`. Acrescente `ICONES.cartaz = '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/>'` (um ingresso).

**Comportamento do `lista.js`:**
1. `filtros = lerFiltrosDaUrl(location.search)`. Preencha o formulário com eles e as opções de gênero com `listaDeGeneros()`.
2. Formulário:
   - o evento `input` no campo desativa os dois `<select>` enquanto `campo.value.trim() !== ''`;
   - o `change` nos `<select>` chama `form.requestSubmit()`;
   - no `submit`, desative os campos com valor vazio antes de enviar, para não irem `busca=&nota=` no endereço.
3. Sem filtro ativo: carregue as três fileiras em paralelo, cada uma com `carregarFileira(idSecao, buscar, montarItens)`:
   - mostra "Carregando…";
   - em erro, usa `mostrarErro(estado, e.message, tentarDeNovo)`;
   - se não houver nenhum item, esconde a seção.

   Os itens de cada fileira:
   - populares = `escolherDestaques(results, 3).map(criarDestaque)`;
   - ranking = os 10 primeiros, cada um em `<li>` com `criarCartao(f, i + 1)`;
   - em cartaz = `results.map((f) => criarCartao(f))`.

   Coloque `adicionarSetas` nas três.
4. Com filtro ativo: esconda `#populares`, `#ranking` e `#em-cartaz`, e troque o texto de `#titulo-explorar` por `tituloDosResultados(filtros)`.
5. A grade usa a mesma lógica de "Carregar mais" de hoje, com uma fonte escolhida uma vez:
   - `busca` → `pesquisarFilmes`;
   - `genero` ou `nota` → `descobrirFilmes`;
   - nenhum dos dois → `buscarPopulares`.

   Se não vier nenhum filme, a mensagem é `mensagemSemResultados(filtros)`.
6. Remova `maisBemAvaliados` de `util.js` e o teste dela, porque não é mais usada.

**CSS:** o formulário segue o visual de vidro das seções. Em 360px de largura ele quebra em linhas sem rolagem horizontal, e o campo de busca ocupa a linha inteira. `select:disabled` fica visivelmente apagado.

- [ ] **Step 1: Escrever o teste que falha** em `tests/pagina.test.js`:

```js
test('a inicial tem o formulário de busca e as quatro seções na ordem', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Só Filmes<\/title>/);
  assert.match(html, /<form[^>]*id="busca"[^>]*method="get"[^>]*action="index.html"/);
  for (const nome of ['busca', 'genero', 'nota']) assert.match(html, new RegExp(`name="${nome}"`));
  const ordem = ['id="populares"', 'id="ranking"', 'id="em-cartaz"', 'id="explorar"'].map((s) => html.indexOf(s));
  assert.ok(ordem.every((p, i) => p > 0 && (i === 0 || p > ordem[i - 1])));
  assert.doesNotMatch(html, /em cartaz nos cinemas do Brasil/i);
});
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `npm test`. Expected: o teste novo falha.
- [ ] **Step 3: Reescrever `index.html`, `componentes.js` (menu) e `lista.js`, remover `maisBemAvaliados` e acrescentar o CSS**, como descrito acima.
- [ ] **Step 4: Rodar e ver passar.** Run: `npm test`. Expected: todos passam.
- [ ] **Step 5: Conferir no navegador.** Run: `npm run dev` e abra http://localhost:8888. Confira:
  - as três fileiras e a grade aparecem;
  - pesquisar "batman" com Enter mostra só a grade com `Resultados para "batman"`;
  - digitar no campo apaga os seletores;
  - escolher "Terror" atualiza na hora e o endereço vira `?genero=27`;
  - nota 8+ mostra só filmes com nota ≥ 8;
  - "Limpar" volta à inicial;
  - pesquisar "xyzxyzxyz" mostra "Nenhum filme encontrado para "xyzxyzxyz"." e nada de "undefined";
  - em 360px de largura (ferramentas do navegador), não há rolagem horizontal.
- [ ] **Step 6: Commit**

```bash
git add public/index.html public/js/componentes.js public/js/lista.js public/css/style.css public/js/util.js tests/util.test.js tests/pagina.test.js
git commit -m "feat: página inicial Só Filmes com busca, filtros e fileiras novas"
```

---

### Task 5: "← Voltar" mantém a pesquisa

**Files:**
- Modify: `public/js/filme.js:22-26` (`linkVoltar`)

**Interfaces:**
- Consumes: `destinoDoVoltar(referrer, origem)` da Task 2 (já testada).

- [ ] **Step 1: Alterar `linkVoltar`.** O texto passa a ser `'← Voltar para os filmes'` e o `href` passa a ser `destinoDoVoltar(document.referrer, location.origin)`.
- [ ] **Step 2: Conferir no navegador.**
  - Pesquise "batman", abra um filme e clique em "← Voltar": a pesquisa continua lá.
  - Abra `http://localhost:8888/filme.html?id=19` direto numa aba nova: "← Voltar" leva à inicial.
  - Esse filme (Metropolis, de 1927) é antigo e não deve mostrar "undefined" nem campos vazios.
  - `npm test` continua passando.
- [ ] **Step 3: Commit**

```bash
git add public/js/filme.js
git commit -m "feat(filme): voltar mantém a pesquisa e os filtros"
```

---

### Task 6: Documentação

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Atualizar o `CLAUDE.md`.**
  - Título e primeira linha: o site se chama "Só Filmes" e é um catálogo geral do TMDB, com pesquisa e filtros.
  - Liste as seis rotas de `tmdb.js`.
  - Registre que pesquisa e filtros são separados de propósito (o TMDB não combina os dois) e que o estado fica no endereço (`?busca=`, `?genero=`, `?nota=`).
  - Registre que "Mais bem avaliados" usa `/discover` com no mínimo 2.000 votos.
  - Aponte para o design e o plano novos.
  - Mantenha a seção de favoritos e a lista de pendências.
- [ ] **Step 2: Atualizar o `README.md`**: o nome e a descrição do que o site faz.
- [ ] **Step 3: Rodar `npm test`.** Expected: todos passam.
- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: Só Filmes no README e no CLAUDE.md"
```
