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

// Ainda há página seguinte? O TMDB não entrega páginas depois da 500,
// mesmo quando diz que existem mais; por isso paramos nela.
export function temMaisPaginas(dados) {
  return dados.page < Math.min(dados.total_pages, 500);
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

// ---------- Novidades do visual em fileiras ----------

// Nomes dos gêneros do TMDB em português. A lista de filmes em cartaz traz
// só os números (genre_ids); esta tabela traduz o número para o nome.
const GENEROS = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção científica',
  10770: 'Cinema TV',
  53: 'Thriller',
  10752: 'Guerra',
  37: 'Faroeste',
};

// [18, 28] -> "Drama" (o primeiro gênero que a tabela conhece) | nada -> ""
export function generoPrincipal(ids) {
  const conhecido = (ids ?? []).find((id) => GENEROS[id]);
  return conhecido ? GENEROS[conhecido] : '';
}

// Os `quantidade` filmes de nota mais alta. Filmes com menos de 10 votos
// ficam de fora, porque uma nota com 2 ou 3 votos não é confiável.
// Usa uma cópia da lista, para não bagunçar a ordem original.
export function maisBemAvaliados(filmes, quantidade) {
  return (filmes ?? [])
    .filter((f) => f.vote_count >= 10 && f.vote_average > 0)
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, quantidade);
}

// Imagem deitada (formato de tela de cinema) do filme, ou uma genérica se não houver.
export const IMAGEM_LARGA_GENERICA = 'img/sem-imagem.svg';
export function imagemLarga(filme, tamanho) {
  return filme.backdrop_path ? urlImagem(filme.backdrop_path, tamanho) : IMAGEM_LARGA_GENERICA;
}

// Os primeiros `quantidade` filmes que têm imagem de fundo (para os cartões grandes).
// A lista do TMDB já vem dos mais populares para os menos populares.
export function escolherDestaques(filmes, quantidade) {
  return (filmes ?? []).filter((f) => f.backdrop_path).slice(0, quantidade);
}

// ---------- Setas das fileiras ----------

// Diz quais setas mostrar, olhando onde a fileira está:
//   posicao        = quanto já rolou para a direita (scrollLeft);
//   larguraTotal   = largura de todos os cartões juntos (scrollWidth);
//   larguraVisivel = largura da parte que aparece na tela (clientWidth).
// A folga de 1px existe porque alguns navegadores param em 1199,5 em vez de 1200.
export function setasDaFileira(posicao, larguraTotal, larguraVisivel) {
  const fim = larguraTotal - larguraVisivel;
  return { voltar: posicao > 1, avancar: posicao < fim - 1 };
}

// Quanto a fileira anda a cada clique na seta: 90% da área onde os cartões
// aparecem (a tela menos as margens), para o último cartão visível continuar
// um pouquinho à vista e a pessoa não se perder. Nunca menos de 200px.
export function passoDaSeta(larguraVisivel, margemEsquerda, margemDireita) {
  const area = larguraVisivel - margemEsquerda - margemDireita;
  return Math.max(200, Math.round(area * 0.9));
}

// ---------- Busca e filtros (Só Filmes) ----------

// Notas mínimas que o filtro oferece (5+, 6+, 7+, 8+).
const NOTAS = [5, 6, 7, 8];

// Lê a pesquisa e os filtros do endereço da página e confere cada um.
// "?genero=27&nota=7" -> { busca: '', genero: 27, nota: 7 }
// Valores estranhos (ex.: "?nota=9") viram null e são ignorados.
// Se houver texto na pesquisa, gênero e nota são ignorados: o TMDB não combina os dois.
export function lerFiltrosDaUrl(search) {
  const params = new URLSearchParams(search);
  const busca = (params.get('busca') ?? '').trim().slice(0, 100);
  if (busca) return { busca, genero: null, nota: null };

  const textoGenero = params.get('genero') ?? '';
  const genero = /^\d+$/.test(textoGenero) && GENEROS[textoGenero] ? Number(textoGenero) : null;
  const nota = NOTAS.find((n) => String(n) === params.get('nota')) ?? null;
  return { busca, genero, nota };
}

// Há alguma pesquisa ou filtro escolhido?
export function temFiltroAtivo(filtros) {
  return filtros.busca !== '' || filtros.genero !== null || filtros.nota !== null;
}

// Título da grade de resultados.
// { busca: 'batman' } -> 'Resultados para "batman"' | { genero: 27, nota: 7 } -> 'Terror · nota 7+'
export function tituloDosResultados({ busca, genero, nota }) {
  if (busca) return `Resultados para "${busca}"`;
  if (genero !== null && nota !== null) return `${GENEROS[genero]} · nota ${nota}+`;
  if (genero !== null) return GENEROS[genero];
  if (nota !== null) return `Nota ${nota}+`;
  return 'Explorar';
}

// Mensagem para quando a busca ou os filtros não acham nenhum filme.
export function mensagemSemResultados(filtros) {
  if (filtros.busca) return `Nenhum filme encontrado para "${filtros.busca}".`;
  if (temFiltroAtivo(filtros)) return 'Nenhum filme encontrado com esses filtros.';
  return 'Nenhum filme encontrado.';
}

// Gêneros em ordem alfabética, para o seletor: [{ id: 28, nome: 'Ação' }, ...]
export function listaDeGeneros() {
  return Object.entries(GENEROS)
    .map(([id, nome]) => ({ id: Number(id), nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Para onde o "← Voltar" da página do filme leva.
// Se a pessoa veio da página inicial do nosso site, volta para o mesmo endereço,
// com a pesquisa e os filtros. Se veio de outro lugar (ou de lugar nenhum), vai para a inicial.
// `referrer` é a página anterior (document.referrer); `origem` é o nosso site (location.origin).
export function destinoDoVoltar(referrer, origem) {
  try {
    const anterior = new URL(referrer);
    const ehInicial = anterior.pathname === '/' || anterior.pathname.endsWith('/index.html');
    if (anterior.origin === origem && ehInicial) return `index.html${anterior.search}`;
  } catch {
    // referrer vazio ou estranho: cai no padrão abaixo.
  }
  return 'index.html';
}
