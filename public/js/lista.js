// Tela de lista: mostra os filmes em cartaz, 20 por vez.

import { buscarEmCartaz } from './api.js';
import { removerRepetidos, temMaisPaginas } from './util.js';
import { criarCabecalho, criarRodape, criarCartao, mostrarErro } from './componentes.js';

const grade = document.getElementById('grade');
const estado = document.getElementById('estado');
const botaoMais = document.getElementById('carregar-mais');

document.body.prepend(criarCabecalho());
document.body.append(criarRodape());

let filmesNaTela = []; // filmes já mostrados (para não repetir)
let ultimaPagina = 0; // última página carregada com sucesso

async function carregarPagina(pagina) {
  botaoMais.disabled = true; // evita clique duplo enquanto carrega
  estado.replaceChildren();
  estado.textContent = 'Carregando…';

  try {
    const dados = await buscarEmCartaz(pagina);
    const novos = removerRepetidos(filmesNaTela, dados.results);
    filmesNaTela = filmesNaTela.concat(novos);
    grade.append(...novos.map(criarCartao));
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

botaoMais.addEventListener('click', () => carregarPagina(ultimaPagina + 1));

carregarPagina(1);
