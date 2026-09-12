// ===== Frases soltas e mensagens de "tempero" — MISSÃO CIBERSEGURANÇA =====
// PRAISE, PAUSE_TIPS, LEVEL_ENTRY_PHRASES, DYNAMIC_MSGS_CORRECT, DYNAMIC_MSGS_WRONG,
// VB_LEVEL_INTRO, VB_HIT, VB_QUIZ_CORRECT, VB_QUIZ_WRONG, VB_STAR_POWER, VB_PERFECT_LEVEL

export const PRAISE = ["🌟 Excelente!", "🛡️ Muito bem!", "🔐 Boa resposta!", "🎉 Fantástico!", "✨ Brilhante!", "🏆 Continua assim!"];

// PAUSE_TIPS são sobre MECÂNICAS de jogo (agachar, super-salto, power-ups,
// tipos de vilão), não sobre o tema — mantidos tal como no original.
export const PAUSE_TIPS = [
  "🔽 <b>Agachar:</b> Prime ↓, S ou o botão 'Baixar' para te esquivares de ataques altos e passares por baixo de obstáculos!",
  "💡 <b>Star Power:</b> Apanha a estrela ⭐ e atropela vilões durante 8 segundos — +50 pontos cada!",
  "🛡️ <b>Escudo:</b> Fica invencível por 8s e absorve um golpe de qualquer vilão.",
  "🦅 <b>Asas:</b> Dão um segundo salto no ar — ótimo para plataformas altas!",
  "❓ <b>Bloco surpresa:</b> Passa por cima dos blocos <b>❓</b> para revelar itens escondidos!",
  "🟠 <b>Trampolim:</b> Salta numa plataforma laranja para voar muito mais alto que o normal.",
  "🥇 <b>Bónus:</b> Completa um nível sem perder vidas para ganhar +50 pontos extra!",
  "🔴 Trapalhão — lento e previsível. 🔵 Saltitão — salta às vezes. 🟢 Perseguilão — persegue-te!",
  "❤️ <b>Coração:</b> Apanha-o para ganhar +1 vida (máximo 5 ao mesmo tempo).",
  "🦘 <b>Nível dos Trampolins:</b> Os vãos são intransponíveis sem trampolim — procura-os no chão!",
  "🔥 <b>Nível da Lava:</b> O chão queima! Mantém-te sempre em cima das plataformas.",
  "🏃 <b>Nível da Esteira:</b> Todas as plataformas se movem — observa o ritmo antes de saltar!"
];

// Frase curta mostrada ao entrar em cada nível — alinhada por posição no
// array LEVELS (0-19), NÃO por artIdx.
export const LEVEL_ENTRY_PHRASES = [
  "A internet liga o mundo! 🌐",
  "Uma boa palavra-passe protege-te! 🔐",
  "Os teus dados são só teus! 🪪",
  "Nunca estás sozinho online! 🆘",
  "Cuidado com os vírus! 🦠",
  "Joga sempre com regras! 🎮",
  "Pensa antes de publicar! 👣",
  "Nem tudo o que lês é verdade! 📰",
  "Cuidado com o phishing! 🎣",
  "Mantém tudo atualizado! 💻",
  "A família ajuda a decidir! 👨‍👩‍👧",
  "Wi-Fi público? Atenção redobrada! 📶",
  "Guarda sempre uma cópia! 💾",
  "A tecnologia é para todos! ♿",
  "Desconfia de ofertas boas demais! 🛒",
  "Denunciar é um direito! 📢",
  "A tua identidade também é digital! 🧑‍💻",
  "A tua privacidade é sagrada! 🔒",
  "Cuidado com desconhecidos! 🚫",
  "Os teus direitos existem online! ⚖️"
];

export const DYNAMIC_MSGS_CORRECT = [
  "🌟 Fantástico!", "✨ Excelente!", "🎉 És incrível!",
  "🛡️ Sabia que conseguias!", "🏆 Competência protegida!", "🔐 Muito bem!"
];

export const DYNAMIC_MSGS_WRONG = [
  "💪 Quase!", "🔄 Vamos tentar novamente!", "📚 Aprender também é vencer!",
  "❤️ Não desistas!", "💡 Próxima vez consegues!"
];

// Fala mais longa do VanBerto's à entrada de cada nível — indexada por
// posição no array LEVELS (0-19), NÃO por artIdx. O motor usa sempre
// VB_LEVEL_INTRO[0] no arranque do jogo (ver dia-crianca.js).
export const VB_LEVEL_INTRO = [
  "Hoje vamos recuperar a competência de Navegar em Segurança! 🌐 Estás preparado?",
  "Uma palavra-passe forte é o teu primeiro escudo digital! 🔐 Vamos descobrir como criá-la?",
  "Os teus dados pessoais são um tesouro! 🪪 Vamos aprender a protegê-los?",
  "Nunca estamos sozinhos online! 🆘 Vamos descobrir quem nos ajuda?",
  "Sinto um vírus por perto! 🦠 Vamos aprender a proteger o computador?",
  "Jogar com regras é jogar melhor! 🎮 Vamos ver como jogar em segurança?",
  "Tudo o que publicamos deixa um rasto! 👣 Vamos pensar antes de publicar?",
  "Nem tudo o que lemos online é verdade! 📰 Vamos aprender a verificar?",
  "Atenção aos links suspeitos! 🎣 Vamos aprender a reconhecer o phishing?",
  "Dispositivos atualizados são dispositivos protegidos! 💻 Vamos cuidar deles?",
  "Em família, decidimos juntos as regras de ecrã! 👨‍👩‍👧 Vamos lá?",
  "Wi-Fi público pede cuidados redobrados! 📶 Vamos aprender quais?",
  "Uma cópia de segurança pode salvar-nos de um grande susto! 💾 Vamos fazê-la?",
  "A tecnologia é para todos! ♿ Vamos torná-la acessível?",
  "Cuidado com ofertas boas demais para ser verdade! 🛒 Vamos aprender a desconfiar?",
  "Denunciar é um direito nosso! 📢 Vamos usá-lo sem medo?",
  "A tua identidade digital também merece proteção! 🧑‍💻 Vamos protegê-la?",
  "Os teus segredos são teus! 🔒 A privacidade também é um direito!",
  "Cuidado com desconhecidos online! 🚫 Vamos aprender a reconhecer o perigo?",
  "Os teus direitos também existem online! ⚖️ Último nível — dá tudo!"
];

export const VB_HIT = [
  "Ups! Perdemos uma vida, mas os heróis nunca desistem! 💪",
  "Autsch! Cuida-te! Os vilões estão rápidos hoje! 🔴",
  "Ai! Respira fundo e vamos de novo! ❤️",
  "Atenção aos vilões! Já consegues! 🛡️",
  "Não faz mal! Cada erro ensina algo novo! 📚",
  "Vamos lá, guerreiro digital! Ainda temos vidas! 🌟"
];

export const VB_QUIZ_CORRECT = [
  "INCRÍVEL! Sabias mesmo a resposta! 🏆",
  "Que craque! Competência recuperada! ✨",
  "Fantástico! Estou tão orgulhoso de ti! 🎉",
  "Isso mesmo! A cibersegurança agradece! 🛡️",
  "Brilhante! Nada te escapa! 🌟",
  "Que resposta! Mereces uma estrela! ⭐"
];

export const VB_QUIZ_WRONG = [
  "Quase! Aprende e vai mais forte na próxima! 📖",
  "Não faz mal! Errar também é aprender! 💡",
  "Boa tentativa! Desta vez não foi, mas chegas lá! 💪",
  "Até os heróis erram — o importante é tentar! ❤️",
  "Relê a dica e tenta outra vez! 🔄"
];

export const VB_STAR_POWER = [
  "STAR POWER! Agora és IMPARÁVEL! ⭐",
  "Uau, a estrela! Vai atropelar tudo! 💥",
  "SUPER VANBERTO'S ATIVADO! 🌟",
  "Estrela apanhada! 8 segundos de glória! ✨"
];

export const VB_PERFECT_LEVEL = [
  "PERFEITO! Nenhuma vida perdida! Lendário! 🏆",
  "Uau! Passaste o nível sem um arranhão! ⭐",
  "Impecável! Guardião da Cibersegurança nível máximo! 🌟",
  "Incrível! Isso merecia um bónus extra! 🎉"
];
