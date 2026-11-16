// Testes que conferem o HTML/CSS e o api.js sem precisar de navegador.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buscarEmCartaz } from '../public/js/api.js';

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
