/**
 * Callbolômetro — Armazenamento local (localStorage)
 *
 * Sistema de Cadastro/Login simples e histórico **isolado por usuário**.
 * Cada usuário só enxerga o próprio histórico de refeições.
 * Sem custo algum: tudo fica gravado no navegador.
 *
 * ATENÇÃO (demo local): em produção/na internet, troque por autenticação
 * real (ex.: Supabase/Auth) e um banco de dados. Aqui o foco é simplicidade
 * e funcionamento 100% offline e gratuito.
 */

const Storage = (() => {
  "use strict";

  const KEY_USERS = "callbolota_users";
  const KEY_SESSAO = "callbolota_sessao";

  function lerUsers() {
    try {
      const raw = localStorage.getItem(KEY_USERS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function salvarUsers(lista) {
    localStorage.setItem(KEY_USERS, JSON.stringify(lista));
  }

  function chaveHistorico(usuario) {
    return "callbolota_hist_'"
      + String(usuario).replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  function chavePerfil(usuario) {
    return "callbolota_perfil_"
      + String(usuario).replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  /** Retorna os dados do usuário (inclui criadoEm) ou null. */
  function usuarioInfo(usuario) {
    const u = String(usuario || "").trim();
    if (!u) return null;
    const users = lerUsers();
    return users.find((x) => x.usuario === u) || null;
  }

  /** Retorna o perfil de um usuário ou null (primeiro login ainda). */
  function carregarPerfil(usuario) {
    if (!usuario) return null;
    try {
      return JSON.parse(localStorage.getItem(chavePerfil(usuario)) || "null");
    } catch (e) {
      return null;
    }
  }

  /** Salva/atualiza o perfil do usuário. */
  function salvarPerfil(usuario, perfil) {
    if (!usuario) return null;
    const novo = Object.assign(
      { atualizadoEm: new Date().toISOString() },
      perfil || {}
    );
    localStorage.setItem(chavePerfil(usuario), JSON.stringify(novo));
    return novo;
  }

  /** Cadastra novo usuário. Retorna {ok, erro} */
  function registrar(usuario, senha) {
    const u = String(usuario || "").trim();
    if (!u || String(senha || "").length < 4) {
      return { ok: false, erro: "Informe um usuário e uma senha com pelo menos 4 caracteres." };
    }
    const users = lerUsers();
    if (users.some((x) => x.usuario.toLowerCase() === u.toLowerCase())) {
      return { ok: false, erro: "Este usuário já está cadastrado." };
    }
    users.push({ usuario: u, senha: String(senha), criadoEm: new Date().toISOString() });
    salvarUsers(users);
    return { ok: true, usuario: u };
  }

  /** Faz login. Retorna {ok, erro} */
  function entrar(usuario, senha) {
    const u = String(usuario || "").trim();
    const users = lerUsers();
    const found = users.find((x) => x.usuario.toLowerCase() === u.toLowerCase());
    if (!found || found.senha !== String(senha)) {
      return { ok: false, erro: "Usuário ou senha inválidos." };
    }
    localStorage.setItem(KEY_SESSAO, found.usuario);
    return { ok: true, usuario: found.usuario };
  }

  function sair() {
    localStorage.removeItem(KEY_SESSAO);
  }

  /** Retorna o usuário atualmente logado ou null. */
  function usuarioAtual() {
    const s = localStorage.getItem(KEY_SESSAO);
    if (!s) return null;
    const users = lerUsers();
    return users.find((x) => x.usuario === s) ? s : null;
  }

  /** Adiciona uma refeição ao histórico do usuário logado. */
  function salvarRefeicao(usuario, refeicao) {
    if (!usuario) return null;
    const k = chaveHistorico(usuario);
    let hist = [];
    try {
      hist = JSON.parse(localStorage.getItem(k) || "[]");
    } catch (e) {
      hist = [];
    }
    const item = Object.assign(
      { id: Date.now() + "-" + Math.random().toString(36).slice(2, 8), data: new Date().toISOString() },
      refeicao
    );
    hist.push(item);
    localStorage.setItem(k, JSON.stringify(hist));
    return item;
  }

  /** Remove uma refeição do histórico do usuário. */
  function removerRefeicao(usuario, id) {
    if (!usuario) return;
    const k = chaveHistorico(usuario);
    let hist = [];
    try {
      hist = JSON.parse(localStorage.getItem(k) || "[]");
    } catch (e) {
      hist = [];
    }
    hist = hist.filter((x) => x.id !== id);
    localStorage.setItem(k, JSON.stringify(hist));
  }

  /** Lista (mais recente primeiro) o histórico do usuário. */
  function listarHistorico(usuario) {
    if (!usuario) return [];
    try {
      const hist = JSON.parse(localStorage.getItem(chaveHistorico(usuario)) || "[]");
      return hist.sort((a, b) => new Date(b.data) - new Date(a.data));
    } catch (e) {
      return [];
    }
  }

  function chaveTema(usuario) {
    return "callbolota_tema_"
      + String(usuario).replace(/[^a-zA-Z0-9_.-]/g, "_");
  }

  /** Retorna o tema do usuário ("claro"|"escuro") ou null. */
  function carregarTema(usuario) {
    if (!usuario) return null;
    const v = localStorage.getItem(chaveTema(usuario));
    return v === "escuro" || v === "dark" ? "escuro" : (v ? "claro" : null);
  }

  /** Salva a preferência de tema do usuário. */
  function salvarTema(usuario, tema) {
    if (!usuario) return;
    localStorage.setItem(chaveTema(usuario), tema === "escuro" ? "escuro" : "claro");
  }

  return {
    registrar: registrar,
    entrar: entrar,
    sair: sair,
    usuarioAtual: usuarioAtual,
    usuarioInfo: usuarioInfo,
    carregarPerfil: carregarPerfil,
    salvarPerfil: salvarPerfil,
    carregarTema: carregarTema,
    salvarTema: salvarTema,
    salvarRefeicao: salvarRefeicao,
    removerRefeicao: removerRefeicao,
    listarHistorico: listarHistorico,
  };
})();

if (typeof window !== "undefined") {
  window.Storage = Storage;
}