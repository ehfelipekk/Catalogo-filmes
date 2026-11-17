// Testes da função de servidor que conversa com o TMDB.
// Trocamos o `fetch` verdadeiro por um "falso", para testar sem internet
// e conseguir ver exatamente qual endereço a função tentou acessar.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/tmdb.js';

const fetchOriginal = globalThis.fetch;
let chamadas;

function fetchFalso(status = 200, corpo = '{"ok":1}') {
  return async (url, opts) => {
    chamadas.push({ url, opts });
    return new Response(corpo, { status });
  };
}

function pedir(query) {
  return handler(new Request(`http://x/.netlify/functions/tmdb?${query}`));
}

beforeEach(() => {
  process.env.TMDB_TOKEN = 'tok';
  chamadas = [];
  globalThis.fetch = fetchFalso();
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test('now_playing usa pt-BR, BR e page', async () => {
  const res = await pedir('rota=now_playing&page=2');
  assert.equal(chamadas.length, 1);
  assert.equal(
    chamadas[0].url,
    'https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&page=2'
  );
  assert.equal(chamadas[0].opts.headers.Authorization, 'Bearer tok');
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '{"ok":1}');
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=3600');
  assert.equal(res.headers.get('Content-Type'), 'application/json');
});

test('now_playing sem page usa 1', async () => {
  await pedir('rota=now_playing');
  assert.ok(chamadas[0].url.endsWith('&page=1'));
});

test('page inválida dá 400', async () => {
  for (const page of ['abc', '0', '501', '1.5']) {
    const res = await pedir(`rota=now_playing&page=${page}`);
    assert.equal(res.status, 400, `page=${page}`);
    assert.ok((await res.json()).erro);
  }
  assert.equal(chamadas.length, 0);
});

test('filme monta a URL completa', async () => {
  await pedir('rota=filme&id=550');
  assert.equal(
    chamadas[0].url,
    'https://api.themoviedb.org/3/movie/550?language=pt-BR&append_to_response=credits,videos,release_dates&include_video_language=pt-BR,en'
  );
});

test('filme com id inválido dá 400', async () => {
  for (const q of ['rota=filme', 'rota=filme&id=abc', 'rota=filme&id=-3', 'rota=filme&id=12abc', 'rota=filme&id=0']) {
    const res = await pedir(q);
    assert.equal(res.status, 400, q);
  }
  assert.equal(chamadas.length, 0);
});

test('rota desconhecida dá 400', async () => {
  for (const q of ['rota=search', '']) {
    const res = await pedir(q);
    assert.equal(res.status, 400, q);
  }
  assert.equal(chamadas.length, 0);
});

test('sem token dá 500', async () => {
  delete process.env.TMDB_TOKEN;
  const res = await pedir('rota=now_playing');
  assert.equal(res.status, 500);
  assert.ok((await res.json()).erro);
  assert.equal(chamadas.length, 0);
});

test('repassa status de erro do TMDB', async () => {
  globalThis.fetch = fetchFalso(401, '{"status_message":"Invalid API key"}');
  const res = await pedir('rota=now_playing');
  assert.equal(res.status, 401);
  assert.ok((await res.json()).erro);
});

test('falha de rede dá 502', async () => {
  globalThis.fetch = async () => {
    throw new Error('sem internet');
  };
  const res = await pedir('rota=now_playing');
  assert.equal(res.status, 502);
  assert.ok((await res.json()).erro);
});

// ---------- Rotas do catálogo geral (Só Filmes) ----------

const C = 'language=pt-BR&region=BR&include_adult=false';
const B = 'https://api.themoviedb.org/3';

test('populares', async () => {
  await pedir('rota=populares&page=3');
  assert.equal(chamadas[0].url, `${B}/movie/popular?${C}&page=3`);
});

test('mais_avaliados exige 2000 votos e ordena pela nota', async () => {
  await pedir('rota=mais_avaliados');
  assert.equal(
    chamadas[0].url,
    `${B}/discover/movie?${C}&sort_by=vote_average.desc&vote_count.gte=2000&page=1`
  );
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
  assert.equal(
    chamadas[1].url,
    `${B}/discover/movie?${C}&sort_by=popularity.desc&with_genres=27&page=2`
  );
  assert.equal(
    chamadas[2].url,
    `${B}/discover/movie?${C}&sort_by=popularity.desc&with_genres=27&vote_average.gte=7&vote_count.gte=100&page=1`
  );
});

test('descobrir recusa gênero ou nota inválidos', async () => {
  for (const q of ['genero=abc', 'genero=', 'genero=0', 'nota=4', 'nota=9', 'nota=7.5', 'page=501']) {
    assert.equal((await pedir(`rota=descobrir&${q}`)).status, 400, q);
  }
  assert.equal(chamadas.length, 0);
});
