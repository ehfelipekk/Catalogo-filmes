// Tela inicial do Só Filmes. Funciona de dois jeitos:
//
//   1. Sem pesquisa nem filtro: mostra três fileiras ("Populares agora",
//      "Mais bem avaliados" e "Em cartaz no Brasil") e, embaixo, a grade
//      "Explorar" com os populares, 20 por vez, com o botão "Carregar mais".
//   2. Com pesquisa ou filtro no endereço (ex.: ?busca=batman ou ?genero=27):
//      esconde as fileiras e mostra só a grade com os resultados.
//
// A pesquisa e os filtros moram no endereço da página. Quem escreve neles é
// o formulário do index.html; aqui nós só lemos (lerFiltrosDaUrl).

import {
  buscarEmCartaz,
  buscarPopulares,
  buscarMaisAvaliados,
  pesquisarFilmes,
  descobrirFilmes,
} from './api.js';
import {
  removerRepetidos,
  temMaisPaginas,
  escolherDestaques,
  lerFiltrosDaUrl,
  temFiltroAtivo,
  tituloDosResultados,
  mensagemSemResultados,
  listaDeGeneros,
} from './util.js';
import { criar, criarCabecalho, criarRodape, criarCartao, criarDestaque, mostrarErro, adicionarSetas } from './componentes.js';

document.body.prepend(criarCabecalho());
document.body.append(criarRodape());

const filtros = lerFiltrosDaUrl(location.search);

// ---------- Formulário de pesquisa e filtros ----------

const formulario = document.getElementById('busca');
const campoBusca = document.getElementById('campo-busca');
const seletorGenero = document.getElementById('filtro-genero');
const seletorNota = document.getElementById('filtro-nota');

// Coloca os gêneros no seletor, em ordem alfabética.
for (const { id, nome } of listaDeGeneros()) {
  const opcao = criar('option', null, nome);
  opcao.value = String(id);
  seletorGenero.append(opcao);
}

// O formulário mostra o que está no endereço (para a pessoa ver o que escolheu).
function preencherFormulario() {
  campoBusca.value = filtros.busca;
  seletorGenero.value = filtros.genero === null ? '' : String(filtros.genero);
  seletorNota.value = filtros.nota === null ? '' : String(filtros.nota);
}
preencherFormulario();

// Enquanto houver texto na pesquisa, os filtros ficam apagados:
// o TMDB não sabe combinar pesquisa por nome com gênero e nota.
function atualizarFiltrosApagados() {
  const temTexto = campoBusca.value.trim() !== '';
  seletorGenero.disabled = temTexto;
  seletorNota.disabled = temTexto;
}
campoBusca.addEventListener('input', atualizarFiltrosApagados);
atualizarFiltrosApagados();

// Trocar o gênero ou a nota já envia o formulário, sem precisar clicar em nada.
seletorGenero.addEventListener('change', () => formulario.requestSubmit());
seletorNota.addEventListener('change', () => formulario.requestSubmit());

// Antes de enviar, desliga os campos vazios: campos desligados não vão para o
// endereço, que fica "?genero=27" em vez de "?busca=&genero=27&nota=".
formulario.addEventListener('submit', () => {
  campoBusca.value = campoBusca.value.trim();
  for (const campo of [campoBusca, seletorGenero, seletorNota]) {
    if (campo.value === '') campo.disabled = true;
  }
});

// Ao voltar para esta página pelo "Voltar" do navegador, o navegador tenta
// "ajudar": devolve a página como ela estava, com os campos desligados ou
// com o que a pessoa tinha escolhido depois (ex.: "Terror"), mesmo que a tela
// mostre outra coisa. O evento "pageshow" acontece depois disso; então aqui
// religamos os campos e voltamos a preenchê-los com o que está no endereço.
window.addEventListener('pageshow', () => {
  campoBusca.disabled = false;
  preencherFormulario();
  atualizarFiltrosApagados();
});

// ---------- As três fileiras do topo ----------

// Carrega uma fileira sozinha: se ela der erro, só ela mostra o "Tentar de novo".
//   idSecao: id da <section> no index.html (ex.: 'populares')
//   buscar: função de api.js que traz a página 1
//   montarItens: recebe os filmes e devolve os cartões prontos
async function carregarFileira(idSecao, buscar, montarItens) {
  const secao = document.getElementById(idSecao);
  const fileira = secao.querySelector('.fileira');
  const estado = document.getElementById(`estado-${idSecao}`);
  estado.textContent = 'Carregando…';

  try {
    const dados = await buscar(1);
    const itens = montarItens(dados.results ?? []);
    fileira.replaceChildren(...itens);
    estado.textContent = '';
    secao.hidden = itens.length === 0; // fileira vazia não aparece
  } catch (e) {
    mostrarErro(estado, e.message, () => carregarFileira(idSecao, buscar, montarItens));
  }
}

// Cartões numerados (1, 2, 3...) dentro de uma lista <ol>.
function itensDoRanking(filmes) {
  return filmes.slice(0, 10).map((filme, i) => {
    const item = criar('li');
    item.append(criarCartao(filme, i + 1));
    return item;
  });
}

// ---------- A grade "Explorar" com o "Carregar mais" ----------

const grade = document.getElementById('grade');
const estado = document.getElementById('estado');
const botaoMais = document.getElementById('carregar-mais');

// De onde vêm os filmes da grade, conforme o que está no endereço.
function fonteDaGrade(pagina) {
  if (filtros.busca) return pesquisarFilmes(filtros.busca, pagina);
  if (temFiltroAtivo(filtros)) return descobrirFilmes(filtros, pagina);
  return buscarPopulares(pagina);
}

let filmesNaTela = []; // filmes já mostrados (para não repetir)
let ultimaPagina = 0; // última página carregada com sucesso

async function carregarPagina(pagina) {
  botaoMais.disabled = true; // evita clique duplo enquanto carrega
  estado.replaceChildren();
  estado.textContent = 'Carregando…';

  try {
    const dados = await fonteDaGrade(pagina);
    const novos = removerRepetidos(filmesNaTela, dados.results ?? []);
    filmesNaTela = filmesNaTela.concat(novos);
    grade.append(...novos.map((filme) => criarCartao(filme)));
    ultimaPagina = pagina;

    estado.textContent = filmesNaTela.length === 0 ? mensagemSemResultados(filtros) : '';
    botaoMais.hidden = !temMaisPaginas(dados);
  } catch (e) {
    botaoMais.hidden = true;
    mostrarErro(estado, e.message, () => carregarPagina(pagina));
  } finally {
    botaoMais.disabled = false;
  }
}

botaoMais.addEventListener('click', () => carregarPagina(ultimaPagina + 1));

// ---------- Começo: decide o que mostrar ----------

if (temFiltroAtivo(filtros)) {
  // Com pesquisa ou filtro: só a grade, com um título que diz o que está sendo mostrado.
  for (const id of ['populares', 'ranking', 'em-cartaz']) {
    document.getElementById(id).hidden = true;
  }
  document.getElementById('titulo-explorar').textContent = tituloDosResultados(filtros);
} else {
  // Setas "‹ ›" ao lado do título de cada fileira.
  for (const id of ['populares', 'ranking', 'em-cartaz']) {
    const secao = document.getElementById(id);
    adicionarSetas(secao.querySelector('h2'), secao.querySelector('.fileira'));
  }
  // As três fileiras carregam ao mesmo tempo, cada uma por conta própria.
  carregarFileira('populares', buscarPopulares, (filmes) => escolherDestaques(filmes, 3).map(criarDestaque));
  carregarFileira('ranking', buscarMaisAvaliados, itensDoRanking);
  carregarFileira('em-cartaz', buscarEmCartaz, (filmes) => filmes.map((filme) => criarCartao(filme)));
}

carregarPagina(1);
