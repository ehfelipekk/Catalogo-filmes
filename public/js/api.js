// Único lugar do site que conversa com o servidor.
// As telas chamam estas funções e nunca usam `fetch` diretamente.
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
