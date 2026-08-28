/* Persistencia via API do servidor e banco SQLite. */
const Storage = (() => {
  "use strict";

  let usuarioLogado = null;

  async function requisicao(url, opcoes) {
    const resposta = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, opcoes || {}));
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Nao foi possivel acessar o servidor.");
    return dados;
  }

  async function inicializar() {
    try {
      await migrarDadosAntigos();
      const dados = await requisicao("/api/session");
      usuarioLogado = dados.usuario || null;
    } catch (e) {
      usuarioLogado = null;
      throw new Error("Servidor indisponivel. Abra o sistema pelo iniciar.bat.");
    }
    return usuarioLogado;
  }

  async function migrarDadosAntigos() {
    const usuarios = JSON.parse(localStorage.getItem("callbolota_users") || "[]");
    if (!usuarios.length) return;
    const perfis = {};
    const historicos = {};
    usuarios.forEach((item) => {
      const nome = item.usuario;
      try { perfis[nome] = JSON.parse(localStorage.getItem("callbolota_perfil_" + nome.replace(/[^a-zA-Z0-9_.-]/g, "_")) || "null"); } catch (e) { perfis[nome] = null; }
      try { historicos[nome] = JSON.parse(localStorage.getItem("callbolota_hist_'" + nome.replace(/[^a-zA-Z0-9_.-]/g, "_")) || "[]"); } catch (e) { historicos[nome] = []; }
    });
    const resposta = await requisicao("/api/import-legacy", { method: "POST", body: JSON.stringify({ users: usuarios, perfis, historicos }) });
    if (resposta.ok) {
      localStorage.removeItem("callbolota_users");
      localStorage.removeItem("callbolota_sessao");
      usuarios.forEach((item) => {
        const nome = item.usuario.replace(/[^a-zA-Z0-9_.-]/g, "_");
        localStorage.removeItem("callbolota_perfil_" + nome);
        localStorage.removeItem("callbolota_hist_'" + nome);
      });
    }
  }

  async function registrar(usuario, senha) {
    try { return await requisicao("/api/register", { method: "POST", body: JSON.stringify({ usuario, senha }) }); }
    catch (e) { return { ok: false, erro: e.message }; }
  }

  async function entrar(usuario, senha) {
    try {
      const dados = await requisicao("/api/login", { method: "POST", body: JSON.stringify({ usuario, senha }) });
      usuarioLogado = dados.usuario;
      return dados;
    } catch (e) { return { ok: false, erro: e.message }; }
  }

  async function sair() {
    try { await requisicao("/api/logout", { method: "POST", body: "{}" }); }
    finally { usuarioLogado = null; }
  }

  function usuarioAtual() { return usuarioLogado; }
  async function usuarioInfo(usuario) { return usuario ? { usuario, criadoEm: new Date().toISOString() } : null; }
  async function carregarPerfil() { return (await requisicao("/api/profile")).perfil; }
  async function salvarPerfil(usuario, perfil) { return (await requisicao("/api/profile", { method: "PUT", body: JSON.stringify({ perfil }) })).perfil; }
  async function carregarTema() { return (await requisicao("/api/theme")).tema; }
  async function salvarTema(usuario, tema) { return requisicao("/api/theme", { method: "PUT", body: JSON.stringify({ tema }) }); }
  async function salvarRefeicao(usuario, refeicao) { return requisicao("/api/meals", { method: "POST", body: JSON.stringify(refeicao) }); }
  async function removerRefeicao(usuario, id) { return requisicao("/api/meals?id=" + encodeURIComponent(id), { method: "DELETE" }); }
  async function listarHistorico() { return (await requisicao("/api/meals")).refeicoes || []; }
  async function buscarAlimentosOnline(termo) { return (await requisicao("/api/food-search?q=" + encodeURIComponent(termo))).alimentos || []; }

  return { inicializar, registrar, entrar, sair, usuarioAtual, usuarioInfo, carregarPerfil, salvarPerfil, carregarTema, salvarTema, salvarRefeicao, removerRefeicao, listarHistorico, buscarAlimentosOnline };
})();

if (typeof window !== "undefined") window.Storage = Storage;
