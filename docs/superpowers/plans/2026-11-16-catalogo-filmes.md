# Catálogo de Filmes em Cartaz — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um site estático que lista os filmes em cartaz no Brasil (TMDB) e mostra os detalhes de cada um, publicado na Netlify, com a chave do TMDB escondida numa função serverless.

**Architecture:** São duas páginas HTML (`index.html` e `filme.html`) com JavaScript puro em módulos ES. As telas só falam com o servidor através de `js/api.js`, que chama `/.netlify/functions/tmdb`. Essa função aceita apenas duas rotas fixas e repassa o pedido ao TMDB com o token guardado em variável de ambiente. A lógica pura (formatação, escolha de trailer, classificação etc.) fica em `js/util.js` e é testada com `node:test`.

**Tech Stack:** HTML, CSS, JavaScript (módulos ES, sem bibliotecas no navegador), Netlify Functions (formato v2: `export default async (req) => Response`), Node.js (`node:test`, `fetch` nativo), Netlify CLI.

**Spec:** `docs/superpowers/specs/2026-11-16-catalogo-filmes-design.md`

## Global Constraints

- Região sempre `BR`; idioma sempre `pt-BR`. Isso vale para os textos do site e para os parâmetros do TMDB.
- O token do TMDB só existe em `process.env.TMDB_TOKEN` (no `.env` local, que é ignorado pelo git, e no painel da Netlify). Ele nunca aparece em arquivos do navegador nem no repositório.
- Nenhuma dependência no navegador e nenhum framework ou bundler. O `package.json` não tem `dependencies`; a Netlify CLI é instalada globalmente.
- Código pequeno e comentado onde ajudar, legível para um iniciante.
- Campos vazios do TMDB não são exibidos. Nunca mostre "undefined", "null", "NaN" ou "0min".
- O rodapé de todas as páginas tem o logo do TMDB e o texto exato: "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB."
- Imagens: `https://image.tmdb.org/t/p/<tamanho><caminho>`.
- As telas nunca chamam `fetch` direto; todo acesso ao servidor passa por `js/api.js`.
- O filme é sempre identificado pelo `id` numérico do TMDB.
- O cabeçalho tem `<div id="area-usuario"></div>` vazio à direita, reservado para o login futuro.
- **Pontos de explicação:** ao fim de cada task, o executor explica ao autor (iniciante, em português simples) o que foi feito e por quê, antes de seguir.

## Review Focus

1. **Token ausente ou inválido.** Sem `TMDB_TOKEN`, a função responde 500 com `{erro}`. Com token errado, o 401 do TMDB é repassado com `{erro}`. A tela mostra uma mensagem amigável e um botão "Tentar de novo". (Tarefa 1, testes `sem token` e `repassa status de erro`.)
2. **Filme com dados faltando**, como sem pôster, sem duração (`runtime` 0/null), sem sinopse ou sem gêneros. Nada de "undefined"; o pôster genérico aparece no lugar. (Tarefa 2: `urlImagem(null)`, `formatarDuracao(0)`.)
3. **"Carregar mais" na última página e filmes repetidos entre páginas.** O botão some quando `page >= total_pages`, e os repetidos são descartados pelo `id`. (Tarefa 2: `removerRepetidos`, `temMaisPaginas`.)
4. **`filme.html` sem `id` ou com `id` inválido** (`?id=abc`, `?id=-3`, `?id=12abc`). O site mostra uma mensagem com link para a lista, sem chamar o servidor. A função também recusa esse `id` com 400. (Tarefa 1: `filme com id inválido`; Tarefa 2: `lerIdDaUrl`.)
5. **Classificação BR ausente ou vazia em algumas entradas.** A primeira `certification` não vazia de `BR` é usada; se não houver nenhuma, retorna `null` e o campo é omitido. Trailer ausente → seção omitida. (Tarefa 2: `classificacaoBR`, `escolherTrailer`.)

---

### Task 1: Projeto, função `tmdb` e testes

**Files:**
- Create: `package.json`, `.gitignore`, `netlify.toml`, `.env` (não commitado)
- Create: `netlify/functions/tmdb.js`
- Test: `tests/tmdb.test.js`

**Interfaces:**
- Produces: endpoint `GET /.netlify/functions/tmdb?rota=now_playing&page=N` (o padrão de `page` é 1, e o valor deve ser um inteiro de 1 a 500) e `GET /.netlify/functions/tmdb?rota=filme&id=N` (`id` deve ser um inteiro positivo). Uma resposta de sucesso devolve o JSON do TMDB sem alterações, com `Content-Type: application/json` e `Cache-Control: public, max-age=3600`. Erros respondem `{ "erro": string }` com status 400 (parâmetro inválido), 500 (sem token), o status do próprio TMDB ou 502 (falha de rede).
- Produces: `export function montarUrlTmdb(params: URLSearchParams): string | null`, que devolve `null` quando o pedido é inválido. Também `export default async function (req: Request): Promise<Response>`.

- [ ] **Step 1: O autor prepara as contas** (o executor pede e espera)

O autor cria uma conta em themoviedb.org, abre Configurações → API e copia o **"API Read Access Token"** (o token longo, não a "API Key"). Também cria uma conta na Netlify. O executor roda `npm install -g netlify-cli` e confere com `netlify --version`.

- [ ] **Step 2: Criar o repositório e a configuração**

Rode `git init` em `C:\Users\felip\catalogo-filmes`. Crie os arquivos:
- `.gitignore`: `.env`, `node_modules/`, `.netlify/`.
- `package.json`: `"name": "catalogo-filmes"`, `"private": true`, `"type": "module"`, `"scripts": { "test": "node --test", "dev": "netlify dev" }`.
- `netlify.toml`: `[build]` com `publish = "."` e `functions = "netlify/functions"`.
- `.env`: `TMDB_TOKEN=<token colado pelo autor>`.

Verifique: `git status` **não** pode listar `.env`. Se listar, pare e corrija o `.gitignore`.

- [ ] **Step 3: Escrever os testes que falham** em `tests/tmdb.test.js`

Antes de cada teste, defina `process.env.TMDB_TOKEN = 'tok'` e troque `globalThis.fetch` por um falso que registra `(url, opts)` e devolve `new Response('{"ok":1}', {status: 200})` (ou o status do caso). Depois de cada teste, restaure o `fetch` original. Chame a função com `handler(new Request('http://x/.netlify/functions/tmdb?...'))`.

| Teste | Query | Esperado |
|---|---|---|
| `now_playing usa pt-BR, BR e page` | `rota=now_playing&page=2` | URL chamada = `https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&page=2`; `opts.headers.Authorization === 'Bearer tok'`; status 200; corpo `{"ok":1}`; `Cache-Control` = `public, max-age=3600` |
| `now_playing sem page usa 1` | `rota=now_playing` | URL termina com `&page=1` |
| `page inválida dá 400` | `page=abc`, `page=0`, `page=501`, `page=1.5` | status 400, corpo com `erro`, `fetch` não chamado |
| `filme monta a URL completa` | `rota=filme&id=550` | URL = `https://api.themoviedb.org/3/movie/550?language=pt-BR&append_to_response=credits,videos,release_dates&include_video_language=pt-BR,en` |
| `filme com id inválido dá 400` | sem id, `id=abc`, `id=-3`, `id=12abc`, `id=0` | 400, `fetch` não chamado |
| `rota desconhecida dá 400` | `rota=search`, sem rota | 400 |
| `sem token dá 500` | `delete process.env.TMDB_TOKEN` | 500, `fetch` não chamado |
| `repassa status de erro do TMDB` | o `fetch` falso devolve 401 | status 401, corpo com `erro` |
| `falha de rede dá 502` | o `fetch` falso lança um erro | 502, corpo com `erro` |

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (o módulo `netlify/functions/tmdb.js` não existe)

- [ ] **Step 5: Implementar `netlify/functions/tmdb.js`**

`montarUrlTmdb` valida os números com uma regex de inteiro (`/^\d+$/`) mais os limites. A função default responde a todos os casos de erro como JSON `{erro}`, com mensagens curtas em português.

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: todos os testes PASS

- [ ] **Step 7: Conferir com o TMDB de verdade**

Rode `netlify dev` (em segundo plano) e abra `http://localhost:8888/.netlify/functions/tmdb?rota=now_playing`.
Expected: um JSON com `results` (títulos em português) e `total_pages`.

- [ ] **Step 8: Commit** (inclui o spec e o plano)

```bash
git add .gitignore package.json netlify.toml netlify/ tests/ docs/
git commit -m "feat: função tmdb com rotas fixas e token escondido"
```

- [ ] **Step 9: Ponto de explicação.** O que é uma função serverless, por que a chave fica nela, o que é o `.env` e por que ele não vai para o git, e o que os testes verificam.

---

### Task 2: Funções puras (`util.js`) e acesso ao servidor (`api.js`)

**Files:**
- Create: `js/util.js`, `js/api.js`
- Test: `tests/util.test.js`

**Interfaces:**
- Consumes: o endpoint da Tarefa 1.
- Produces (`js/util.js`, sem DOM):
  - `urlImagem(caminho: string|null, tamanho: string): string`. Devolve `https://image.tmdb.org/t/p/${tamanho}${caminho}`, ou `'img/sem-poster.svg'` quando o caminho é vazio.
  - `formatarDuracao(minutos: number|null): string`. `135` → `"2h 15min"`, `45` → `"45min"`, `120` → `"2h"`, `0`/`null` → `""`.
  - `formatarData(iso: string|null): string`. `"2026-11-13"` → `"13/11/2026"`, vazio → `""`. Faça a conversão sem `new Date`, para evitar o deslocamento de fuso.
  - `formatarNota(nota: number|null): string`. `7.456` → `"7,5"`, `0`/`null` → `""`.
  - `removerRepetidos(atuais: Filme[], novos: Filme[]): Filme[]`. Devolve só os `novos` cujo `id` não está em `atuais` nem repetido dentro de `novos`.
  - `temMaisPaginas(dados: {page:number,total_pages:number}): boolean`.
  - `escolherTrailer(videos: {iso_639_1,site,type,key}[]): string|null`. Devolve a `key` do primeiro vídeo com `site==='YouTube'` e `type==='Trailer'`, preferindo `iso_639_1==='pt'`; senão, `null`.
  - `classificacaoBR(releaseDates: {results:{iso_3166_1,release_dates:{certification}[]}[]}|undefined): string|null`. Devolve a primeira `certification` não vazia do país `BR`, ou `null`.
  - `dataLancamentoBR(releaseDates, padrao: string|null): string|null`. Devolve o `release_date` da entrada `BR` com `type === 3` (cinema), cortado para `aaaa-mm-dd`. Se não houver, usa a primeira entrada `BR`; se ainda assim não houver, devolve `padrao`.
  - `elencoPrincipal(cast: {name,character}[]|undefined): {name,character}[]`. Devolve os 6 primeiros.
  - `lerIdDaUrl(search: string): number|null`. `"?id=550"` → `550`; vazio, `abc`, `-3`, `12abc` ou `0` → `null`.
- Produces (`js/api.js`):
  - `buscarEmCartaz(pagina: number): Promise<{page, total_pages, results: Filme[]}>`
  - `buscarFilme(id: number): Promise<FilmeDetalhado>`
  - Ambas lançam `Error` com a mensagem do `{erro}` do servidor (ou uma genérica) quando `!res.ok`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/util.test.js`. Há um teste por função, com exatamente os exemplos listados acima. Inclua também:
  - `removerRepetidos([{id:1}], [{id:1},{id:2},{id:2}])` → `[{id:2}]`
  - `temMaisPaginas({page:3,total_pages:3})` → `false`, e `{page:1,total_pages:3}` → `true`
  - `escolherTrailer([{iso_639_1:'en',site:'YouTube',type:'Trailer',key:'EN'},{iso_639_1:'pt',site:'YouTube',type:'Trailer',key:'PT'}])` → `'PT'`; `[{site:'Vimeo',type:'Trailer',key:'x'},{iso_639_1:'en',site:'YouTube',type:'Teaser',key:'y'}]` → `null`; `[]` → `null`
  - `classificacaoBR({results:[{iso_3166_1:'US',release_dates:[{certification:'R'}]},{iso_3166_1:'BR',release_dates:[{certification:''},{certification:'14'}]}]})` → `'14'`; sem BR → `null`; `undefined` → `null`
  - `dataLancamentoBR({results:[{iso_3166_1:'BR',release_dates:[{type:1,release_date:'2026-10-01T00:00:00.000Z'},{type:3,release_date:'2026-11-13T00:00:00.000Z'}]}]}, '2026-09-01')` → `'2026-11-13'`; sem BR → `'2026-09-01'`
  - `elencoPrincipal` com 8 itens → 6; com `undefined` → `[]`

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL em `util.test.js` (o módulo não existe); `tmdb.test.js` continua PASS

- [ ] **Step 3: Implementar `js/util.js` e `js/api.js`**

`api.js` monta o caminho com `URLSearchParams` a partir de `/.netlify/functions/tmdb`. Ele não é testado automaticamente, porque depende do navegador; será verificado nas Tarefas 3 e 4.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: todos os testes PASS

- [ ] **Step 5: Commit**

```bash
git add js/util.js js/api.js tests/util.test.js
git commit -m "feat: funções de formatação e acesso ao servidor"
```

- [ ] **Step 6: Ponto de explicação.** Por que separar a lógica "pura" das telas, o que `api.js` resolve agora (um só lugar para falar com o servidor) e depois (favoritos), e o que é `async/await`.

---

### Task 3: Tela de lista

**Files:**
- Create: `index.html`, `css/style.css`, `js/componentes.js`, `js/lista.js`, `img/sem-poster.svg`, `img/tmdb-logo.svg`

**Interfaces:**
- Consumes: `buscarEmCartaz`, `urlImagem`, `formatarNota`, `removerRepetidos`, `temMaisPaginas`.
- Produces (`js/componentes.js`):
  - `criarCabecalho(): HTMLElement`. Contém o nome do site com link para `index.html` e `<div id="area-usuario"></div>` vazio à direita.
  - `criarRodape(): HTMLElement`. Contém o logo do TMDB e o texto exato da atribuição (veja Global Constraints).
  - `criarCartao(filme: Filme): HTMLElement`. É um `<a href="filme.html?id=${id}">` com o pôster (`w342`, `loading="lazy"`, `alt` = título), o título e a nota (omitida se vazia). Um botão de favoritar entrará aqui no futuro.
  - `mostrarErro(container: HTMLElement, mensagem: string, aoTentarDeNovo: () => void): void`
- Visual: tema escuro (decisão do builder), grade responsiva de 2 colunas em telas estreitas até 5 ou 6 no computador.

- [ ] **Step 1: Obter as imagens.** Baixe o logo oficial do TMDB em themoviedb.org/about/logos-attribution e salve em `img/tmdb-logo.svg`. Crie `img/sem-poster.svg`, um retângulo cinza 2:3 com um ícone de filme simples.

- [ ] **Step 2: Implementar `index.html`, `css/style.css`, `js/componentes.js` e `js/lista.js`.** `index.html` carrega `<script type="module" src="js/lista.js">` e tem `<html lang="pt-BR">` e título "Em cartaz". `lista.js` faz o seguinte: insere o cabeçalho e o rodapé; mostra "Carregando…"; busca a página 1; renderiza os cartões; mostra o botão "Carregar mais" enquanto `temMaisPaginas`; acrescenta só o que vem de `removerRepetidos`; em caso de erro, chama `mostrarErro` com "Tentar de novo", que refaz a mesma página. Enquanto a busca acontece, o botão fica desabilitado, para evitar clique duplo.

- [ ] **Step 3: Verificar no navegador** com `netlify dev` aberto em `http://localhost:8888`:
  - aparecem cerca de 20 cartões com pôster, título em português e nota;
  - "Carregar mais" acrescenta mais filmes sem repetir, e some na última página;
  - o rodapé mostra o logo e o texto de atribuição;
  - com a janela estreita (DevTools, modo celular), aparecem 2 colunas sem rolagem horizontal;
  - troque o `TMDB_TOKEN` do `.env` por `x`, reinicie o `netlify dev` e recarregue: aparece a mensagem amigável com "Tentar de novo". Depois restaure o token;
  - o console do navegador não mostra erros.

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: todos os testes PASS

- [ ] **Step 5: Commit**

```bash
git add index.html css/ js/componentes.js js/lista.js img/
git commit -m "feat: tela de lista de filmes em cartaz"
```

- [ ] **Step 6: Ponto de explicação.** Como o HTML, o CSS e o JS se dividem; como um cartão é criado pelo JS a partir dos dados; o que é a grade responsiva.

---

### Task 4: Tela de detalhes

**Files:**
- Create: `filme.html`, `js/filme.js`
- Modify: `css/style.css` (estilos da tela de detalhes)

**Interfaces:**
- Consumes: `buscarFilme`, `lerIdDaUrl`, `urlImagem`, `formatarDuracao`, `formatarData`, `dataLancamentoBR`, `formatarNota`, `escolherTrailer`, `classificacaoBR`, `elencoPrincipal`, `criarCabecalho`, `criarRodape`, `mostrarErro`.
- Produces (`js/filme.js`): `montarDetalhes(filme: FilmeDetalhado): HTMLElement`. É uma função isolada, para que um botão de favoritar entre num lugar só no futuro.

- [ ] **Step 1: Implementar `filme.html` e `js/filme.js`.** O fluxo é este:
  - `lerIdDaUrl(location.search)`. Se o resultado for `null`, mostra "Filme não encontrado" com um link "← Voltar para os filmes em cartaz" e **não** chama o servidor.
  - Se houver `id`, chama `buscarFilme` e exibe: backdrop (`w1280`) ao fundo, se houver; pôster (`w500`); título; título original (só se for diferente); sinopse; gêneros separados por vírgula; duração; data no formato "Lançamento no Brasil: dd/mm/aaaa" (`formatarData(dataLancamentoBR(filme.release_dates, filme.release_date))`); classificação indicativa; nota; elenco (nome e personagem); trailer num `<iframe src="https://www.youtube-nocookie.com/embed/${key}">`.
  - Cada campo vazio, e sua etiqueta, é omitido. O `document.title` passa a ser o título do filme.
  - Se a busca falhar, usa `mostrarErro` com "Tentar de novo".

- [ ] **Step 2: Verificar no navegador:**
  - um clique num cartão da lista abre os detalhes corretos, com textos em português;
  - um filme com trailer mostra o vídeo; procure um sem trailer: a seção some;
  - `filme.html`, `filme.html?id=abc` e `filme.html?id=-3` mostram a mensagem com o link de volta;
  - `filme.html?id=999999999` mostra a mensagem de erro (o TMDB responde 404);
  - a página não exibe "undefined", "null" nem "NaN" em lugar nenhum;
  - em largura de celular, o layout continua legível e o trailer cabe na tela.

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Expected: todos os testes PASS

- [ ] **Step 4: Commit**

```bash
git add filme.html js/filme.js css/style.css
git commit -m "feat: tela de detalhes do filme"
```

- [ ] **Step 5: Ponto de explicação.** Como a página lê o `id` da URL, por que o `id` do TMDB é a "identidade" do filme (e será a dos favoritos), e como os campos vazios são tratados.

---

### Task 5: Publicação na Netlify

**Files:** nenhum novo. Pode haver pequenos ajustes se a publicação revelar algum problema.

- [ ] **Step 1: O autor cria um repositório vazio no GitHub** (sugestão de nome: `catalogo-filmes`). O executor adiciona o remoto e roda `git push -u origin main` (o branch deve se chamar `main`). Antes do push, confira mais uma vez que `git ls-files` não lista `.env`.

- [ ] **Step 2: Conectar à Netlify** (o autor, guiado pelo executor): Add new site → Import from GitHub → `catalogo-filmes`. As configurações de build vêm do `netlify.toml`. Em Site configuration → Environment variables, adicione `TMDB_TOKEN`. Depois, dispare um novo deploy.

- [ ] **Step 3: Verificar o site publicado** em `https://<nome>.netlify.app`:
  - a lista e os detalhes funcionam como nas Tarefas 3 e 4;
  - na aba Network do DevTools, nenhuma requisição vai para `api.themoviedb.org` (só para `/.netlify/functions/tmdb` e `image.tmdb.org`);
  - busque o token no código-fonte das páginas: ele não aparece.

- [ ] **Step 4: Confirmar o deploy automático.** Faça um commit pequeno (por exemplo, criar um `README.md` com o nome do projeto e como rodá-lo localmente: `npm install -g netlify-cli`, criar o `.env`, `npm run dev`), rode `git push` e confira que a Netlify publicou sozinha.

- [ ] **Step 5: Ponto de explicação.** O que acontece num `git push` até o site atualizar, onde o token mora em produção, e como a próxima etapa (banco de dados e login) vai se encaixar.
