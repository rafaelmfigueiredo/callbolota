/**
 * Callbolômetro — Base de dados embutida (fallback)
 *
 * Estes são os MESMOS dados de data/alimentos.json, expostos como objeto JS.
 * Usados como FALHA quando o navegador bloqueia o fetch() de arquivos locais
 * (comportamento comum em file:// — ex.: Chrome) ou quando o JSON não
 * puder ser carregado. Garante que o sistema funcione offline com um clique.
 */
window.ALIMENTOS_BASE = {
  "medidas_caseiras": {
    "colher de sopa": 25,
    "colher grande": 40,
    "concha": 100,
    "xicara": 150,
    "fatia": 25,
    "grama": 1,
    "unidade": 100
  },
  "alimentos": [
    {
      "nome": "Arroz branco cozido",
      "sinonimos": ["arroz", "arroz cozido", "arroz branco", "arroz branco cozido", "arroz cozido branco"],
      "kcal_por_100g": 130,
      "medidas_caseiras": { "xicara": 160, "colher de sopa": 25, "concha": 100 }
    },
    {
      "nome": "Feijão carioca cozido",
      "sinonimos": [
        "feijao",
        "feijão",
        "feijão carioca",
        "feijão cozido",
        "feijão carioca cozido",
        "feijao cozido",
        "feijao carioca cozido"
      ],
      "kcal_por_100g": 76,
      "medidas_caseiras": { "xicara": 170, "concha": 100, "colher de sopa": 25 }
    },
    {
      "nome": "Peito de frango grelhado",
      "sinonimos": [
        "frango",
        "peito de frango",
        "frango grelhado",
        "peito de frango grelhado",
        "frango grelhado peito"
      ],
      "kcal_por_100g": 159,
      "medidas_caseiras": { "fatia": 30, "unidade": 100 }
    },
    {
      "nome": "Ovo de galinha cozido",
      "sinonimos": [
        "ovo",
        "ovos",
        "ovo cozido",
        "ovos cozidos",
        "ovo de galinha",
        "ovo de galinha cozido",
        "galinha",
        "ovos de galinha cozidos",
        "ovos cozido"
      ],
      "kcal_por_100g": 146,
      "medidas_caseiras": { "unidade": 50 }
    },
    {
      "nome": "Pão de forma integral",
      "sinonimos": ["pao integral", "pão integral", "pão de forma", "pao de forma integral", "pão de forma integral"],
      "kcal_por_100g": 250,
      "medidas_caseiras": { "fatia": 25, "unidade": 25 }
    },
    {
      "nome": "Banana prata",
      "sinonimos": ["banana", "banana prata", "bananas"],
      "kcal_por_100g": 98,
      "medidas_caseiras": { "unidade": 80 }
    },
    {
      "nome": "Batata doce cozida",
      "sinonimos": ["batata doce", "batata-doce", "batata doce cozida"],
      "kcal_por_100g": 77,
      "medidas_caseiras": { "colher de sopa": 25, "unidade": 130 }
    },
    {
      "nome": "Macarrão cozido",
      "sinonimos": ["macarrao", "macarrão", "massa", "macarrão cozido"],
      "kcal_por_100g": 157,
      "medidas_caseiras": { "xicara": 140, "colher de sopa": 15 }
    },
    {
      "nome": "Leite integral",
      "sinonimos": ["leite", "leite de vaca", "leite integral"],
      "kcal_por_100g": 61,
      "medidas_caseiras": { "xicara": 200, "colher de sopa": 15 }
    },
    {
      "nome": "Aveia em flocos",
      "sinonimos": ["aveia", "aveia em flocos"],
      "kcal_por_100g": 394,
      "medidas_caseiras": { "colher de sopa": 10, "xicara": 80 }
    }
  ]
};