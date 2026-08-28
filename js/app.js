/**
 * Callbolômetro — Lógica de interface
 * Gerencia telas (Login/Cadastro → Dashboard), cálculo em tempo real
 * e histórico por usuário.
 */
(() => {
  "use strict";

  let BASE = null; // dados de alimentos.json carregados via fetch

  // ----- Elementos -----
  const viewAuth = document.getElementById("view-auth");
  const viewDash = document.getElementById("view-dashboard");
  const msg = document.getElementById("auth-msg");

  const formLogin = document.getElementById("form-login");
  const formCadastro = document.getElementById("form-cadastro");
  const tabLogin = document.getElementById("tab-login");
  const tabCadastro = document.getElementById("tab-cadastro");

  const dashUser = document.getElementById("dash-user");
  const btnSair = document.getElementById("btn-sair");

  // Relógio (data/hora no cabeçalho)
  const relogioEl = document.getElementById("relogio");

  // Calendário
  const selMesAno = document.getElementById("sel-mesano");
  const calEl = document.getElementById("calendario");
  const btnMesAnterior = document.getElementById("mes-anterior");
  const btnMesSeguinte = document.getElementById("mes-seguinte");
  const painelRefeicoes = document.getElementById("painel-refeicoes");
  const gruposRefeicao = document.getElementById("grupos-refeicao");
  const refeicaoFormulario = document.getElementById("refeicao-formulario");
  const refeicoesData = document.getElementById("refeicoes-data");
  const btnFecharRefeicoes = document.getElementById("btn-fechar-refeicoes");
  const modalHistorico = document.getElementById("modal-historico");
  const historicoData = document.getElementById("historico-data");
  const historicoConteudo = document.getElementById("historico-conteudo");
  const btnFecharHistorico = document.getElementById("btn-fechar-historico");

  // Perfil / menu do usuário
  const metaDiaria = document.getElementById("meta-diaria");
  const userMenuTrigger = document.getElementById("user-menu-trigger");
  const userMenuDropdown = document.getElementById("user-menu-dropdown");
  const btnMeusDados = document.getElementById("btn-meus-dados");
  const modalPerfil = document.getElementById("modal-perfil");
  const perfilModalTitulo = document.getElementById("perfil-modal-titulo");
  const perfilModalUser = document.getElementById("perfil-modal-user");
  const perfPeso = document.getElementById("perf-peso");
  const perfMeta = document.getElementById("perf-meta");
  const perfAltura = document.getElementById("perf-altura");
  const perfKcaloria = document.getElementById("perf-kcaloria");
  const perfDataInicio = document.getElementById("perf-datainicio");
  const perfImc = document.getElementById("perf-imc");
  const btnPerfilCancelar = document.getElementById("btn-perfil-cancelar");
  const perfilMsg = document.getElementById("perfil-msg");
  const formPerfil = document.getElementById("form-perfil");
  const btnTema = document.getElementById("btn-tema");

  // ----- Suporte -----
  function setMsg(texto, tipo) {
    msg.textContent = texto || "";
    msg.className = "msg" + (tipo ? " " + tipo : "");
  }

  function mostrarVista(vista) {
    if (vista === "auth") { viewAuth.classList.remove("hidden"); viewDash.classList.add("hidden"); }
    else { viewAuth.classList.add("hidden"); viewDash.classList.remove("hidden"); }
  }

  function mostrarErro(el, texto) {
    el.className = "resultado erro";
    el.innerHTML = "⚠️ " + esc(texto);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function abas(tab) {
    const ativo = tab === "cadastro";
    tabLogin.classList.toggle("active", !ativo);
    tabCadastro.classList.toggle("active", ativo);
    formLogin.classList.toggle("ativo", !ativo);
    formCadastro.classList.toggle("ativo", ativo);
    setMsg("");
  }

  // ----- Carregamento de dados -----
  async function carregarBase() {
    try {
      // "?v=" busta o cache; tenta primeiro o JSON externo (funciona em servidor/Vercel)
      const res = await fetch("data/alimentos.json?v=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      BASE = await res.json();
    } catch (e) {
      console.warn("fetch de alimentos.json falhou; usando base embutida (offline).", e);
      // Fallback embutido p/ funcionar via file:// (fetch bloqueado por CORS)
      if (window.ALIMENTOS_BASE) {
        BASE = window.ALIMENTOS_BASE;
      } else {
        console.error(e);
        return;
      }
    }
  }

  // ----- Relógio (data e hora atuais no cabeçalho) -----
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function dois(n) { return String(n).padStart(2, "0"); }

  function atualizarRelogio() {
    const d = new Date();
    const texto = DIAS_SEMANA[d.getDay()] + ", " + d.getDate() + " de " +
      MESES[d.getMonth()] + " de " + d.getFullYear() +
      " — " + dois(d.getHours()) + ":" + dois(d.getMinutes()) + ":" + dois(d.getSeconds());
    relogioEl.textContent = texto;
  }
  function iniciarRelogio() {
    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);
  }

  // ----- Calendário (mês/ano selecionado) -----
  let calAno = new Date().getFullYear();
  let calMes = new Date().getMonth(); // 0-11

  function valorMesAno(ano, mes) { return ano + "-" + dois(mes + 1); }

  /** Preenche o seletor com "janeiro / 2026", "fevereiro / 2026", ... (ano atual ±3). */
  function preencherSeletorMesAno() {
    const anoAtual = new Date().getFullYear();
    let opts = "";
    for (let ano = anoAtual - 3; ano <= anoAtual + 3; ano++) {
      for (let m = 0; m < 12; m++) {
        const v = valorMesAno(ano, m);
        opts += '<option value="' + v + '">' + MESES[m] + " / " + ano + "</option>";
      }
    }
    selMesAno.innerHTML = opts;
    selMesAno.value = valorMesAno(calAno, calMes);
  }

  /** Renderiza o calendário do mês/ano correntes. */
  function renderCalendario() {
    const hoje = new Date();
    const primeiroDia = new Date(calAno, calMes, 1);            // dia da semana (0=Dom)
    const diasNoMes = new Date(calAno, calMes + 1, 0).getDate(); // total de dias
    const diaHoje = hoje.getDate();
    const mesmoMes = hoje.getFullYear() === calAno && hoje.getMonth() === calMes;
    const perfil = Storage.perfilAtual || null;
    const meta = perfil && Number(perfil.metaCaloriaDiaria);

    let html = '<div class="cal-cabecalho">' +
      DIAS_SEMANA.map((d) => '<span class="cal-dow">' + d + "</span>").join("") +
      "</div><div class=\"cal-grid\">";
    for (let v = 0; v < primeiroDia.getDay(); v++) html += '<span class="cal-vazio"></span>';
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const ehHoje = mesmoMes && dia === diaHoje;
      const data = valorData(calAno, calMes, dia);
      const refeicoes = resumoData(data);
      const total = totalData(data);
      const passado = new Date(calAno, calMes, dia) < new Date(hoje.getFullYear(), hoje.getMonth(), diaHoje);
      const classeTotal = passado && refeicoes.length ? classeCalorias(total, meta) : "";
      html += '<div class="cal-dia' + (ehHoje ? " hoje" : "") + classeTotal + '>' +
        '<span class="cal-num">' + dia + "</span>" +
        (passado && refeicoes.length ? '<span class="total-dia">' + nro(total) + ' kcal</span><button type="button" class="btn-historico-dia" data-data="' + data + '" title="Ver histórico do dia">Histórico</button>' : "") +
        (ehHoje ? '<button type="button" class="btn-refeicoes" data-data="' + data + '" title="Ver refeições do dia" aria-label="Ver refeições do dia">🔖</button>' : "") +
        "</div>";
    }
    html += "</div>";
    calEl.innerHTML = html;
    selMesAno.value = valorMesAno(calAno, calMes);
  }

  function moverMes(delta) {
    const d = new Date(calAno, calMes + delta, 1);
    calAno = d.getFullYear();
    calMes = d.getMonth();
    renderCalendario();
  }

  function nro(v) { return Math.round(Number(v) * 100) / 100; }

  const GRUPOS_REFEICAO = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da tarde", "Janta", "Lanche Noite"];
  let dataRefeicaoAberta = null;
  let grupoRefeicaoAberto = null;
  let itensGrupoConfirmados = [];
  let refeicoesCalendario = [];

  function resumoData(data) {
    return refeicoesCalendario.filter((item) => item.dataLocal === data);
  }

  function totalData(data) {
    return resumoData(data).reduce((total, item) => total + Number(item.totalKcal || 0), 0);
  }

  function classeCalorias(total, meta) {
    if (meta == null || total < meta) return " calorias-abaixo";
    if (Math.abs(total - meta) < 0.01) return " calorias-igual";
    return " calorias-acima";
  }

  async function carregarRefeicoesCalendario(usuario) {
    try { refeicoesCalendario = await Storage.listarHistorico(usuario); }
    catch (e) { refeicoesCalendario = []; }
  }

  function valorData(ano, mes, dia) {
    return ano + "-" + dois(mes + 1) + "-" + dois(dia);
  }

  function textoData(data) {
    const partes = data.split("-").map(Number);
    return partes[2] + " de " + MESES[partes[1] - 1] + " de " + partes[0];
  }

  function mostrarPainelRefeicoes(data) {
    dataRefeicaoAberta = data;
    grupoRefeicaoAberto = null;
    painelRefeicoes.classList.remove("hidden");
    refeicoesData.textContent = textoData(data);
    refeicaoFormulario.classList.add("hidden");
    refeicaoFormulario.innerHTML = "";
  }

  function fecharPainelRefeicoes() {
    painelRefeicoes.classList.add("hidden");
    grupoRefeicaoAberto = null;
  }

  async function abrirGrupoRefeicao(grupo) {
    const conteudo = gruposRefeicao.querySelector('[data-grupo-conteudo="' + grupo.replace(/"/g, '&quot;') + '"]');
    if (!conteudo) return;
    if (grupoRefeicaoAberto === grupo && !conteudo.classList.contains("hidden")) {
      conteudo.classList.add("hidden");
      refeicaoFormulario.classList.add("hidden");
      grupoRefeicaoAberto = null;
      return;
    }
    grupoRefeicaoAberto = grupo;
    gruposRefeicao.querySelectorAll(".grupo-refeicao-conteudo").forEach((conteudo) => {
      conteudo.classList.add("hidden");
      conteudo.innerHTML = "";
    });
    conteudo.classList.remove("hidden");
    conteudo.appendChild(refeicaoFormulario);
    refeicaoFormulario.classList.remove("hidden");
    itensGrupoConfirmados = [];
    try {
      const historico = await Storage.listarHistorico();
      const salvo = historico.find((item) => item.dataLocal === dataRefeicaoAberta && item.grupo === grupo);
      itensGrupoConfirmados = salvo && Array.isArray(salvo.itens) ? salvo.itens : [];
    } catch (e) {
      itensGrupoConfirmados = [];
    }
    refeicaoFormulario.innerHTML =
      '<div class="formulario-topo"><h3>' + esc(grupo) + '</h3>' +
      '<button type="button" class="btn-voltar-grupos">Todos os grupos</button></div>' +
      '<div class="itens-refeicao"></div>' +
      '<button type="button" class="btn-adicionar-item" title="Adicionar outro alimento">+ Adicionar alimento</button>' +
      '<div class="resultado-refeicao" aria-live="polite"></div>';
    itensGrupoConfirmados.forEach((item, indice) => adicionarLinhaRefeicao(item, indice));
    atualizarTotalGrupo();
  }

  function adicionarLinhaRefeicao(item, indice) {
    const lista = refeicaoFormulario.querySelector(".itens-refeicao");
    const linha = document.createElement("div");
    linha.className = "item-refeicao-form";
    if (item) { linha.classList.add("item-confirmado"); linha.dataset.itemIndex = indice; }
    linha.innerHTML =
      '<label>Alimento<input type="text" class="campo-alimento" placeholder="ex.: arroz" autocomplete="off" value="' + (item ? esc(item.alimentoBusca || item.alimento || "") : "") + '"' + (item ? " readonly" : "") + '></label>' +
      '<label>Quantidade<input type="number" class="campo-quantidade" min="0.01" step="0.01" placeholder="ex.: 2" value="' + (item ? esc(item.quantidade) : "") + '"' + (item ? " readonly" : "") + '></label>' +
      '<label>Medida<select class="campo-unidade"' + (item ? " disabled" : "") + '>' + Object.keys(BASE && BASE.medidas_caseiras || {}).map((medida) =>
        '<option value="' + esc(medida) + '"' + (item && item.unidade === medida ? " selected" : "") + '>' + esc(medida) + '</option>').join("") + '</select></label>' +
      (item ? '<span class="kcal-item">' + nro(item.kcal) + ' kcal</span>' : '<button type="button" class="btn-confirmar-item" title="Confirmar alimento" aria-label="Confirmar alimento">✓</button>') +
      '<button type="button" class="btn-remover-item" title="Excluir alimento" aria-label="Excluir alimento">×</button>';
    lista.appendChild(linha);
    if (!item) linha.querySelector(".campo-alimento").focus();
  }

  function idGrupoRefeicao() {
    return "grupo-" + dataRefeicaoAberta + "-" + Motor.normalizar(grupoRefeicaoAberto).replace(/[^a-z0-9]+/g, "-");
  }

  async function salvarGrupoRefeicao() {
    const total = itensGrupoConfirmados.reduce((soma, item) => soma + Number(item.kcal || 0), 0);
    const usuario = Storage.usuarioAtual();
    if (!usuario) return;
    if (!itensGrupoConfirmados.length) {
      await Storage.removerRefeicao(usuario, idGrupoRefeicao());
      return;
    }
    await Storage.salvarRefeicao(usuario, {
      id: idGrupoRefeicao(), dataLocal: dataRefeicaoAberta, data: dataRefeicaoAberta + "T12:00:00",
      grupo: grupoRefeicaoAberto, itens: itensGrupoConfirmados, totalKcal: total,
    });
    await carregarRefeicoesCalendario(Storage.usuarioAtual());
    renderCalendario();
  }

  async function confirmarLinhaRefeicao(linha) {
    if (!BASE) return;
    const alimento = linha.querySelector(".campo-alimento").value.trim();
    const quantidade = linha.querySelector(".campo-quantidade").value;
    const unidade = linha.querySelector(".campo-unidade").value;
    try {
      if (!alimento) throw new Error("Informe o alimento.");
      const calculado = Motor.calcular(BASE, quantidade, unidade, alimento);
      const item = { alimento: calculado.alimento.nome, alimentoBusca: alimento, quantidade: calculado.quantidade, unidade: calculado.unidadeDigita, kcal: calculado.kcal };
      itensGrupoConfirmados.push(item);
      linha.remove();
      adicionarLinhaRefeicao(item, itensGrupoConfirmados.length - 1);
      atualizarTotalGrupo();
      await salvarGrupoRefeicao();
    } catch (e) {
      linha.classList.add("linha-erro");
      linha.title = e.message;
    }
  }

  function atualizarTotalGrupo() {
    const total = itensGrupoConfirmados.reduce((soma, item) => soma + Number(item.kcal || 0), 0);
    const resultado = refeicaoFormulario.querySelector(".resultado-refeicao");
    resultado.className = "resultado-refeicao ok";
    resultado.innerHTML = '<div class="total-refeicao">Total: ' + nro(total) + ' kcal</div>';
  }

  function calcularGrupoRefeicao() {
    const resultado = refeicaoFormulario.querySelector(".resultado-refeicao");
    const linhas = Array.from(refeicaoFormulario.querySelectorAll(".item-refeicao-form"));
    if (!BASE) { resultado.className = "resultado-refeicao erro"; resultado.textContent = "A base de alimentos ainda está carregando."; return; }
    let total = 0;
    const calculados = [];
    try {
      linhas.forEach((linha) => {
        const alimento = linha.querySelector(".campo-alimento").value.trim();
        const quantidade = linha.querySelector(".campo-quantidade").value;
        const unidade = linha.querySelector(".campo-unidade").value;
        if (!alimento) throw new Error("Informe o alimento em todas as linhas.");
        const calculado = Motor.calcular(BASE, quantidade, unidade, alimento);
        total += calculado.kcal;
        calculados.push(calculado);
      });
    } catch (e) {
      resultado.className = "resultado-refeicao erro";
      resultado.textContent = e.message;
      return;
    }
    resultado.className = "resultado-refeicao ok";
    resultado.innerHTML = calculados.map((item) =>
      '<div class="resultado-item"><span>' + esc(item.alimento.nome) + '</span><strong>' + nro(item.kcal) + ' kcal</strong></div>'
    ).join("") + '<div class="total-refeicao">Total: ' + nro(total) + ' kcal</div>';
    const usuario = Storage.usuarioAtual();
    if (usuario) Storage.salvarRefeicao(usuario, {
      dataLocal: dataRefeicaoAberta,
      data: dataRefeicaoAberta + "T12:00:00",
      grupo: grupoRefeicaoAberto,
      itens: calculados.map((item) => ({ alimento: item.alimento.nome, quantidade: item.quantidade, unidade: item.unidadeDigita, kcal: item.kcal })),
      totalKcal: total,
    }).catch((e) => {
      resultado.className = "resultado-refeicao erro";
      resultado.textContent = e.message;
    });
  }


  // ----- Perfil -----
  function classificarImc(imc) {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Peso normal";
    if (imc < 30) return "Sobrepeso";
    return "Obesidade";
  }

  /** Calcula IMC (peso em kg, altura em cm). Retorna null se inválido. */
  function calcularImc(peso, alturaCm) {
    const p = Number(peso);
    const a = Number(alturaCm) / 100;
    if (!p || !a || p <= 0 || a <= 0) return null;
    return p / (a * a);
  }

  /** Atualiza a caixinha de IMC em tempo real no modal. */
  function atualizarImcDisplay() {
    const imc = calcularImc(perfPeso.value, perfAltura.value);
    if (imc == null) {
      perfImc.className = "resultado neutral";
      perfImc.innerHTML = "Informe peso e altura para calcular o IMC.";
      return;
    }
    perfImc.className = "resultado ok";
    perfImc.innerHTML =
      "📊 IMC: <strong>" + nro(imc).toFixed(1) + "</strong> — " + esc(classificarImc(imc));
  }

  /** Abre o modal de perfil (novo, do primeiro login, ou edição). */
  async function abrirModalPerfil(usuario) {
    perfilMsg.textContent = "";
    perfilMsg.className = "msg";
    perfilModalUser.textContent = usuario;

    const existente = await Storage.carregarPerfil(usuario);
    const info = await Storage.usuarioInfo(usuario);
    // Título muda: 1º login vs. consulta/edição
    perfilModalTitulo.textContent = existente ? "📋 Meus dados" : "📋 Complete seu perfil";
    // data de início: já salvo ou data de cadastro ou hoje
    perfDataInicio.value =
      (existente && existente.dataInicio) ||
      (info && info.criadoEm ? info.criadoEm.slice(0, 10) : new Date().toISOString().slice(0, 10));
    perfPeso.value = existente ? existente.pesoAtual : "";
    perfMeta.value = existente && existente.metaPeso != null ? existente.metaPeso : "";
    perfAltura.value = existente ? existente.alturaCm : "";
    perfKcaloria.value = existente && existente.metaCaloriaDiaria != null ? existente.metaCaloriaDiaria : "";
    atualizarImcDisplay();
    modalPerfil.classList.remove("hidden");
    fecharMenuUsuario();
    perfPeso.focus();
  }

  function fecharModalPerfil() {
    modalPerfil.classList.add("hidden");
  }

  function alternarMenuUsuario() {
    const aberto = !userMenuDropdown.classList.contains("hidden");
    userMenuDropdown.classList.toggle("hidden", aberto);
    userMenuTrigger.setAttribute("aria-expanded", String(!aberto));
  }
  function fecharMenuUsuario() {
    if (!userMenuDropdown.classList.contains("hidden")) {
      userMenuDropdown.classList.add("hidden");
      userMenuTrigger.setAttribute("aria-expanded", "false");
    }
  }

  /** Aplica o tema (claro/escuro) no documento e no botão. */
  function aplicarTema(tema) {
    const escuro = tema === "escuro" || tema === "dark";
    document.documentElement.setAttribute("data-theme", escuro ? "dark" : "claro");
    if (btnTema) {
      btnTema.textContent = escuro ? "☀️" : "🌙";
      btnTema.title = escuro ? "Ativar modo claro" : "Ativar modo escuro";
    }
  }

  /** Pega a meta de calorias diária do perfil (aceita nomes antigos). */
  function metaDoPerfil(p) {
    if (!p) return null;
    const v = p.metaCaloriaDiaria != null ? p.metaCaloriaDiaria : p.metaKcaloriaDiaria;
    return v != null ? v : null;
  }

  /** Preenche a meta de calorias diária - em uma única linha, em destaque. */
  async function renderMetaDiaria(usuario) {
    const p = await Storage.carregarPerfil(usuario);
    const meta = metaDoPerfil(p);
    if (!p || meta == null) {
      metaDiaria.innerHTML = "";
      metaDiaria.title = "Meta de calorias diária";
      return;
    }
    metaDiaria.innerHTML =
      '<span class="rot">Meta:</span>' +
      '<span class="num">' + esc(String(meta)) + ' kcal</span>';
    metaDiaria.title = "Meta de calorias diária: " + meta + " kcal";
  }

  async function salvarPerfilHandler(e) {
    e.preventDefault();
    const u = Storage.usuarioAtual();
    if (!u) return;
    const peso = Number(perfPeso.value);
    const meta = perfMeta.value === "" ? null : Number(perfMeta.value);
    const altura = Number(perfAltura.value);
    const kcal = Number(perfKcaloria.value);
    const dataInicio = perfDataInicio.value;

    if (!perfPeso.value || !peso || peso <= 0) { perfilMsg.className = "msg erro"; perfilMsg.textContent = "Informe o peso atual (kg)."; return; }
    if (!perfAltura.value || !altura || altura < 50) { perfilMsg.className = "msg erro"; perfilMsg.textContent = "Informe a altura (cm)."; return; }
    if (!perfKcaloria.value || isNaN(kcal) || kcal <= 0) { perfilMsg.className = "msg erro"; perfilMsg.textContent = "Informe a meta de calorias diária."; return; }
    if (!perfDataInicio.value) { perfilMsg.className = "msg erro"; perfilMsg.textContent = "Informe a data de início."; return; }

    const imc = calcularImc(peso, altura);
    const perfil = {
      pesoAtual: peso,
      metaPeso: meta,
      alturaCm: altura,
      imc: imc != null ? imc : null,
      classificacaoImc: imc != null ? classificarImc(imc) : null,
      metaCaloriaDiaria: kcal,
      dataInicio: dataInicio,
    };
    await Storage.salvarPerfil(u, perfil);
    fecharModalPerfil();
    renderMetaDiaria(u);
  }

  // ----- Navegação / Estado -----
  async function entrarDashboard(usuario) {
    dashUser.textContent = "👤 " + usuario;
    mostrarVista("dashboard");
    await renderMetaDiaria(usuario);
    Storage.perfilAtual = await Storage.carregarPerfil(usuario);
    await carregarRefeicoesCalendario(usuario);
    // Aplica o tema salvo como preferência do usuário (fora dos dados)
    const tema = await Storage.carregarTema(usuario);
    aplicarTema(tema === "escuro" ? "escuro" : "claro");
    iniciarRelogio();
    preencherSeletorMesAno();
    renderCalendario();
    // Primeiro login (ou perfil incompleto): abre a janela de preenchimento
    if (!(await Storage.carregarPerfil(usuario))) {
      await abrirModalPerfil(usuario);
    }
  }

  // ----- Eventos -----
  tabLogin.addEventListener("click", () => abas("login"));
  tabCadastro.addEventListener("click", () => abas("cadastro"));

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await Storage.entrar(document.getElementById("login-user").value, document.getElementById("login-pass").value);
    if (r.ok) { setMsg("Bem-vindo(a), " + r.usuario + "!", "ok"); await entrarDashboard(r.usuario); }
    else setMsg(r.erro, "erro");
  });

  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = document.getElementById("cad-user").value;
    const s1 = document.getElementById("cad-pass").value;
    const s2 = document.getElementById("cad-pass2").value;
    if (s1 !== s2) { setMsg("As senhas não coincidem.", "erro"); return; }
    const r = await Storage.registrar(u, s1);
    if (r.ok) {
      setMsg("Conta criada! Você já está logado.", "ok");
      await Storage.entrar(r.usuario, s1);
      await entrarDashboard(r.usuario);
    } else {
      setMsg(r.erro, "erro");
    }
  });

  // Menu do usuário — nome clicável → "Meus dados" / "Sair"
  userMenuTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    alternarMenuUsuario();
  });
  btnMeusDados.addEventListener("click", async () => {
    const u = Storage.usuarioAtual();
    if (u) await abrirModalPerfil(u);
  });
  btnSair.addEventListener("click", async () => {
    fecharMenuUsuario();
    await Storage.sair();
    mostrarVista("auth");
    abas("login");
  });
  fecharMenuUsuario();
  document.addEventListener("click", fecharMenuUsuario);

  // Perfil — fechar/salvar
  btnPerfilCancelar.addEventListener("click", fecharModalPerfil);
  formPerfil.addEventListener("submit", salvarPerfilHandler);
  perfPeso.addEventListener("input", atualizarImcDisplay);
  perfAltura.addEventListener("input", atualizarImcDisplay);
  // Alternar tema claro/escuro (opção do usuário, fora dos dados)
  btnTema.addEventListener("click", async () => {
    const u = Storage.usuarioAtual();
    const atual = document.documentElement.getAttribute("data-theme") === "dark" ? "escuro" : "claro";
    const novo = atual === "escuro" ? "claro" : "escuro";
    aplicarTema(novo);
    if (u) await Storage.salvarTema(u, novo);
  });
  // Clica fora do modal fecha (somente se o perfil já existir, p/ não travar 1º login)
  modalPerfil.addEventListener("click", async (e) => {
    if (e.target === modalPerfil && await Storage.carregarPerfil(Storage.usuarioAtual())) {
      fecharModalPerfil();
    }
  });

  // Calendário — seletor mês/ano e navegação
  selMesAno.addEventListener("change", () => {
    const [a, m] = selMesAno.value.split("-");
    calAno = Number(a);
    calMes = Number(m) - 1;
    renderCalendario();
  });
  btnMesAnterior.addEventListener("click", () => moverMes(-1));
  btnMesSeguinte.addEventListener("click", () => moverMes(1));

  // Refeições — painel lateral e formulário dinâmico
  calEl.addEventListener("click", (e) => {
    const botao = e.target.closest(".btn-refeicoes");
    if (botao) mostrarPainelRefeicoes(botao.dataset.data);
  });
  gruposRefeicao.addEventListener("click", (e) => {
    const botao = e.target.closest(".grupo-refeicao");
    if (botao) abrirGrupoRefeicao(botao.dataset.grupo);
  });
  refeicaoFormulario.addEventListener("click", (e) => {
    if (e.target.closest(".btn-voltar-grupos")) {
      mostrarPainelRefeicoes(dataRefeicaoAberta);
      return;
    }
    if (e.target.closest(".btn-adicionar-item")) {
      adicionarLinhaRefeicao();
      return;
    }
    const confirmar = e.target.closest(".btn-confirmar-item");
    if (confirmar) {
      confirmarLinhaRefeicao(confirmar.closest(".item-refeicao-form"));
      return;
    }
    const remover = e.target.closest(".btn-remover-item");
    if (remover) {
      const linha = remover.closest(".item-refeicao-form");
      if (linha.classList.contains("item-confirmado")) {
        itensGrupoConfirmados.splice(Number(linha.dataset.itemIndex), 1);
        linha.remove();
        atualizarTotalGrupo();
        salvarGrupoRefeicao().then(() => carregarRefeicoesCalendario(Storage.usuarioAtual())).then(renderCalendario).catch(() => {});
      } else if (refeicaoFormulario.querySelectorAll(".item-refeicao-form").length > 1) {
        linha.remove();
      }
      return;
    }
  });
  btnFecharRefeicoes.addEventListener("click", fecharPainelRefeicoes);
  btnFecharHistorico.addEventListener("click", () => modalHistorico.classList.add("hidden"));
  modalHistorico.addEventListener("click", (e) => {
    if (e.target === modalHistorico) modalHistorico.classList.add("hidden");
  });
  calEl.addEventListener("click", (e) => {
    const botao = e.target.closest(".btn-historico-dia");
    if (!botao) return;
    const data = botao.dataset.data;
    const grupos = resumoData(data);
    historicoData.textContent = textoData(data);
    historicoConteudo.innerHTML = grupos.map((grupo) =>
      '<section class="historico-grupo"><h3>' + esc(grupo.grupo) + '</h3>' +
      (grupo.itens || []).map((item) => '<div class="historico-item"><span>' + esc(item.alimento) + ' · ' + esc(item.quantidade) + ' ' + esc(item.unidade) + '</span><strong>' + nro(item.kcal) + ' kcal</strong></div>').join("") +
      '<div class="historico-total">Total do grupo: ' + nro(grupo.totalKcal) + ' kcal</div></section>'
    ).join("") + '<div class="historico-total geral">Total do dia: ' + nro(totalData(data)) + ' kcal</div>';
    modalHistorico.classList.remove("hidden");
  });

  // Tempo real
  // (formulário de cálculo removido nesta versão — tela principal agora é o calendário)

  // ----- Inicialização -----
  async function iniciar() {
    abas("login");
    try {
      const atual = await Storage.inicializar();
      await carregarBase();
      if (atual) await entrarDashboard(atual);
      else mostrarVista("auth");
    } catch (e) {
      mostrarVista("auth");
      setMsg(e.message, "erro");
    }
  }

  window.Callbolometro = { renderCalendario: renderCalendario, carregarBase: carregarBase };

  document.addEventListener("DOMContentLoaded", iniciar);
})();