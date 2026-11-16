// Pedaços de página reaproveitados pelas duas telas.
// Cada função recebe dados e devolve um elemento HTML pronto para ser colocado na página.

import { urlImagem, formatarNota } from './util.js';

// Atalho para criar um elemento com classe e texto.
export function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}

export function criarCabecalho() {
  const cabecalho = criar('header', 'cabecalho');
  const marca = criar('a', 'marca', '🎬 Em Cartaz');
  marca.href = 'index.html';
  // Espaço reservado: no futuro entra aqui o "Entrar" / nome do usuário.
  const areaUsuario = criar('div');
  areaUsuario.id = 'area-usuario';
  cabecalho.append(marca, areaUsuario);
  return cabecalho;
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

// Cartão de um filme na lista. O cartão inteiro é um link para a página de detalhes.
// (No futuro, o botão de favoritar entra aqui.)
export function criarCartao(filme) {
  const cartao = criar('a', 'cartao');
  cartao.href = `filme.html?id=${filme.id}`;

  const poster = criar('img', 'poster');
  poster.src = urlImagem(filme.poster_path, 'w342');
  poster.alt = filme.title;
  poster.loading = 'lazy';

  const titulo = criar('h2', 'cartao-titulo', filme.title);
  cartao.append(poster, titulo);

  const nota = formatarNota(filme.vote_average);
  if (nota) cartao.append(criar('span', 'nota', `★ ${nota}`));

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
