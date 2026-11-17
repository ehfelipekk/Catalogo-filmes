// Tela de lista: mostra os filmes em cartaz em três partes:
//   1. "Em destaque": 3 cartões grandes;
//   2. "Mais bem avaliados": fileira numerada com as maiores notas;
//   3. "Todos em cartaz": grade com todos, 20 por vez, com o botão "Carregar mais".

import { buscarEmCartaz } from './api.js';
import { removerRepetidos, temMaisPaginas, escolherDestaques, maisBemAvaliados } from './util.js';
import { criar, criarCabecalho, criarRodape, criarCartao, criarDestaque, mostrarErro, adicionarSetas } from './componentes.js';

const grade = document.getElementById('grade');
const estado = document.getElementById('estado');
const botaoMais = document.getElementById('carregar-mais');

document.body.prepend(criarCabecalho());
document.body.append(criarRodape());

let filmesNaTela = []; // filmes já mostrados (para não repetir)
let ultimaPagina = 0; // última página carregada com sucesso

// Preenche as duas fileiras do topo com os filmes da primeira página.
// Cada fileira só aparece se tiver algum filme.
function montarFileiras(filmes) {
  const destaques = escolherDestaques(filmes, 3);
  document.getElementById('fileira-destaques').replaceChildren(...destaques.map(criarDestaque));
  document.getElementById('destaques').hidden = destaques.length === 0;

  const ranking = maisBemAvaliados(filmes, 10);
  const itens = ranking.map((filme, i) => {
    const item = criar('li');
    item.append(criarCartao(filme, i + 1));
    return item;
  });
  document.getElementById('fileira-ranking').replaceChildren(...itens);
  document.getElementById('ranking').hidden = ranking.length === 0;
}

async function carregarPagina(pagina) {
  botaoMais.disabled = true; // evita clique duplo enquanto carrega
  estado.replaceChildren();
  estado.textContent = 'Carregando…';

  try {
    const dados = await buscarEmCartaz(pagina);
    if (pagina === 1) montarFileiras(dados.results);
    const novos = removerRepetidos(filmesNaTela, dados.results);
    filmesNaTela = filmesNaTela.concat(novos);
    grade.append(...novos.map((filme) => criarCartao(filme)));
    ultimaPagina = pagina;

    estado.textContent = filmesNaTela.length === 0 ? 'Nenhum filme em cartaz no momento.' : '';
    botaoMais.hidden = !temMaisPaginas(dados);
  } catch (e) {
    botaoMais.hidden = true;
    mostrarErro(estado, e.message, () => carregarPagina(pagina));
  } finally {
    botaoMais.disabled = false;
  }
}

// Setas "‹ ›" ao lado do título de cada fileira.
for (const id of ['destaques', 'ranking']) {
  const secao = document.getElementById(id);
  adicionarSetas(secao.querySelector('h2'), secao.querySelector('.fileira'));
}

botaoMais.addEventListener('click', () => carregarPagina(ultimaPagina + 1));

carregarPagina(1);
