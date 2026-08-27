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

    let html = '<div class="cal-cabecalho">' +
      DIAS_SEMANA.map((d) => '<span class="cal-dow">' + d + "</span>").join("") +
      "</div><div class=\"cal-grid\">";
    for (let v = 0; v < primeiroDia.getDay(); v++) html += '<span class="cal-vazio"></span>';
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const ehHoje = mesmoMes && dia === diaHoje;
      html += '<div class="cal-dia' + (ehHoje ? " hoje" : "") + '">' +
        '<span class="cal-num">' + dia + "</span>" +
        (ehHoje ? '<button type="button" class="btn-refeicoes" title="Ver refeições do dia" aria-label="Ver refeições do dia">↗</button>' : "") +
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
  function abrirModalPerfil(usuario) {
    perfilMsg.textContent = "";
    perfilMsg.className = "msg";
    perfilModalUser.textContent = usuario;

    const existente = Storage.carregarPerfil(usuario);
    const info = Storage.usuarioInfo(usuario);
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
  function renderMetaDiaria(usuario) {
    const p = Storage.carregarPerfil(usuario);
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

  function salvarPerfilHandler(e) {
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
    Storage.salvarPerfil(u, perfil);
    fecharModalPerfil();
    renderMetaDiaria(u);
  }

  // ----- Navegação / Estado -----
  function entrarDashboard(usuario) {
    dashUser.textContent = "👤 " + usuario;
    mostrarVista("dashboard");
    renderMetaDiaria(usuario);
    // Aplica o tema salvo como preferência do usuário (fora dos dados)
    const tema = Storage.carregarTema(usuario);
    aplicarTema(tema === "escuro" ? "escuro" : "claro");
    iniciarRelogio();
    preencherSeletorMesAno();
    renderCalendario();
    // Primeiro login (ou perfil incompleto): abre a janela de preenchimento
    if (!Storage.carregarPerfil(usuario)) {
      abrirModalPerfil(usuario);
    }
  }

  // ----- Eventos -----
  tabLogin.addEventListener("click", () => abas("login"));
  tabCadastro.addEventListener("click", () => abas("cadastro"));

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = Storage.entrar(document.getElementById("login-user").value, document.getElementById("login-pass").value);
    if (r.ok) { setMsg("Bem-vindo(a), " + r.usuario + "!", "ok"); entrarDashboard(r.usuario); }
    else setMsg(r.erro, "erro");
  });

  formCadastro.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("cad-user").value;
    const s1 = document.getElementById("cad-pass").value;
    const s2 = document.getElementById("cad-pass2").value;
    if (s1 !== s2) { setMsg("As senhas não coincidem.", "erro"); return; }
    const r = Storage.registrar(u, s1);
    if (r.ok) {
      setMsg("Conta criada! Você já está logado.", "ok");
      Storage.entrar(r.usuario, s1);
      entrarDashboard(r.usuario);
    } else {
      setMsg(r.erro, "erro");
    }
  });

  // Menu do usuário — nome clicável → "Meus dados" / "Sair"
  userMenuTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    alternarMenuUsuario();
  });
  btnMeusDados.addEventListener("click", () => {
    const u = Storage.usuarioAtual();
    if (u) abrirModalPerfil(u);
  });
  btnSair.addEventListener("click", () => {
    fecharMenuUsuario();
    Storage.sair();
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
  btnTema.addEventListener("click", () => {
    const u = Storage.usuarioAtual();
    const atual = document.documentElement.getAttribute("data-theme") === "dark" ? "escuro" : "claro";
    const novo = atual === "escuro" ? "claro" : "escuro";
    aplicarTema(novo);
    if (u) Storage.salvarTema(u, novo);
  });
  // Clica fora do modal fecha (somente se o perfil já existir, p/ não travar 1º login)
  modalPerfil.addEventListener("click", (e) => {
    if (e.target === modalPerfil && Storage.carregarPerfil(Storage.usuarioAtual())) {
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

  // Botão "Refeições" ao lado do dia atual
  calEl.addEventListener("click", (e) => {
    if (!e.target.classList.contains("btn-refeicoes")) return;
    const hoje = new Date();
    alert("Refeições de " + hoje.getDate() + " de " + MESES[calMes] + " de " + calAno +
      "\n(aqui entrará a lista de refeições do dia)");
  });

  // Tempo real
  // (formulário de cálculo removido nesta versão — tela principal agora é o calendário)

  // ----- Inicialização -----
  function iniciar() {
    abas("login");
    const atual = Storage.usuarioAtual();
    if (atual) entrarDashboard(atual);
    else mostrarVista("auth");
    carregarBase();
  }

  window.Callbolometro = { renderCalendario: renderCalendario, carregarBase: carregarBase };

  document.addEventListener("DOMContentLoaded", iniciar);
})();