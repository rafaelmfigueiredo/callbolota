/**
 * Callbolômetro — Motor de Cálculo
 * Lógica pura (sem DOM). Funções para converter medidas caseiras,
 * buscar alimentos (tratando sinônimos e palavras) e calcular calorias
 * por regra de três.
 *
 * Importante: nada aqui toca armazenamento ou interface.
 */

const Motor = (() => {
  "use strict";

  /** Unidade/fator adotado quando a unidade informada não é reconhecida. */
  const UNIDADE_PADRAO = "grama"; // fator 1g

  /**
   * Normaliza texto: minúsculas, remove acentos e caracteres especiais,
   * e colapsa espaços repetidos.
   * ex.: "Feijão!" -> "feijao"; "  Colheres   Grande  " -> "colheres grande".
   */
  function normalizar(texto) {
    if (!texto) return "";
    return String(texto)
      .toLowerCase()
      .normalize("NFD") // separa a base das marcas de acento (à -> a + `)
      .replace(/[\u0300-\u036f]/g, "") // remove as marcas de acento
      .replace(/\s+/g, " ") // colapsa espaços/tabs
      .trim();
  }

  /** Separa um texto normalizado em palavras individuais. */
  function palavras(texto) {
    return normalizar(texto)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  /** Formas singular/plural candidatas de uma palavra. ex.: colheres -> colher. */
  function formasSingulares(palavra) {
    const p = String(palavra).toLowerCase().trim();
    const candidatas = new Set([p]);
    if (p.length > 2 && p.endsWith("s")) candidatas.add(p.slice(0, -1));
    if (p.length > 3 && p.endsWith("es")) candidatas.add(p.slice(0, -2));
    return Array.from(candidatas);
  }

  /**
   * Converte a unidade digitada na chave do dicionário de medidas,
   * ignorando plural/singular e variações.
   * ex.: "colheres grande", "colheres grandes", "colher grande" ou "colher"
   *      todos mapeiam para "colher grande".
   *
   * Se a unidade não for reconhecida, assume fator padrão (grama = 1g)
   * para não travar o cálculo.
   *
   * @param {Object} medidas  objeto chave -> fator em gramas/ml
   * @param {string} unidade  texto digitado pela pessoa
   * @returns {{chave: string, padrao: boolean}} chave e se usou fallback
   */
  function encontrarMedida(medidas, unidade) {
    if (!medidas || typeof medidas !== "object" || !unidade) {
      return { chave: UNIDADE_PADRAO, padrao: true };
    }

    // Mapa: forma normalizada da chave -> chave original.
    const mapaNormalizado = {};
    Object.keys(medidas).forEach((k) => {
      const n = normalizar(k);
      if (!(n in mapaNormalizado)) mapaNormalizado[n] = k;
    });

    // 1) Equivalência exata (após normalização de acentos/caixa/espaços)
    const entradaNormal = normalizar(unidade);
    if (entradaNormal in mapaNormalizado) {
      return { chave: mapaNormalizado[entradaNormal], padrao: false };
    }

    // 2) Flexível a plural/singular, comparando TOKEN a TOKEN.
    //    "colheres grande"/"colheres grandes" -> casa com "colher grande"
    //    porque "colheres"~"colher" e "grandes"~"grande".
    const entradaTokens = entradaNormal.split(" ").filter(Boolean);

    let melhor = null;
    let melhorScore = 0;
    for (const k of Object.keys(medidas)) {
      const chaveTokens = normalizar(k).split(" ").filter(Boolean);
      let acertos = 0;
      for (const et of entradaTokens) {
        const casou = chaveTokens.some((ct) => {
          if (ct === et) return true;
          // compara formas singulares/plurais
          return formasSingulares(ct).some((fct) => formasSingulares(et).includes(fct));
        });
        if (casou) acertos++;
      }
      // Exige que TODOS os tokens da entrada casem com a chave.
      if (acertos === entradaTokens.length && acertos > 0) {
        const score = acertos - Math.abs(chaveTokens.length - entradaTokens.length) / 10;
        if (score > melhorScore) {
          melhorScore = score;
          melhor = k;
        }
      }
    }
    if (melhor) return { chave: melhor, padrao: false };

    // 3) Nenhuma unidade reconhecida -> fator padrão (1 grama).
    return { chave: UNIDADE_PADRAO, padrao: true };
  }

  /**
   * Busca alimento usando nome canônico ou sinônimos, sem exigir
   * correspondência exata. Cruza as PALAVRAS digitadas com as palavras
   * do nome e dos sinônimos (ex.: "ovo cozido" -> "Ovo de galinha cozido").
   *
   * Ordem de prioridade:
   *   1) frase exata (nome ou sinônimo)  -> score máximo
   *   2) query contido na frase          -> alta prioridade
   *   3) todas as palavras do query presentes no alimento -> válido
   *
   * @param {Array} alimentos  lista de alimentos
   * @param {string} busca     texto digitado pela pessoa
   * @returns {Object|null}    o alimento mais adequado ou null
   */
  function encontrarAlimento(alimentos, busca) {
    if (!alimentos || !busca) return null;
    const alvo = normalizar(busca);
    if (!alvo) return null;
    const tokenAlvo = palavras(alvo);

    let melhor = null;
    let melhorScore = 0;

    for (const al of alimentos) {
      const textos = [al.nome].concat(al.sinonimos || []);
      const score = avaliarAlimento(textos, alvo, tokenAlvo);
      if (score > melhorScore) {
        melhorScore = score;
        melhor = al;
      }
    }
    return melhorScore > 0 ? melhor : null;
  }

  /** Pontua um alimento (textos) contra o query. Quanto maior, melhor. */
  function avaliarAlimento(textos, alvo, tokenAlvo) {
    // 1) Frase exata
    for (const t of textos) {
      if (normalizar(t) === alvo) return 1000;
    }
    // 2) Query contido na frase
    for (const t of textos) {
      const tn = normalizar(t);
      if (tn.includes(alvo)) return 500;
    }
    // 3) Cruzamento palavra a palavra (todas presentes)
    const conjuntoPalavras = new Set();
    textos.forEach((t) => palavras(t).forEach((w) => conjuntoPalavras.add(w)));

    let acertos = 0;
    for (const w of tokenAlvo) {
      if (conjuntoPalavras.has(w)) acertos++;
      else break; // palavra ausente -> rejeita
    }
    if (acertos === tokenAlvo.length && tokenAlvo.length > 0) {
      return acertos * 10;
    }
    return 0;
  }

  /**
   * Calcula as calorias totais de uma refeição.
   * Fórmula: (peso_total / 100) * kcal_por_100g
   * peso_total = quantidade * fator_da_medida
   *
   * @param {Object} base     objeto com {medidas_caseiras, alimentos}
   * @param {number} quantidade  ex.: 2
   * @param {string} unidade  ex.: "colheres grandes"
   * @param {string} alimento ex.: "arroz"
   * @returns {Object} { ok, alimento, alimentoBusca, unidade, unidadeDigita, quantidade, gramasPorUnidade, pesoTotal, kcal }
   * @throws {Error} descritivo quando medida ou alimento não forem encontrados
   */
  function calcular(base, quantidade, unidade, alimento) {
    const medidasGerais = base && base.medidas_caseiras ? base.medidas_caseiras : {};
    const alimentos = base && base.alimentos ? base.alimentos : [];

    const qtd = Number(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      throw new Error("Quantidade deve ser um número maior que zero.");
    }

    const al = encontrarAlimento(alimentos, alimento);
    if (!al) {
      throw new Error('Alimento "' + alimento + '" não encontrado na base.');
    }

    // Medidas específicas do alimento têm prioridade sobre as medidas gerais.
    const medidas = Object.assign({}, medidasGerais, al.medidas_caseiras || {});
    const un = encontrarMedida(medidas, unidade);
    const gramasPorUnidade = medidas[un.chave];
    const pesoTotal = qtd * gramasPorUnidade;
    const kcal = (pesoTotal / 100) * al.kcal_por_100g;

    return {
      ok: true,
      alimento: al,
      alimentoBusca: String(alimento).trim(),
      unidade: un.chave,
      unidadePadrao: un.padrao,
      unidadeDigita: String(unidade).trim(),
      quantidade: qtd,
      gramasPorUnidade: gramasPorUnidade,
      pesoTotal: pesoTotal,
      kcal: kcal,
    };
  }

  /** Gera a frase amigável "2 colheres grandes de arroz = 80g = 104 kcal". */
  function formatarResultado(r) {
    const kcal = Math.round(r.kcal * 100) / 100;
    return (
      r.quantidade +
      " " +
      r.unidadeDigita.toLowerCase() +
      " de " +
      r.alimento.nome.toLowerCase() +
      " = " +
      r.pesoTotal +
      "g = " +
      kcal +
      " kcal"
    );
  }

  return {
    normalizar: normalizar,
    encontrarMedida: encontrarMedida,
    encontrarAlimento: encontrarAlimento,
    calcular: calcular,
    formatarResultado: formatarResultado,
  };
})();

// Expõe globalmente para uso em navegador simples (sem bundler).
if (typeof window !== "undefined") {
  window.Motor = Motor;
}