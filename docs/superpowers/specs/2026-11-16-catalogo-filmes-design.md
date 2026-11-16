# Catálogo de Filmes em Cartaz — Design

Data: 2026-11-16

## Intenção e porquê

Um site que mostra os filmes **em cartaz nos cinemas do Brasil**, usando dados do TMDB (The Movie Database). É o **primeiro projeto de programação** do autor, que tem pouca experiência com qualquer linguagem. O objetivo principal é aprender os fundamentos da web e chegar a um site publicado e funcionando. O público é geral: qualquer pessoa pode abrir o site.

Sucesso = um site no ar, num endereço público, onde qualquer pessoa vê os filmes em cartaz e abre os detalhes de cada um. Além disso, o autor entende cada parte do código, que é escrito pelo Claude e explicado a ele.

## Objetivos

- Uma tela de **lista**: os filmes em cartaz no Brasil, com pôster, título em português e nota média do TMDB.
- Uma tela de **detalhes** por filme: pôster/backdrop, título, título original, sinopse, gêneros, duração, data de lançamento no Brasil, classificação indicativa brasileira, nota, elenco principal (cerca de 6 nomes) e trailer (YouTube) quando houver.
- Textos do site e dados em português (pt-BR).
- Site publicado de graça na Netlify.
- Atribuição exigida pelo TMDB: logo do TMDB e o aviso "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB", no rodapé.

## Fora do escopo (por enquanto)

- Cinemas, horários de sessão, preços e venda de ingressos. O TMDB não tem esses dados.
- Outras regiões além do Brasil.
- Busca, filtros por gênero e streaming ("onde assistir").
- Usuários, login e favoritos. Estão previstos para uma etapa futura; veja "Caminho aberto para banco de dados".
- App de celular instalável.

## Anti-objetivos (o que faria o projeto fracassar mesmo funcionando)

- **A chave do TMDB visível no navegador ou no repositório público.** A chave só pode existir como variável de ambiente no servidor (Netlify) e num arquivo local ignorado pelo git.
- **Código que o autor não entende.** Nada de frameworks, bundlers ou bibliotecas que escondam o funcionamento. Cada arquivo deve ser pequeno, comentado onde ajudar, e legível para um iniciante.
- Escopo crescendo antes da versão básica estar no ar.

## Restrições

- **Limitação dos dados:** a lista "em cartaz" do TMDB (`/movie/now_playing` com `region=BR`) é aproximada. Ela se baseia nas datas de lançamento por país, não na programação real das salas. Isso é aceito.
- **Trailers em pt-BR** nem sempre existem. Busque vídeos em pt-BR e, se não houver, use os em inglês.
- **Classificação indicativa:** vem de `release_dates`, filtrando pelo país `BR`. Pode estar vazia; nesse caso, não exiba o campo.
- Imagens são servidas pelo CDN do TMDB (`https://image.tmdb.org/t/p/<tamanho><caminho>`), carregadas direto pelo navegador. Isso não expõe a chave.
- Tudo precisa ser gratuito: a conta e a chave do TMDB e o plano free da Netlify.

## Abordagens consideradas

1. **HTML, CSS e JavaScript puros + uma função serverless da Netlify que guarda a chave. ESCOLHIDA.** Ensina a base da web sem camadas extras e mantém a chave em segredo. O custo é aprender o conceito de "servidor": uma função de poucas linhas.
2. **HTML, CSS e JavaScript puros chamando o TMDB direto do navegador.** É o mais simples, mas expõe a chave a qualquer visitante. Foi descartada por ensinar um mau hábito.
3. **React/Next.js.** Foi descartada por acrescentar muitos conceitos e virar "copiar sem entender" para quem está começando.

A escolha das ferramentas foi delegada pelo autor; a abordagem 1 foi a recomendação aceita.

## O desenho

### Estrutura de arquivos (proposta)

```
catalogo-filmes/
  index.html            lista de filmes em cartaz
  filme.html            detalhes de um filme (?id=123)
  css/style.css
  js/api.js             funções que chamam a função serverless
  js/lista.js           monta a tela de lista
  js/filme.js           monta a tela de detalhes
  netlify/functions/tmdb.js   proxy para o TMDB, com a chave
  netlify.toml
  .env                  TMDB_TOKEN=... (NÃO vai pro git)
  .gitignore
  docs/
```

São duas páginas HTML separadas, em vez de uma página única com roteamento. Isso é mais simples de entender, e cada filme tem um link próprio que pode ser compartilhado.

### Fluxo

```
Navegador ──> /.netlify/functions/tmdb?rota=now_playing&page=1
          <── JSON
Função ──(Authorization: Bearer TMDB_TOKEN)──> api.themoviedb.org/3/...
```

### A função `tmdb.js`

- Ela aceita **somente** duas rotas conhecidas, para não virar um proxy aberto a qualquer chamada do TMDB:
  - `now_playing` + `page`: chama `/3/movie/now_playing?language=pt-BR&region=BR&page=N`
  - `filme` + `id` numérico: chama `/3/movie/{id}?language=pt-BR&append_to_response=credits,videos,release_dates&include_video_language=pt-BR,en`
- Ela lê a chave de `process.env.TMDB_TOKEN`, que é o "API Read Access Token" do TMDB e vai no cabeçalho `Authorization: Bearer`.
- Ela devolve o JSON do TMDB como veio, com um cabeçalho de cache curto (por exemplo, `Cache-Control: public, max-age=3600`), porque a lista muda pouco ao longo do dia.
- Parâmetro inválido: responde 400. Falha do TMDB: repassa o status com uma mensagem simples.

### Tela de lista

- Uma grade de cartões (pôster, título, nota), responsiva, de 2 colunas no celular até 5 ou 6 no computador.
- O TMDB entrega 20 filmes por página. Um botão **"Carregar mais"** busca a próxima página até `total_pages`. Isso é mais simples que paginação numerada ou rolagem infinita.
- Pode haver filmes repetidos entre páginas; se houver, descarte os repetidos pelo `id`.
- Filme sem pôster: mostra uma imagem genérica.
- Mostra um estado de carregando e uma mensagem de erro amigável com um botão "tentar de novo".

### Tela de detalhes

- Lê o `id` da URL. Se não houver `id` ou ele for inválido, mostra uma mensagem e um link de volta para a lista.
- O trailer usa o primeiro vídeo `site=YouTube` e `type=Trailer`, preferindo pt-BR. Ele aparece num iframe do YouTube; se não houver trailer, a seção é omitida.
- O elenco mostra os primeiros 6 nomes de `credits.cast`, com o personagem.
- Campos vazios no TMDB não aparecem. Nunca exiba "undefined".

### Desenvolvimento e publicação

- Local: `netlify dev`, da Netlify CLI. Ele serve o site e a função juntos e lê o `.env`.
- O código fica num repositório no GitHub, ligado à Netlify, que publica automaticamente a cada push. `TMDB_TOKEN` é configurado no painel da Netlify.

### Quem escreve o código

O código é escrito pelo Claude. O plano é uma lista de tarefas comum, com **pontos de explicação**: ao fim de cada parte (estrutura HTML/CSS, busca de dados com `fetch`, função serverless, publicação), o Claude explica ao autor o que foi feito e por quê, em linguagem de iniciante, antes de seguir. O autor executa os passos que só ele pode fazer, como criar contas, copiar o token e conectar o repositório na Netlify.

### Preparação do ambiente

O autor já tem Node.js, Git e conta no GitHub. Faltam: as contas na Netlify e no TMDB, o token do TMDB e a Netlify CLI. Logo no começo, há uma verificação de que o `.env` está sendo ignorado pelo git (`git status` não deve listá-lo).

### Caminho aberto para banco de dados (futuro, NÃO construir agora)

O autor quer, depois, adicionar usuários (nome de usuário, login) e favoritos, entre outras coisas. Nada disso entra agora, mas a estrutura deve permitir isso sem retrabalho:

- **Toda conversa com o servidor passa por `js/api.js`.** As telas nunca chamam `fetch` direto. No futuro, funções como `listarFavoritos()` e `favoritar(id)` entram nesse mesmo arquivo, e as telas mudam pouco.
- **As funções serverless já são o "back-end".** Hoje existe só `netlify/functions/tmdb.js`. No futuro, entram funções vizinhas (por exemplo, `favoritos.js`) que falam com o banco, usando a mesma ideia de segredo em variável de ambiente. Não será preciso trocar a hospedagem nem a arquitetura.
- **O filme é sempre identificado pelo `id` do TMDB** (na URL `filme.html?id=` e nos dados). É esse número que um favorito vai guardar no banco.
- **O cabeçalho do site reserva um espaço à direita**, hoje vazio, onde depois entra "Entrar" / nome do usuário. Os cartões e a tela de detalhes são montados por funções JS isoladas, para que um botão de favoritar possa ser acrescentado num lugar só.
- A escolha do banco e do sistema de login fica para quando essa etapa começar. Candidatos naturais são o Supabase, que tem banco e login prontos com plano grátis, ou o banco da própria Netlify. Essa escolha não afeta nada do que é construído agora.

### Testes (decisão do Claude)

As telas são verificadas à mão no navegador, com uma lista de "o que você deve ver" a cada passo. Há só um pequeno arquivo de testes automáticos (`node:test`, que já vem com o Node, sem dependências) para a função `tmdb.js`: rotas válidas, `id` inválido → 400 e rota desconhecida → 400.

## Deixado para quem for construir

- O visual (cores, fontes, layout fino). A sugestão é tema escuro, comum em sites de cinema, mas a decisão é livre.
- O formato exato das datas e da duração (por exemplo, "2h 15min").
- A organização interna do código JS, desde que siga os anti-objetivos (simples, sem dependências no navegador).
- A ordem dos passos no plano. Ela deve priorizar ter algo visível rápido: primeiro a lista funcionando localmente, depois os detalhes, e por último a publicação.
