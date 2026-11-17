// Único lugar do site que conversa com o servidor.
// As telas chamam estas funções e nunca usam `fetch` diretamente.
// Cada função abaixo corresponde a uma "rota" de netlify/functions/tmdb.js.
// No futuro, funções como `listarFavoritos()` e `favoritar(id)` entram aqui.

const ENDERECO = '/.netlify/functions/tmdb';

// Faz o pedido ao servidor e devolve os dados, ou lança um erro com mensagem amigável.
async function pedir(parametros) {
  let resposta;
  try {
    resposta = await fetch(`${ENDERECO}?${new URLSearchParams(parametros)}`);
  } catch {
    // O navegador não conseguiu nem falar com o servidor (ex.: sem internet).
    throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro ?? 'Não foi possível carregar os filmes.');
  }
  return dados;
}

// Filmes em cartaz no Brasil. Devolve { page, total_pages, results: [...] }.
export function buscarEmCartaz(pagina) {
  return pedir({ rota: 'now_playing', page: pagina });
}

// Todos os detalhes de um filme (com elenco, vídeos e datas de lançamento).
export function buscarFilme(id) {
  return pedir({ rota: 'filme', id });
}

// Os filmes mais procurados agora, de qualquer época.
export function buscarPopulares(pagina) {
  return pedir({ rota: 'populares', page: pagina });
}

// As maiores notas de todos os tempos (só filmes com muitos votos).
export function buscarMaisAvaliados(pagina) {
  return pedir({ rota: 'mais_avaliados', page: pagina });
}

// Pesquisa pelo nome do filme.
export function pesquisarFilmes(texto, pagina) {
  return pedir({ rota: 'pesquisa', q: texto, page: pagina });
}

// Catálogo filtrado por gênero e/ou nota mínima. Filtro null = não filtrar por ele.
export function descobrirFilmes({ genero, nota }, pagina) {
  const parametros = { rota: 'descobrir' };
  if (genero !== null) parametros.genero = genero;
  if (nota !== null) parametros.nota = nota;
  parametros.page = pagina;
  return pedir(parametros);
}
