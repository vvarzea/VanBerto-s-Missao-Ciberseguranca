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

- **Quiz** no fim de cada nível (e outro depois de vencer cada boss), estrelas por nível (até 3),
  artefactos, conquistas, mapa da aventura e certificado final.
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
| `dia-crianca.js` | Motor do jogo: física, níveis, bosses, quiz, UI, guardar/continuar |
| `dia-crianca.css` | Estilos e declaração (`@font-face`) dos tipos de letra |
| `fonts/` | Baloo 2 (400, 600, 700, 800) e Nunito (400, 600, 700 e 400 itálico), `woff2` latino, com as licenças OFL |
| `phaser.min.js` | Phaser **3.90.0** minificado, servido localmente (sem CDN) |
| `sw.js` | Service worker: modo offline (guarda o jogo na 1.ª visita; uma cache por versão) |
| `LICENSE-Phaser.txt` | Licença MIT do Phaser (obrigatória ao distribuir o `phaser.min.js`) |
| `_dev/` | Ferramentas de desenvolvimento (verificações, teste no Chromium, script de lançamento). Não são necessárias no site publicado |
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
| `mundo*.jpg`, `map-mundo*.jpg`, `sala_secreta.jpg` | Fundos dos níveis e mapas dos mundos |
| `manifest.json`, `icon-*.png`, `favicon*`, `apple-touch-icon.png` | Ícones e manifesto da app |

## Correr localmente

Os módulos ES não funcionam abrindo o `index.html` diretamente (`file://`). Na pasta do jogo:

```
python3 -m http.server 8000
```

e abrir <http://localhost:8000>.

## Versões e cache

Todos os ficheiros carregados pelo `index.html` e todos os `import` internos levam **a mesma**
string `?v=…` (atualmente `20260921v82`). Tem de ser sempre igual em todo o lado: o mesmo módulo
importado com strings diferentes é carregado duas vezes, como duas instâncias separadas, e os
browsers que já têm o jogo podem ficar com uma mistura de ficheiros velhos e novos.

Não se troca à mão: `python3 _dev/release.py v80 descricao_curta` carimba a nova string em todo o
lado, corre as verificações e o teste no Chromium e gera o zip.

## Desenvolvimento (`_dev/`)

- `node _dev/check.mjs` — verificações estáticas: uma só string `?v=`, ficheiros referenciados,
  ausência de pedidos externos, banco de perguntas (nº de opções, uma certa por pergunta, tamanhos),
  português europeu (palavras a evitar e grafia) e sintaxe de todos os módulos.
- `python3 _dev/smoke.py` — teste de fumo em Chromium sem interface (precisa do Playwright): arranque,
  carregamento dos fundos, quiz Fácil e Difícil, movimento reduzido, HUD, botões de fechar dos ecrãs do menu, coerência entre a Vitória e o Certificado, modo offline e atualização do service worker.
- `python3 _dev/release.py --check-only` — corre as duas coisas sem mudar nada.

O teste completo demora cerca de 5 minutos. Se o ambiente limitar o tempo por comando, corre-se por
partes, por exemplo `python3 _dev/smoke.py --only="Quiz Fácil|Quiz Difícil"`, e depois
`python3 _dev/release.py v82 descricao --no-smoke`.

A pasta `_dev/` não é necessária no site (o GitHub Pages, com Jekyll, ignora pastas que começam por `_`).

## Modo offline

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

## Carregamento dos fundos

O Phaser só pede no arranque o fundo do nível em que o jogo começa e o da sala secreta (cerca de
0,5 MB). Sempre que um nível começa, pedem-se em segundo plano (2 pedidos em paralelo) os fundos
dos 2 níveis seguintes com fundo diferente; por isso quem joga só uns níveis não descarrega o resto.
Se um nível começar antes do seu fundo, mostra-se o céu desenhado e a ilustração entra assim que
chegar (`prefetchBackgrounds`, `setupBackgroundLoading` e `applyBackground` em `dia-crianca.js`).
Um novo fundo tem de ser acrescentado a `LEVEL_BG_OVERRIDE` **e** a `BG_FILES`. As `map-mundo*.jpg`
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
