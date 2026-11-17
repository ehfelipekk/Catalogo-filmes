# Só Filmes

Site para pesquisar e explorar filmes de qualquer época, com dados do [TMDB](https://www.themoviedb.org/). Dá para pesquisar pelo nome, filtrar por gênero e por nota mínima, e ver os populares, os mais bem avaliados e o que está em cartaz no Brasil.

No ar: https://catalogocartazteste.netlify.app

## Como rodar no seu computador

1. Instale o [Node.js](https://nodejs.org/) e a Netlify CLI:
   ```
   npm install -g netlify-cli
   ```
2. Crie um arquivo `.env` na raiz do projeto com o seu "API Read Access Token" do TMDB:
   ```
   TMDB_TOKEN=seu_token_aqui
   ```
   Esse arquivo é ignorado pelo git e nunca deve ir para o GitHub.
3. Rode o site:
   ```
   npm run dev
   ```
   e abra http://localhost:8888

## Testes

```
npm test
```

## Como está organizado

- `public/`: o site (HTML, CSS, JavaScript e imagens). Só esta pasta é publicada.
- `netlify/functions/tmdb.js`: a função de servidor que guarda a chave do TMDB e conversa com ele.
- `tests/`: testes automáticos.
- `docs/`: o design e o plano do projeto.

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
