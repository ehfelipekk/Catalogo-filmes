// Pedaços de página reaproveitados pelas duas telas.
// Cada função recebe dados e devolve um elemento HTML pronto para ser colocado na página.

import { urlImagem, formatarNota, generoPrincipal, imagemLarga } from './util.js';

// Atalho para criar um elemento com classe e texto.
export function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}

// Desenhos (ícones) do menu, em SVG. São textos fixos escritos por nós,
// por isso é seguro colocá-los com innerHTML.
const ICONES = {
  inicio: '<path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z"/>',
  destaque: '<rect x="3" y="6" width="18" height="12" rx="2"/>',
  ranking: '<path d="m12 4 2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
  todos: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
};

function icone(nome) {
  const bolinha = criar('span', 'menu-icone');
  bolinha.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
  return bolinha;
}

// Painel lateral "de vidro" com a marca e o menu.
// No celular, o CSS transforma esse painel numa barra no topo da tela.
export function criarCabecalho() {
  const painel = criar('header', 'lateral');

  const topo = criar('div', 'lateral-topo');
  const marca = criar('a', 'marca', 'Em Cartaz');
  marca.href = 'index.html';
  // Espaço reservado: no futuro entra aqui o "Entrar" / nome do usuário.
  const areaUsuario = criar('div');
  areaUsuario.id = 'area-usuario';
  topo.append(marca, areaUsuario);

  const menu = criar('nav', 'menu');
  menu.setAttribute('aria-label', 'Menu principal');
  const itens = [
    ['inicio', 'Início', 'index.html'],
    ['destaque', 'Em destaque', 'index.html#destaques'],
    ['ranking', 'Mais bem avaliados', 'index.html#ranking'],
    ['todos', 'Todos em cartaz', 'index.html#todos'],
  ];
  // Na página inicial, o item "Início" ganha o fundo claro de "você está aqui".
  const naInicial = !location.pathname.endsWith('filme.html');
  for (const [nome, texto, endereco] of itens) {
    const link = criar('a', 'menu-item');
    link.href = endereco;
    link.append(icone(nome), criar('span', null, texto));
    if (nome === 'inicio' && naInicial) link.setAttribute('aria-current', 'page');
    menu.append(link);
  }

  painel.append(topo, menu);
  return painel;
}

export function criarRodape() {
  const rodape = criar('footer', 'rodape');
  const logo = criar('img', 'logo-tmdb');
  logo.src = 'img/tmdb-logo.svg';
  logo.alt = 'The Movie Database (TMDB)';
  const aviso = criar(
    'p',
    null,
    'Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.'
  );
  rodape.append(logo, aviso);
  return rodape;
}

// Linha embaixo do título: gênero e nota (cada um só aparece se existir).
function linhaDeDetalhes(filme) {
  const linha = criar('p', 'detalhes-linha');
  const genero = generoPrincipal(filme.genre_ids);
  if (genero) linha.append(criar('span', null, genero));
  const nota = formatarNota(filme.vote_average);
  if (nota) linha.append(criar('span', 'nota', `★ ${nota}`));
  return linha;
}

// Cartão deitado de um filme: imagem larga em cima, título e gênero embaixo.
// O cartão inteiro é um link para a página de detalhes.
// Se receber `posicao`, mostra o número grande do ranking ao lado do título.
// (No futuro, o botão de favoritar entra aqui.)
export function criarCartao(filme, posicao) {
  const cartao = criar('a', 'cartao');
  cartao.href = `filme.html?id=${filme.id}`;

  const imagem = criar('img', 'cartao-imagem');
  imagem.src = imagemLarga(filme, 'w780');
  imagem.alt = ''; // o título já aparece logo abaixo, em texto
  imagem.loading = 'lazy';

  const legenda = criar('div', 'cartao-legenda');
  if (posicao) {
    // aria-hidden: quem usa leitor de tela já ouve a posição pela lista numerada (<ol>).
    const numero = criar('span', 'posicao', String(posicao));
    numero.setAttribute('aria-hidden', 'true');
    legenda.append(numero);
  }
  const textos = criar('div', 'cartao-textos');
  textos.append(criar('h3', 'cartao-titulo', filme.title), linhaDeDetalhes(filme));
  legenda.append(textos);

  cartao.append(imagem, legenda);
  return cartao;
}

// Cartão grande de destaque: a imagem ocupa tudo e o título fica escrito por cima.
export function criarDestaque(filme) {
  const cartao = criar('a', 'destaque');
  cartao.href = `filme.html?id=${filme.id}`;

  const imagem = criar('img', 'destaque-imagem');
  imagem.src = imagemLarga(filme, 'w1280');
  imagem.alt = '';

  const textos = criar('div', 'destaque-textos');
  textos.append(criar('h3', 'destaque-titulo', filme.title), linhaDeDetalhes(filme));

  cartao.append(imagem, textos);
  return cartao;
}

// Troca o conteúdo de `container` por uma mensagem de erro com o botão "Tentar de novo".
export function mostrarErro(container, mensagem, aoTentarDeNovo) {
  const caixa = criar('div', 'erro');
  caixa.append(criar('p', null, mensagem));
  const botao = criar('button', 'botao', 'Tentar de novo');
  botao.type = 'button';
  botao.addEventListener('click', aoTentarDeNovo);
  caixa.append(botao);
  container.replaceChildren(caixa);
}
