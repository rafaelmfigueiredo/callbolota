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
      "kcal_por_100g": 130
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
      "kcal_por_100g": 76
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
      "kcal_por_100g": 159
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
      "kcal_por_100g": 146
    },
    {
      "nome": "Pão de forma integral",
      "sinonimos": ["pao integral", "pão integral", "pão de forma", "pao de forma integral", "pão de forma integral"],
      "kcal_por_100g": 250
    }
  ]
};