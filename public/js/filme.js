// Tela de detalhes: lê o id do filme no endereço (filme.html?id=550) e mostra tudo sobre ele.

import { buscarFilme } from './api.js';
import {
  lerIdDaUrl,
  urlImagem,
  formatarDuracao,
  formatarData,
  formatarNota,
  escolherTrailer,
  classificacaoBR,
  dataLancamentoBR,
  elencoPrincipal,
} from './util.js';
import { criar, criarCabecalho, criarRodape, mostrarErro } from './componentes.js';

const area = document.getElementById('detalhes');

document.body.prepend(criarCabecalho());
document.body.append(criarRodape());

function linkVoltar() {
  const link = criar('a', 'voltar', '← Voltar para os filmes em cartaz');
  link.href = 'index.html';
  return link;
}

// Acrescenta uma linha "Etiqueta: valor" na lista, só se o valor existir.
function adicionarInfo(lista, etiqueta, valor) {
  if (!valor) return;
  const item = criar('li');
  item.append(criar('strong', null, `${etiqueta}: `), valor);
  lista.append(item);
}

// Monta a página de detalhes a partir dos dados do TMDB.
// (No futuro, o botão de favoritar entra aqui.)
export function montarDetalhes(filme) {
  const pagina = criar('article', 'filme');

  if (filme.backdrop_path) {
    pagina.style.setProperty('--fundo-filme', `url("${urlImagem(filme.backdrop_path, 'w1280')}")`);
    pagina.classList.add('com-fundo');
  }

  const topo = criar('div', 'filme-topo');

  const poster = criar('img', 'filme-poster');
  poster.src = urlImagem(filme.poster_path, 'w500');
  poster.alt = filme.title;

  const texto = criar('div', 'filme-texto');
  texto.append(criar('h1', null, filme.title));
  if (filme.original_title && filme.original_title !== filme.title) {
    texto.append(criar('p', 'titulo-original', filme.original_title));
  }

  const nota = formatarNota(filme.vote_average);
  if (nota) texto.append(criar('p', 'nota nota-grande', `★ ${nota}`));

  const infos = criar('ul', 'infos');
  adicionarInfo(infos, 'Gêneros', (filme.genres ?? []).map((g) => g.name).join(', '));
  adicionarInfo(infos, 'Duração', formatarDuracao(filme.runtime));
  adicionarInfo(
    infos,
    'Lançamento no Brasil',
    formatarData(dataLancamentoBR(filme.release_dates, filme.release_date))
  );
  const classificacao = classificacaoBR(filme.release_dates);
  adicionarInfo(infos, 'Classificação', classificacao === 'L' ? 'Livre' : classificacao && `${classificacao} anos`);
  texto.append(infos);

  if (filme.overview) {
    texto.append(criar('h2', null, 'Sinopse'), criar('p', 'sinopse', filme.overview));
  }

  topo.append(poster, texto);
  pagina.append(topo);

  const elenco = elencoPrincipal(filme.credits?.cast);
  if (elenco.length > 0) {
    const secao = criar('section');
    const lista = criar('ul', 'elenco');
    for (const pessoa of elenco) {
      const item = criar('li');
      item.append(criar('strong', null, pessoa.name));
      if (pessoa.character) item.append(criar('span', null, pessoa.character));
      lista.append(item);
    }
    secao.append(criar('h2', null, 'Elenco principal'), lista);
    pagina.append(secao);
  }

  const trailer = escolherTrailer(filme.videos?.results);
  if (trailer) {
    const secao = criar('section');
    const video = criar('iframe', 'trailer');
    video.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer)}`;
    video.title = `Trailer de ${filme.title}`;
    video.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
    video.allowFullscreen = true;
    secao.append(criar('h2', null, 'Trailer'), video);
    pagina.append(secao);
  }

  pagina.append(linkVoltar());
  return pagina;
}

async function carregar() {
  const id = lerIdDaUrl(location.search);
  if (id === null) {
    const caixa = criar('div', 'erro');
    caixa.append(criar('p', null, 'Filme não encontrado.'), linkVoltar());
    area.replaceChildren(caixa);
    return;
  }

  area.replaceChildren(criar('p', 'estado', 'Carregando…'));
  try {
    const filme = await buscarFilme(id);
    document.title = filme.title;
    area.replaceChildren(montarDetalhes(filme));
  } catch (e) {
    mostrarErro(area, e.message, carregar);
    area.append(linkVoltar());
  }
}

carregar();
