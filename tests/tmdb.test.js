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
