// ===== Conteúdo narrativo — MISSÃO CIBERSEGURANÇA =====
// Ficheiro puramente de dados, sem lógica de jogo.

export const REGION_INTRO = {
  origens: {
    vanberto: "Vamos aprender as bases da Cibersegurança... e proteger os nossos dispositivos de vírus!",
    arrival: "Bem-vindo ao Reino dos Fundamentos — a internet, as palavras-passe e quem nos protege. 🌐"
  },
  desenvolvimento: {
    vanberto: "Sinto mensagens estranhas e links suspeitos por perto... vamos ter espírito crítico!",
    arrival: "Bem-vindo ao Vale da Comunicação Segura — jogos, publicações e o perigo do phishing. 📡"
  },
  protecao: {
    vanberto: "Esta fortaleza esconde spam e burlas... vamos proteger os nossos dados com cuidado!",
    arrival: "A Fortaleza da Proteção Digital guarda os dispositivos, a família e as compras seguras. 🛡️"
  },
  participacao: {
    vanberto: "Estamos quase lá! Sinto que alguém anda a espiar nas sombras...",
    arrival: "A Cidade da Identidade Digital guarda a tua privacidade e a tua identidade online. 🔒"
  }
};

export const BOSS_OBJECTIVE = {
  virus_gigante: "Desvia-te dos micróbios digitais 🦠 que o Vírus Gigante atira e salta-lhe em cima 3 vezes para o vencer!",
  monstro_phishing: "Desvia-te das bolas ❓ que ele atira e salta-lhe em cima 3 vezes para o vencer!",
  robo_spam: "Ele patrulha depressa a espalhar spam — apanha o ritmo e salta-lhe em cima 3 vezes para o vencer!",
  espiao_sombras: "Ele teleporta-se e atira orbes sombrios 🔮! Salta-lhe em cima 3 vezes assim que ele reaparecer."
};

// Diálogo de boss, por boss.
// "reaction" = fala do VanBerto's ANTES do boss se apresentar (pressentir o perigo).
// "rally"    = fala do VanBerto's DEPOIS da ameaça do boss, mesmo antes do combate começar.
export const BOSS_INTRO_VB = {
  virus_gigante: {
    reaction: "Ugh, sinto o sistema pesado... alguma coisa aqui não está nada bem.",
    rally: "Vamos mostrar-lhe que cuidar dos dispositivos também é um ato de coragem!"
  },
  monstro_phishing: {
    reaction: "Sinto uma mensagem estranha... como se algo tentasse enganar-nos!",
    rally: "Não vai resultar! Nunca vamos clicar em links suspeitos!"
  },
  robo_spam: {
    reaction: "Cheira a spam no ar... isto não pode continuar assim!",
    rally: "Vamos mostrar-lhe que uma caixa de correio limpa é sempre mais forte!"
  },
  espiao_sombras: {
    reaction: "Está tudo tão escuro aqui dentro... como se alguém andasse a espiar-nos.",
    rally: "As sombras não resistem quando protegemos a nossa privacidade juntos!"
  }
};

// Uma única fala de vitória por boss, ligada à competência que acabou de ser recuperada.
export const BOSS_VICTORY_VB = {
  virus_gigante: "Conseguimos! O nosso dispositivo está limpo e protegido!",
  monstro_phishing: "Vencemos! Agora sabemos sempre reconhecer um link suspeito!",
  robo_spam: "A caixa de correio agradece! Chega de spam e burlas!",
  espiao_sombras: "A nossa privacidade venceu as sombras! Os nossos dados estão seguros!"
};

// Frases curtas mostradas (sem parar o jogo, só um "floatie") sempre que se
// apanha um objeto de conhecimento no combate do Monstro do Phishing.
export const KNOWLEDGE_FACTS = [
  "🔐 Uma boa palavra-passe protege-nos.",
  "🔗 Nunca clicar em links suspeitos.",
  "🌟 Cibersegurança é um hábito diário.",
  "🧠 Pensar antes de clicar é um super-poder.",
  "🆘 Pedir ajuda também é proteger-nos."
];

// Falas curtas do boss em marcos de HP durante o combate.
export const BOSS_HP_TAUNTS = {
  virus_gigante: {
    atStart: ["Vou multiplicar-me sem parar!", "Não me consegues apanhar!", "Espalho-me por todos os ficheiros!"],
    hp2: ["Argh! Isso picou...", "Não contava com esse salto!", "Ainda tenho força de sobra!"],
    hp1: ["Não... o antivírus é forte demais!", "Isto não pode ser...", "Estou a ser eliminado!"]
  },
  monstro_phishing: {
    atStart: ["Vais clicar sem pensar!", "Ninguém escapa ao meu link!", "Achas mesmo que me vais vencer?"],
    hp2: ["Isso foi sorte!", "Não contava com esse alerta...", "Grrr, tenta outra vez!"],
    hp1: ["Não! Descobriram o meu disfarce!", "Isto não pode ser...", "A verdade... é mais forte!"]
  },
  robo_spam: {
    atStart: ["Vou encher a tua caixa de correio ainda mais depressa!", "Não me apanhas, sou rápido demais!", "Spam para todo o lado!"],
    hp2: ["Essa amolgou-me a chapa!", "Não contava com essa pancada!", "Ainda tenho muitas mensagens para enviar!"],
    hp1: ["Não... estão todas a ser bloqueadas!", "Os meus circuitos... estão a falhar!", "Isto não pode ser!"]
  },
  espiao_sombras: {
    atStart: ["As sombras vão esconder os teus dados!", "Nunca me vais apanhar no ar!", "Ninguém protege a tua privacidade aqui!"],
    hp2: ["Impossível! Consegues ver-me na sombra?", "Isso não devia ter acontecido...", "Grrr, mais rápido da próxima vez!"],
    hp1: ["Não... a tua privacidade está a vencer!", "As sombras... estão a desaparecer!", "Isto não pode ser o fim!"]
  }
};

// Um "letreiro"/NPC por nível — alinhado por artIdx (0-19), tal como HISTORY[].
export const NPC_SIGNS = [
  { emoji:"🌐", text:"Sabias que a primeira página web foi publicada em 1991?" },
  { emoji:"🔐", text:"Uma palavra-passe com 12 ou mais carateres é muito mais difícil de adivinhar!" },
  { emoji:"🪪", text:"Nunca partilhes a tua morada ou telefone com quem só conheces online." },
  { emoji:"🆘", text:"A Linha Internet Segura (800 21 90 90) é gratuita e está sempre disponível!" },
  { emoji:"🦠", text:"Um antivírus atualizado é como uma vacina para o teu computador!" },
  { emoji:"🎮", text:"Sabias que os jogos têm uma idade mínima recomendada (PEGI) escrita na caixa?" },
  { emoji:"👣", text:"Tudo o que publicas online deixa uma pegada digital — pensa sempre antes de publicar!" },
  { emoji:"📰", text:"Antes de acreditares numa notícia chocante, procura-a noutra fonte de confiança." },
  { emoji:"🎣", text:"Um link urgente e suspeito é quase sempre um sinal de phishing!" },
  { emoji:"💻", text:"Atualizar o teu telemóvel ou computador fecha portas a quem quer atacar." },
  { emoji:"👨‍👩‍👧", text:"Combinar regras de ecrã com a família ajuda todos a navegar com equilíbrio." },
  { emoji:"📶", text:"Em Wi-Fi público, evita fazer login em contas com dados importantes." },
  { emoji:"💾", text:"Uma cópia de segurança pode salvar-te de perder um trabalho inteiro!" },
  { emoji:"♿", text:"Leitores de ecrã e legendas tornam a internet acessível a todos!" },
  { emoji:"🛒", text:"Uma oferta boa demais para ser verdade... normalmente não é verdade." },
  { emoji:"📢", text:"O botão de denúncia existe para te proteger — usa-o sem medo!" },
  { emoji:"🧑‍💻", text:"A maioria das redes sociais só permite criar conta a partir dos 13 anos." },
  { emoji:"🔒", text:"Pede sempre autorização antes de publicares uma foto com outras pessoas." },
  { emoji:"🚫", text:"Se um desconhecido insistir para guardares segredo, conta sempre a um adulto." },
  { emoji:"⚖️", text:"Sabias que, desde 2021, a ONU reconhece direitos das crianças também online?" }
];
