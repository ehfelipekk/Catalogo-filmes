// Função de servidor (roda na Netlify, nunca no navegador do visitante).
// Ela recebe o pedido do site, acrescenta a chave secreta do TMDB
// e repassa a resposta. Assim a chave nunca chega ao navegador.
//
// Só aceita estes tipos de pedido ("rotas"), para ninguém usar
// a nossa chave para buscar outras coisas no TMDB:
//   ?rota=now_playing&page=N              -> filmes em cartaz no Brasil
//   ?rota=filme&id=N                      -> detalhes de um filme
//   ?rota=populares&page=N                -> os mais procurados agora, de qualquer época
//   ?rota=mais_avaliados&page=N           -> maiores notas (só filmes com 2000+ votos)
//   ?rota=pesquisa&q=TEXTO&page=N         -> pesquisa pelo nome
//   ?rota=descobrir&genero=G&nota=N&page=N -> catálogo filtrado (gênero e nota são opcionais)
// O "page" é sempre opcional (começa em 1) e vai até 500, o limite do TMDB.

const BASE = 'https://api.themoviedb.org/3';

// Pedaço comum das rotas novas: português, Brasil e sem filmes adultos.
const COMUM = 'language=pt-BR&region=BR&include_adult=false';

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

  // As rotas abaixo usam todas o número da página; se ele for inválido, recusamos.
  const page = inteiroEntre(params.get('page') ?? '1', 1, 500);
  if (page === null) return null;

  if (rota === 'populares') {
    return `${BASE}/movie/popular?${COMUM}&page=${page}`;
  }

  if (rota === 'mais_avaliados') {
    // O mínimo de 2000 votos deixa de fora notas altas "infladas" por poucos votos.
    return `${BASE}/discover/movie?${COMUM}&sort_by=vote_average.desc&vote_count.gte=2000&page=${page}`;
  }

  if (rota === 'pesquisa') {
    const q = (params.get('q') ?? '').trim();
    if (q.length < 1 || q.length > 100) return null;
    // encodeURIComponent protege símbolos como "&" e "#", que quebrariam o endereço.
    return `${BASE}/search/movie?${COMUM}&query=${encodeURIComponent(q)}&page=${page}`;
  }

  if (rota === 'descobrir') {
    let url = `${BASE}/discover/movie?${COMUM}&sort_by=popularity.desc`;
    // Gênero e nota são opcionais: ausentes = sem filtro; presentes, precisam ser válidos.
    if (params.has('genero')) {
      const genero = inteiroEntre(params.get('genero'), 1, Number.MAX_SAFE_INTEGER);
      if (genero === null) return null;
      url += `&with_genres=${genero}`;
    }
    if (params.has('nota')) {
      const nota = inteiroEntre(params.get('nota'), 5, 8);
      if (nota === null) return null;
      // Com filtro de nota, exigimos 100 votos para a nota ser confiável.
      url += `&vote_average.gte=${nota}&vote_count.gte=100`;
    }
    return `${url}&page=${page}`;
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
