// Função de servidor (roda na Netlify, nunca no navegador do visitante).
// Ela recebe o pedido do site, acrescenta a chave secreta do TMDB
// e repassa a resposta. Assim a chave nunca chega ao navegador.
//
// Só aceita dois tipos de pedido ("rotas"), para ninguém usar
// a nossa chave para buscar outras coisas no TMDB:
//   ?rota=now_playing&page=N  -> filmes em cartaz no Brasil
//   ?rota=filme&id=N          -> detalhes de um filme

const BASE = 'https://api.themoviedb.org/3';

// Converte um texto em número inteiro entre `min` e `max`.
// Devolve null se o texto não for exatamente isso (ex.: "abc", "1.5", "12abc").
function inteiroEntre(texto, min, max) {
  if (!/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  return n >= min && n <= max ? n : null;
}

// Monta o endereço do TMDB a partir do pedido, ou devolve null se o pedido for inválido.
export function montarUrlTmdb(params) {
  const rota = params.get('rota');

  if (rota === 'now_playing') {
    const page = inteiroEntre(params.get('page') ?? '1', 1, 500);
    if (page === null) return null;
    return `${BASE}/movie/now_playing?language=pt-BR&region=BR&page=${page}`;
  }

  if (rota === 'filme') {
    const id = inteiroEntre(params.get('id') ?? '', 1, Number.MAX_SAFE_INTEGER);
    if (id === null) return null;
    return (
      `${BASE}/movie/${id}?language=pt-BR` +
      '&append_to_response=credits,videos,release_dates' +
      '&include_video_language=pt-BR,en'
    );
  }

  return null;
}

// Cria uma resposta de erro no formato { "erro": "..." }.
function erro(status, mensagem) {
  return Response.json({ erro: mensagem }, { status });
}

export default async function (req) {
  const url = montarUrlTmdb(new URL(req.url).searchParams);
  if (!url) return erro(400, 'Pedido inválido.');

  const token = process.env.TMDB_TOKEN;
  if (!token) return erro(500, 'O servidor está sem a chave do TMDB.');

  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch {
    return erro(502, 'Não foi possível falar com o TMDB.');
  }

  if (!resposta.ok) {
    return erro(resposta.status, 'O TMDB recusou o pedido.');
  }

  return new Response(await resposta.text(), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
