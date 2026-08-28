# 🍽️ Callbolômetro — Calculadora de Calorias

Sistema **100% gratuito** de cálculo de calorias por **medidas caseiras**, com
cadastro/login e histórico isolado por usuário. Os dados ficam no banco SQLite
do servidor, e não no navegador.

---

## ✅ Como rodar (localmente)

1. Abra a pasta do projeto:
   `C:\Users\rafael.figueiredo\Videos\calculo de caltorias`
2. Dê **dois cliques** em **`iniciar.bat`**.
3. O sistema abre sozinho em `http://127.0.0.1:8000` no seu navegador padrão.

O script inicia a API e o banco SQLite local. Deixe a janela preta aberta enquanto estiver usando o sistema. O banco será criado como `calbolometro.db` na pasta do projeto.

Para abrir em outro computador da mesma rede, use no navegador o endereço `http://IP-DESTE-COMPUTADOR:8000`. O computador servidor precisa continuar ligado e a porta 8000 precisa estar liberada no firewall. Para acesso pela internet, será necessário publicar este servidor em uma hospedagem.

> Alternativa: abra o arquivo `index.html` manualmente no navegador, caso o Python não esteja instalado.

---

## 🧪 Como testar (exemplo)?

1. Crie uma conta (ex.: usuário `maria`, senha `1234`).
2. Na tela principal ("Nova refeição") preencha:
   - **Quantidade:** `2`
   - **Unidade:** `colheres grandes`
   - **Alimento:** `arroz`
3. Aparece em tempo real:
   > 🔥 **2 colheres grandes de arroz branco cozido = 80g = 104 kcal**
4. Clique em **Calcular refeição**. A refeição fica registrada no banco do servidor, associada à sua conta.

---

## 🗂️ Estrutura do projeto

```
calculo de caltorias/
├── iniciar.bat            # botão mágico: abre o sistema no navegador
├── index.html            # front-end (Login/Cadastro + Dashboard)
├── css/
│   └── style.css         # visual limpo e responsivo
├── js/
│   ├── motor.js          # motor de cálculo (regra de três, sinônimos, plurais)
│   ├── storage.js        # cliente da API de cadastro/login e histórico
│   └── app.js            # lógica de interface e eventos
├── data/
│   └── alimentos.json    # medidas caseiras + alimentos (TACO simplificada)
├── vercel.json           # config p/ deploy futuro na Vercel
└── README.md             # este arquivo
```

---

## 🧠 Motor de cálculo (regra de três)

```
peso_total = quantidade × fator_da_medida
kcal       = (peso_total / 100) × kcal_por_100g
```

- **Medidas caseiras** (fator em gramas/ml):
   `colher de sopa 25`, `colher grande 40`, `concha 100`, `xicara 150`, `fatia 25`, `grama 1`, `unidade 100`
- O motor **normaliza plurais** (ex.: `colheres grandes` → `colher grande`,
  `xícaras` → `xicara`) e busca alimentos por **sinônimos** (ex.: `feijao` → `Feijão carioca cozido`).
- Quando disponível, cada alimento usa seu próprio peso de referência para a medida. Ex.: `1 fatia de pão integral = 25 g` e `1 unidade de ovo = 50 g`.
- Os valores são referências médias de composição de alimentos; produtos industrializados devem ser conferidos no rótulo, pois marca, receita e tamanho podem alterar o resultado.

### Busca online complementar

Quando um alimento não é encontrado na base local, o servidor consulta a API gratuita da Open Food Facts. O resultado só entra no cálculo depois que o usuário escolhe uma sugestão. As respostas ficam em cache na tabela `alimentos_cache` do SQLite, reduzindo consultas repetidas e mantendo a base local como primeira opção.

**Alimentos na base (TACO simplificada):**

| Alimento | kcal/100g | Sinônimos |
|---|---|---|
| Arroz branco cozido | 130 | arroz, arroz cozido |
| Feijão carioca cozido | 76 | feijao, feijão, feijão carioca |
| Peito de frango grelhado | 159 | frango, peito de frango |
| Ovo de galinha cozido | 146 | ovo, ovos |

---

## 🔒 Isolamento de dados por usuário

Os dados ficam no `localStorage` do navegador:

- Contas criadas → `callbolota_users`
- Sessão atual → `callbolota_sessao`
- Histórico → `callbolota_hist_<usuario>` (um por usuário)

Cada usuário **só vê e gerencia o próprio histórico**.

> ⚠️ **Demo local:** em produção/na internet, troque esse armazenamento por
> autenticação/banco reais (ex.: Supabase Auth + Postgres) — o `localStorage`
> é por navegador e não é à prova de segurança para senhas.

---

## ☁️ Deploy futuro na Vercel (grátis)

O projeto já é um site estático pronto:

1. Crie a conta gratuita em [vercel.com](https://vercel.com).
2. No painel: **Add New → Project** e importe sua conta Git (**GitHub/GitLab/Bitbucket**).
3. Importe este repositório.
4. Framework Preset: **Other** (não precisa de build).
5. **Deploy** 🚀 — sua URL `https://SEU-PROJETO.vercel.app` fica no ar de graça.

O arquivo `vercel.json` já cuida das rotas limpas e do SPA.

> Lembrete: ao colocar online, o histórico passa a viver no navegador de cada
> visitante (não é compartilhado). Para histórico na nuvem compartilhado, evolua
> para um backend + banco (ex.: Supabase, gratuitos).

---

Qualquer dúvida: você mesmo pode editar `data/alimentos.json` para incluir
mais alimentos (basta seguir o mesmo formato).