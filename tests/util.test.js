// Testes das funções "puras" do site: recebem dados e devolvem dados,
// sem mexer na página. Por isso dá para testar aqui, fora do navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  urlImagem,
  formatarDuracao,
  formatarData,
  formatarNota,
  removerRepetidos,
  temMaisPaginas,
  escolherTrailer,
  classificacaoBR,
  dataLancamentoBR,
  elencoPrincipal,
  lerIdDaUrl,
  generoPrincipal,
  maisBemAvaliados,
  imagemLarga,
  escolherDestaques,
} from '../public/js/util.js';

test('urlImagem monta o endereço do CDN ou usa o pôster genérico', () => {
  assert.equal(urlImagem('/abc.jpg', 'w342'), 'https://image.tmdb.org/t/p/w342/abc.jpg');
  assert.equal(urlImagem(null, 'w342'), 'img/sem-poster.svg');
  assert.equal(urlImagem('', 'w342'), 'img/sem-poster.svg');
});

test('formatarDuracao', () => {
  assert.equal(formatarDuracao(135), '2h 15min');
  assert.equal(formatarDuracao(45), '45min');
  assert.equal(formatarDuracao(120), '2h');
  assert.equal(formatarDuracao(0), '');
  assert.equal(formatarDuracao(null), '');
});

test('formatarData converte aaaa-mm-dd para dd/mm/aaaa', () => {
  assert.equal(formatarData('2026-11-13'), '13/11/2026');
  assert.equal(formatarData(''), '');
  assert.equal(formatarData(null), '');
});

test('formatarNota usa uma casa e vírgula', () => {
  assert.equal(formatarNota(7.456), '7,5');
  assert.equal(formatarNota(0), '');
  assert.equal(formatarNota(null), '');
});

test('removerRepetidos descarta ids já vistos', () => {
  assert.deepEqual(removerRepetidos([{ id: 1 }], [{ id: 1 }, { id: 2 }, { id: 2 }]), [{ id: 2 }]);
});

test('temMaisPaginas', () => {
  assert.equal(temMaisPaginas({ page: 3, total_pages: 3 }), false);
  assert.equal(temMaisPaginas({ page: 1, total_pages: 3 }), true);
});

test('escolherTrailer prefere trailer do YouTube em português', () => {
  assert.equal(
    escolherTrailer([
      { iso_639_1: 'en', site: 'YouTube', type: 'Trailer', key: 'EN' },
      { iso_639_1: 'pt', site: 'YouTube', type: 'Trailer', key: 'PT' },
    ]),
    'PT'
  );
  assert.equal(
    escolherTrailer([
      { site: 'Vimeo', type: 'Trailer', key: 'x' },
      { iso_639_1: 'en', site: 'YouTube', type: 'Teaser', key: 'y' },
    ]),
    null
  );
  assert.equal(escolherTrailer([]), null);
});

test('escolherTrailer usa o inglês quando não há em português', () => {
  assert.equal(
    escolherTrailer([{ iso_639_1: 'en', site: 'YouTube', type: 'Trailer', key: 'EN' }]),
    'EN'
  );
});

test('classificacaoBR pega a primeira classificação não vazia do Brasil', () => {
  assert.equal(
    classificacaoBR({
      results: [
        { iso_3166_1: 'US', release_dates: [{ certification: 'R' }] },
        { iso_3166_1: 'BR', release_dates: [{ certification: '' }, { certification: '14' }] },
      ],
    }),
    '14'
  );
  assert.equal(
    classificacaoBR({ results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R' }] }] }),
    null
  );
  assert.equal(classificacaoBR(undefined), null);
});

test('dataLancamentoBR prefere a estreia nos cinemas do Brasil', () => {
  const dados = {
    results: [
      {
        iso_3166_1: 'BR',
        release_dates: [
          { type: 1, release_date: '2026-10-01T00:00:00.000Z' },
          { type: 3, release_date: '2026-11-13T00:00:00.000Z' },
        ],
      },
    ],
  };
  assert.equal(dataLancamentoBR(dados, '2026-09-01'), '2026-11-13');
  assert.equal(dataLancamentoBR({ results: [] }, '2026-09-01'), '2026-09-01');
  assert.equal(dataLancamentoBR(undefined, null), null);
});

test('dataLancamentoBR usa a primeira data do Brasil se não houver de cinema', () => {
  const dados = {
    results: [{ iso_3166_1: 'BR', release_dates: [{ type: 4, release_date: '2026-12-01T00:00:00.000Z' }] }],
  };
  assert.equal(dataLancamentoBR(dados, '2026-09-01'), '2026-12-01');
});

test('elencoPrincipal devolve os 6 primeiros', () => {
  const elenco = Array.from({ length: 8 }, (_, i) => ({ name: `Ator ${i}`, character: `P${i}` }));
  assert.equal(elencoPrincipal(elenco).length, 6);
  assert.equal(elencoPrincipal(elenco)[0].name, 'Ator 0');
  assert.deepEqual(elencoPrincipal(undefined), []);
});

test('lerIdDaUrl aceita só inteiros positivos', () => {
  assert.equal(lerIdDaUrl('?id=550'), 550);
  for (const s of ['', '?id=', '?id=abc', '?id=-3', '?id=12abc', '?id=0']) {
    assert.equal(lerIdDaUrl(s), null, s);
  }
});

test('generoPrincipal devolve o nome do primeiro gênero conhecido', () => {
  assert.equal(generoPrincipal([18, 28]), 'Drama');
  assert.equal(generoPrincipal([999999, 878]), 'Ficção científica');
  assert.equal(generoPrincipal([999999]), '');
  assert.equal(generoPrincipal([]), '');
  assert.equal(generoPrincipal(undefined), '');
});

test('maisBemAvaliados ordena pela nota e ignora filmes com poucos votos', () => {
  const filmes = [
    { id: 1, vote_average: 6.1, vote_count: 300 },
    { id: 2, vote_average: 9.9, vote_count: 3 }, // poucos votos: fica de fora
    { id: 3, vote_average: 8.2, vote_count: 50 },
    { id: 4, vote_average: 0, vote_count: 0 },
    { id: 5, vote_average: 7.0, vote_count: 10 },
  ];
  assert.deepEqual(maisBemAvaliados(filmes, 10).map((f) => f.id), [3, 5, 1]);
  assert.deepEqual(maisBemAvaliados(filmes, 2).map((f) => f.id), [3, 5]);
  assert.equal(filmes[0].id, 1, 'não pode mudar a ordem da lista original');
  assert.deepEqual(maisBemAvaliados(undefined, 10), []);
});

test('imagemLarga usa a imagem de fundo do filme ou uma imagem genérica deitada', () => {
  assert.equal(
    imagemLarga({ backdrop_path: '/fundo.jpg' }, 'w780'),
    'https://image.tmdb.org/t/p/w780/fundo.jpg'
  );
  assert.equal(imagemLarga({ backdrop_path: null }, 'w780'), 'img/sem-imagem.svg');
  assert.equal(imagemLarga({}, 'w780'), 'img/sem-imagem.svg');
});

test('escolherDestaques pega os primeiros filmes que têm imagem de fundo', () => {
  const filmes = [
    { id: 1, backdrop_path: '/a.jpg' },
    { id: 2, backdrop_path: null },
    { id: 3, backdrop_path: '/c.jpg' },
    { id: 4, backdrop_path: '/d.jpg' },
    { id: 5, backdrop_path: '/e.jpg' },
  ];
  assert.deepEqual(escolherDestaques(filmes, 3).map((f) => f.id), [1, 3, 4]);
  assert.deepEqual(escolherDestaques(undefined, 3), []);
});
