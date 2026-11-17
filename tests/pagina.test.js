// Testes que conferem o HTML/CSS e o api.js sem precisar de navegador.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buscarEmCartaz,
  buscarPopulares,
  buscarMaisAvaliados,
  pesquisarFilmes,
  descobrirFilmes,
} from '../public/js/api.js';

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test('o atributo hidden esconde mesmo elementos com display definido no CSS', () => {
  const css = readFileSync(new URL('../public/css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
});

test('mensagens de carregando/erro ficam abaixo da grade, perto do botão', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const grade = html.indexOf('id="grade"');
  const estado = html.indexOf('id="estado"');
  const botao = html.indexOf('id="carregar-mais"');
  assert.ok(grade < estado && estado < botao);
});

test('sem internet, api.js lança uma mensagem amigável em português', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(buscarEmCartaz(1), {
    message: 'Sem conexão. Verifique sua internet e tente de novo.',
  });
});

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

test('a inicial tem o formulário de busca e as quatro seções na ordem', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Só Filmes<\/title>/);
  assert.match(html, /<form[^>]*id="busca"[^>]*method="get"[^>]*action="index.html"/);
  for (const nome of ['busca', 'genero', 'nota']) assert.match(html, new RegExp(`name="${nome}"`));
  const ordem = ['id="populares"', 'id="ranking"', 'id="em-cartaz"', 'id="explorar"'].map((s) => html.indexOf(s));
  assert.ok(ordem.every((p, i) => p > 0 && (i === 0 || p > ordem[i - 1])));
  assert.doesNotMatch(html, /em cartaz nos cinemas do Brasil/i);
});
