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
| `LICENSE-Phaser.txt` | Licença MIT do Phaser (obrigatória ao distribuir o `phaser.min.js`) |
| `data-quiz.js` | Perguntas — `QUIZ_BY_THEME` (Fácil, 185 perguntas, 3 opções) e `QUIZ_BY_THEME_AVANCADO` (Difícil e Extremo, 126 perguntas, 4 opções) —, curiosidades e artigos |
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
| `storage.js` | Progresso guardado numa única chave de `localStorage` (`vanbertos_save_v2`) |
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
string `?v=…` (atualmente `20260920v77`). Tem de ser sempre igual em todo o lado: o mesmo módulo
importado com strings diferentes é carregado duas vezes, como duas instâncias separadas.
Ao publicar uma versão nova, trocar a string **em todos os sítios de uma só vez**
(`index.html`, `dia-crianca.js`, `achievements.js`, `background.js`, `stars.js`), senão os
browsers que já têm o jogo podem ficar com uma mistura de ficheiros velhos e novos.

## Sem dependências externas

O Phaser e os tipos de letra vêm todos do próprio pacote: o jogo não faz pedidos a CDNs nem a
serviços de terceiros. O Baloo 2 só existe até ao peso 800, por isso os `font-weight: 900` do CSS
usam o 800.

## Licenças e dados pessoais

- **Phaser 3.90.0** — licença MIT (`LICENSE-Phaser.txt`).
- **Baloo 2** e **Nunito** — SIL Open Font License 1.1 (`fonts/Baloo2-OFL.txt`, `fonts/Nunito-OFL.txt`).
- **Dados pessoais**: o jogo não envia nada para servidores. O nome do jogador e o progresso ficam só
  no `localStorage` do navegador (chave `vanbertos_save_v2`), sem cookies nem estatísticas, e
  "Limpar tudo" apaga-os. O servidor que aloja os ficheiros (por exemplo, o GitHub Pages) pode
  registar os pedidos, como qualquer site.

## Língua

Todo o texto é em português europeu, com o tratamento por **tu** e a grafia do Acordo Ortográfico de
1990 tal como se aplica em Portugal: carateres, atual, ação, espetador, aspeto, facto, contacto.
Vocabulário: palavra-passe (não *password*), ecrã, telemóvel, utilizador, ficheiro, partilhar,
descarregar, Wi-Fi, iniciar sessão (não *fazer login*).
