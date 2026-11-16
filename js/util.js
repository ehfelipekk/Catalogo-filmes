// Funções "puras": recebem dados e devolvem dados, sem mexer na página.
// Ficam separadas das telas para poderem ser testadas e reaproveitadas.

const CDN_IMAGENS = 'https://image.tmdb.org/t/p/';
export const POSTER_GENERICO = 'img/sem-poster.svg';

// Endereço completo de uma imagem do TMDB, ou o pôster genérico se não houver imagem.
// `tamanho` é um dos tamanhos do TMDB, como "w342" ou "w500".
export function urlImagem(caminho, tamanho) {
  return caminho ? `${CDN_IMAGENS}${tamanho}${caminho}` : POSTER_GENERICO;
}

// 135 -> "2h 15min" | 45 -> "45min" | 120 -> "2h" | 0 ou vazio -> ""
export function formatarDuracao(minutos) {
  if (!minutos) return '';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// "2026-11-13" -> "13/11/2026". Só reorganiza o texto: não usa Date,
// que poderia mudar o dia por causa do fuso horário.
export function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// 7.456 -> "7,5" | 0 ou vazio -> "" (0 no TMDB significa "ainda sem votos")
export function formatarNota(nota) {
  if (!nota) return '';
  return nota.toFixed(1).replace('.', ',');
}

// Dos filmes `novos`, devolve só os que ainda não apareceram (pelo id).
export function removerRepetidos(atuais, novos) {
  const vistos = new Set(atuais.map((f) => f.id));
  return novos.filter((f) => {
    if (vistos.has(f.id)) return false;
    vistos.add(f.id);
    return true;
  });
}

export function temMaisPaginas(dados) {
  return dados.page < dados.total_pages;
}

// Chave do trailer no YouTube, preferindo o dublado/legendado em português.
export function escolherTrailer(videos) {
  const trailers = (videos ?? []).filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  const emPortugues = trailers.find((v) => v.iso_639_1 === 'pt');
  return (emPortugues ?? trailers[0])?.key ?? null;
}

// Lista de lançamentos do Brasil dentro de `release_dates` (ou lista vazia).
function lancamentosBR(releaseDates) {
  const br = releaseDates?.results?.find((r) => r.iso_3166_1 === 'BR');
  return br?.release_dates ?? [];
}

// Classificação indicativa no Brasil ("L", "10", "12", "14", "16", "18") ou null.
export function classificacaoBR(releaseDates) {
  const comClassificacao = lancamentosBR(releaseDates).find((d) => d.certification);
  return comClassificacao?.certification ?? null;
}

// Data de estreia nos cinemas do Brasil (aaaa-mm-dd). Tipo 3 = cinema no TMDB.
// Sem isso, usa qualquer data do Brasil; sem nenhuma, usa `padrao`.
export function dataLancamentoBR(releaseDates, padrao) {
  const lista = lancamentosBR(releaseDates);
  const escolhida = lista.find((d) => d.type === 3) ?? lista[0];
  return escolhida ? escolhida.release_date.slice(0, 10) : padrao;
}

export function elencoPrincipal(cast) {
  return (cast ?? []).slice(0, 6);
}

// Lê o id do filme do endereço da página ("?id=550" -> 550). Inválido -> null.
export function lerIdDaUrl(search) {
  const texto = new URLSearchParams(search).get('id') ?? '';
  if (!/^\d+$/.test(texto)) return null;
  const id = Number(texto);
  return id > 0 ? id : null;
}
