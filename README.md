# VanBerto's — Missão Cibersegurança

Jogo de plataformas educativo sobre cibersegurança, feito com Phaser 3 e módulos ES nativos.
Sem *build step*: os ficheiros publicam-se tal como estão (GitHub Pages).

## O jogo

- **20 níveis em 4 mundos**, cada um terminado por um boss temático:

  | Mundo | Níveis | Boss |
  | --- | --- | --- |
  | Reino dos Fundamentos | 1–5 | Vírus Gigante |
  | Vale da Comunicação Segura | 6–9 | Monstro do Phishing |
  | Fortaleza da Proteção Digital | 10–15 | Robô do Spam |
  | Cidade da Identidade Digital | 16–20 | Espião das Sombras |

- **Quiz** no fim de cada nível (e outro depois de vencer cada boss). Uma pergunta falhada à 1.ª tentativa volta mais tarde
  (pelo menos 2 níveis depois) como **«Revisão rápida»**, antes do quiz do nível: sem perder vidas e sem contar para pontos,
  estatísticas ou certificado; acertar (ou falhar 2 revisões) tira-a da lista. Estrelas por nível (até 3),
  artefactos, conquistas, mapa da aventura e certificado.
- **Sem perguntas repetidas** numa aventura: os 20 níveis usam 20 temas distintos (um por nível), e dentro de cada
  tema uma pergunta só volta a sair depois de todas as outras do banco terem saído (`pickQuizForLevel`,
  `game/quiz.js`). O quiz de cada boss usa o mesmo tema do último nível desse mundo e também passa por esta
  proteção, para nunca repetir a pergunta que o aluno acabou de ver à porta desse nível.
- **Certificado**, a qualquer momento (☰ Menu → 🏅 Certificado, mesmo a meio de um nível) — não só ao terminar os 20
  níveis. Antes de terminar mostra "Certificado de Progresso" (níveis feitos, pontos, estrelas, e a percentagem de
  acertos calculada só sobre os níveis já jogados — não penaliza o que ainda falta) e esconde "🔄 Jogar de novo"
  (reinicia TUDO — só faz sentido depois de terminar). Ao terminar os 20 níveis passa a "Certificado Oficial", igual
  a antes. Pode imprimir-se em qualquer dos dois casos (🖨️ Imprimir).
- **Dificuldade** (escolhida em "Nova Aventura", alterável em Opções): 😊 Fácil (3 vidas),
  🎓 Difícil (2 vidas) e 🔥 Extremo (1 vida). O Difícil e o Extremo usam o quiz mais técnico, com 4 opções de resposta. Há ainda o *Modo Exploração*
  (sem vilões, sem perder vidas).
- **Controlos**: setas para andar e saltar (ou Espaço), `↓`/`S` para agachar, `P` pausa,
  `F` ecrã inteiro, `H` alto contraste. Em telemóvel há botões táteis. O quiz e os menus
  também se usam só com o teclado.

## Ficheiros

| Ficheiro | Para que serve |
| --- | --- |
| `index.html` | Estrutura, overlays e carregamento (`phaser.min.js` + `dia-crianca.js` como módulo) |
| `dia-crianca.js` | Só arranca o jogo (importa e chama o `game/`, ver «Estrutura do código» abaixo) |
| `dia-crianca.css` | Estilos e declaração (`@font-face`) dos tipos de letra |
| `fonts/` | Baloo 2 (400, 600, 700, 800) e Nunito (400, 600, 700 e 400 itálico), `woff2` latino, com as licenças OFL |
| `phaser.min.js` | Phaser **3.90.0** minificado, servido localmente (sem CDN) |
| `sw.js` | Service worker: modo offline (guarda o jogo na 1.ª visita; uma cache por versão) |
| `game/` | Motor do jogo, dividido em 24 módulos (física, níveis, bosses, quiz, UI, guardar/continuar — ver «Estrutura do código») |
| `LICENSE-Phaser.txt` | Licença MIT do Phaser (obrigatória ao distribuir o `phaser.min.js`) |
| `_dev/` | Ferramentas de desenvolvimento (verificações, teste no Chromium, script de lançamento, conversor de fundos) e os JPG originais dos fundos (`_dev/originais/`). Não são necessárias no site publicado |
| `data-quiz.js` | Perguntas — `QUIZ_BY_THEME` (Fácil, 185 perguntas, 3 opções) e `QUIZ_BY_THEME_AVANCADO` (Difícil e Extremo, 166 perguntas, 4 opções) —, curiosidades e artigos |
| `data-levels.js` | `THEMES` e `LEVELS` (definição dos 20 níveis) |
| `data-bosses.js` | Definição dos bosses e das suas arenas |
| `data-story.js` | Narrativa: introduções de região, falas dos bosses, letreiros |
| `data-progression.js` | Mapa, artefactos, conjuntos e conquistas |
| `data-flavor.js` | Frases de elogio, dicas e mensagens dinâmicas |
| `textures.js` | Gera as texturas (personagem, vilões, bosses, plataformas) em canvas |
| `background.js` | Fundos, parallax e decorações |
| `cinematics.js` | Cartões de título e diálogos de cinemática |
| `stars.js` | Estrelas por nível |
| `achievements.js` | Conquistas |
| `audio.js` | Som por síntese WebAudio (sem ficheiros de áudio) |
| `storage.js` | Progresso guardado numa única chave de `localStorage` (`vanbertos_ciberseguranca_save_v1`) |
| `vanberto_real.png` | Mascote usado fora do jogo — gerado a partir do desenho de `textures.js` |
| `mundo*.webp`, `map-mundo*.webp`, `sala_secreta.webp` | Fundos dos níveis e mapas dos mundos |
| `manifest.json`, `icon-*.png`, `favicon*`, `apple-touch-icon.png` | Ícones e manifesto da app |

## Estrutura do código

O motor do jogo (antes um único `dia-crianca.js` com ~10 300 linhas) está dividido em 24 módulos ES em `game/`,
por assunto — a lista completa está no topo de `_dev/split_source.mjs`. Guia rápido:

| Módulo | Conteúdo |
| --- | --- |
| `game/state.js` | Estado partilhado (jogador, vidas, pontos, poderes…) e dificuldade — os outros módulos só o LEEM (`import`); para alterar usam-se as funções `set_<nome>()` que o próprio `state.js` exporta |
| `game/scene.js` | Configuração e ciclo do Phaser (`preload`, `create`, `update`) |
| `game/level.js`, `game/world.js`, `game/rooms.js`, `game/door.js` | Um nível: HUD, objetos do cenário, agachar/canos/salas secretas, porta e transição |
| `game/boss-core.js`, `game/boss-attacks.js`, `game/boss-combat.js`, `game/boss-end.js` | Os 4 combates de boss, por assunto (arranque/arena, ataques, dano/derrota, vitória) |
| `game/quiz.js` | Quiz do fim de nível, revisão espaçada dos erros e «Sabias que…?» |
| `game/map.js`, `game/artefacts.js`, `game/screens.js` | Mapa da aventura, artefactos/Álbum/Galeria, e os ecrãs de Conquistas/Estatísticas/Opções/Certificado |
| `game/items.js`, `game/flow.js`, `game/overlays.js`, `game/ui.js` | Itens/poderes, avançar de nível e fim de jogo, gestão de ecrãs sobrepostos, botões e atalhos |
| `game/dom.js`, `game/dialogue.js`, `game/feedback.js`, `game/vanberto.js`, `game/input.js`, `game/stats.js` | Referências ao HTML, balões de fala, elogios/mensagens, animação do VanBerto's, controlos de toque, estatísticas globais |

**Porquê módulos e não classes/objetos:** o código todo continua a correr dentro do MESMO fecho de arranque de
antes (agora repartido por `init_<módulo>_<n>()`, chamadas por `dia-crianca.js` pela ordem exata em que o código
corria no ficheiro único) — só a ORGANIZAÇÃO em ficheiros mudou, não a arquitetura. Isto foi deliberado: dividir
em serviços/classes teria sido uma reescrita, com muito mais risco de mudar comportamento por engano; dividir por
ficheiro, mantendo tudo o resto igual, é uma mudança mecânica e verificável.

**Para alterar o código do jogo:** encontra o módulo certo em `game/` (a tabela acima, ou o comentário no início
de cada ficheiro) e edita-o diretamente, como qualquer outro ficheiro — este é agora o código-fonte; não há um
ficheiro único escondido algures a partir do qual `game/` seja regerado.

**Como a divisão foi feita e confirmada** (uma única vez, ao passar de `dia-crianca.js` para `game/`) fica
registado em `_dev/divisao-em-modulos/`, para consulta ou para o caso de vir a ser precisa uma divisão semelhante
no futuro (ex.: partir um módulo grande outra vez):
- `dia-crianca.antes-da-divisao.js` — o ficheiro único original, guardado tal como estava.
- `split_source.mjs` — o script que gerou `game/` e o `dia-crianca.js` atual a partir dele.
- `verify_split.mjs` — a auditoria que confirmou, função a função e efeito de arranque a efeito de arranque (por
  AST, ignorando comentários/formatação), que o resultado tem exatamente o mesmo comportamento do original.

Nenhum dos dois scripts corre automaticamente, nem faz parte do jogo publicado, e precisam de pacotes extra só
deles (`npm i acorn acorn-walk eslint-scope`) — ver o comentário no topo de cada um.

## Correr localmente

Os módulos ES não funcionam abrindo o `index.html` diretamente (`file://`). Na pasta do jogo:

```
python3 -m http.server 8000
```

e abrir <http://localhost:8000>.

## Versões e cache

Todos os ficheiros carregados pelo `index.html` e todos os `import` internos levam **a mesma**
string `?v=…` (atualmente `20261003v99`). Tem de ser sempre igual em todo o lado: o mesmo módulo
importado com strings diferentes é carregado duas vezes, como duas instâncias separadas, e os
browsers que já têm o jogo podem ficar com uma mistura de ficheiros velhos e novos.

Não se troca à mão: `python3 _dev/release.py v80 descricao_curta` carimba a nova string em todo o
lado, corre as verificações e o teste no Chromium e gera o zip.

## Desenvolvimento (`_dev/`)

- `node _dev/check.mjs` — verificações estáticas: uma só string `?v=`, ficheiros referenciados,
  ausência de pedidos externos, banco de perguntas (nº de opções, uma certa por pergunta, tamanhos),
  português europeu (palavras a evitar e grafia) e sintaxe de todos os módulos.
- `python3 _dev/smoke.py` — teste de fumo em Chromium sem interface (precisa do Playwright): arranque,
  carregamento dos fundos, quiz Fácil e Difícil, revisão espaçada dos erros, os 4 combates de boss, movimento reduzido, HUD, botões e títulos sempre à vista nos ecrãs do menu, o cartão «Sabias que…?» a ficar por baixo desses ecrãs, coerência entre a Vitória e o Certificado, o Certificado de Progresso a meio da aventura, modo offline (automático e «Guardar tudo»), atualização do service worker, menu inicial sem scroll, sem botões soltos na grelha em telemóvel, etiqueta de versão e o ecrã de erro inesperado.
- `python3 _dev/release.py --check-only` — corre as duas coisas sem mudar nada.

O teste completo demora cerca de 5 minutos. Se o ambiente limitar o tempo por comando, corre-se por
partes, por exemplo `python3 _dev/smoke.py --only="Quiz Fácil|Quiz Difícil"`, e depois
`python3 _dev/release.py v82 descricao --no-smoke`.

A pasta `_dev/` não é necessária no site (o GitHub Pages, com Jekyll, ignora pastas que começam por `_`).

## Etiqueta de versão

No fim do menu inicial, em letra pequena e discreta, aparece "Versão <string>" — a mesma do `?v=`.
Serve para, ao receber um print de um problema, saber logo se é a versão mais recente ou uma mais
antiga ainda por atualizar no sítio onde está publicado. `_dev/release.py` já a atualiza sozinho,
como o resto do `?v=`; `_dev/check.mjs` recusa a versão se a etiqueta ficar desatualizada.

## Toque no telemóvel (touch-action)

Qualquer cartão clicável dentro de uma lista que desliza (`.map-region` no Mapa, `.album-card` no Álbum) tem
`touch-action: none`, e todos os botões (`.btn`, incluindo cada "Fechar") têm `touch-action: manipulation`. Sem
isto, um toque com um pequeno tremor pode ser lido pelo telemóvel como o início de um gesto de deslizar
(`touchcancel` em vez de `touchend`) — o toque nunca chega ao `onclick`, o cartão "não reage" e pode parecer que o
jogo ficou preso, sem fazer nada aos toques seguintes. Ao mexer em CSS de um cartão ou botão clicável dentro de
uma lista com `overflow-y: auto`, mantém (ou acrescenta) o `touch-action` adequado.

## Erro inesperado

Um pequeno script logo no `<body>`, antes de qualquer outro (Phaser incluído), apanha qualquer erro
não tratado (`window.onerror` e `unhandledrejection`) e mostra um ecrã simples — "Ups, algo correu
mal!" — com um botão para recarregar. O progresso já estava guardado (o jogo grava a cada ação, não
só no fim), por isso recarregar não perde nada. Fica sempre visível uma linha pequena com a mensagem
técnica do erro, para conseguires perceber o que aconteceu sem abrir as ferramentas de programador.
Só aparece uma vez por sessão, mesmo que hajam vários erros seguidos.

Para testar: abrir a consola do browser e escrever `window.__vb_triggerFatalError()`.

## Modo offline

### Guardar tudo (botão em Opções)

Em Opções, com o service worker ativo, aparece "📶 Jogar sem rede" → "⬇️ Guardar tudo": descarrega
os 18 fundos de uma vez (channel `sw.js` → `CACHE_ALL` / `CACHE_ALL_PROGRESS` / `CACHE_ALL_DONE`), com
uma barra de progresso em texto. Serve para preparar tablets numa escola, com Wi-Fi, antes de uma aula
sem rede. Sem isto, só ficam em cache os níveis por onde se passou (ver "Carregamento dos fundos").

### O resto (automático)

Na 1.ª visita o `sw.js` guarda o núcleo do jogo (páginas, scripts, estilos, Phaser, fontes e ícones,
cerca de 2 MB). As imagens dos fundos guardam-se à medida que o jogo as pede: sem rede, os níveis já
jogados têm fundo e os outros mostram o céu desenhado. Cada versão usa a sua própria cache
(`vanbertos-<versão>`), por isso nunca se misturam ficheiros de versões diferentes, e a cache antiga é
apagada quando a nova ativa. As páginas vão primeiro à rede (com limite de 4 s) e só usam a cache se
não houver rede. Só funciona em `https://` ou `localhost`.

- A `VERSION` do `sw.js` é carimbada pelo `release.py` junto com o `?v=`. O `check.mjs` recusa versões
  diferentes e também ficheiros do jogo que faltem na lista `CORE` do `sw.js` (quem acrescentar um
  ficheiro tem de o acrescentar lá).
- Para desligar o modo offline num dispositivo: abrir o jogo com `?nosw` no endereço (desregista o
  service worker e apaga as caches).

## Fundos em WebP

Os fundos e mapas (`mundo*.webp`, `map-mundo*.webp`, `sala_secreta.webp`) estão em WebP com qualidade 85
(3,35 MB no total, contra 4,82 MB em JPG, menos 31%). Os JPG originais ficam em `_dev/originais/`.
`python3 _dev/converter_fundos.py --quality 85` converte e atualiza as referências (`BG_FILES`,
`data-progression.js`, README); `--reverter` volta aos JPG. Um fundo novo deve acrescentar-se em JPG à
pasta e passar pelo conversor.

## Carregamento dos fundos

O Phaser só pede no arranque o fundo do nível em que o jogo começa e o da sala secreta (cerca de
0,5 MB). Sempre que um nível começa, pedem-se em segundo plano (2 pedidos em paralelo) os fundos
dos 2 níveis seguintes com fundo diferente; por isso quem joga só uns níveis não descarrega o resto.
Se um nível começar antes do seu fundo, mostra-se o céu desenhado e a ilustração entra assim que
chegar (`prefetchBackgrounds`, `setupBackgroundLoading` e `applyBackground` em `dia-crianca.js`).
Um novo fundo tem de ser acrescentado a `LEVEL_BG_OVERRIDE` **e** a `BG_FILES`. As `map-mundo*.webp`
só são usadas no ecrã do mapa.

Com "reduzir movimento" ativo no sistema, o CSS desliga as animações e o jogo não faz abanões nem
flashes de ecrã.

## Sem dependências externas

O Phaser e os tipos de letra vêm todos do próprio pacote: o jogo não faz pedidos a CDNs nem a
serviços de terceiros. O Baloo 2 só existe até ao peso 800, por isso os `font-weight: 900` do CSS
usam o 800.

## Licenças e dados pessoais

- **Phaser 3.90.0** — licença MIT (`LICENSE-Phaser.txt`).
- **Baloo 2** e **Nunito** — SIL Open Font License 1.1 (`fonts/Baloo2-OFL.txt`, `fonts/Nunito-OFL.txt`).
- **Dados pessoais**: o jogo não envia nada para servidores. O nome do jogador e o progresso ficam só
  no `localStorage` do navegador (chave `vanbertos_ciberseguranca_save_v1`), sem cookies nem estatísticas, e
  "Limpar tudo" apaga-os. O servidor que aloja os ficheiros (por exemplo, o GitHub Pages) pode
  registar os pedidos, como qualquer site.

## Língua

Todo o texto é em português europeu, com o tratamento por **tu** e a grafia do Acordo Ortográfico de
1990 tal como se aplica em Portugal: carateres, atual, ação, espetador, aspeto, facto, contacto.
Vocabulário: palavra-passe (não *password*), ecrã, telemóvel, utilizador, ficheiro, partilhar,
descarregar, Wi-Fi, iniciar sessão (não *fazer login*).
