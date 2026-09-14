import {
  PerformanceArea,
  PerformanceAthleteRole,
  PrismaClient,
  SportType,
} from "@prisma/client";

const prisma = new PrismaClient();

type CriterionSeed = {
  area: PerformanceArea;
  code: string;
  label: string;
  description: string;
  levels: [string, string, string, string];
};

const F = PerformanceArea.PHYSICAL;
const T = PerformanceArea.TECHNICAL;
const A = PerformanceArea.TACTICAL;
const C = PerformanceArea.COGNITIVE;
const E = PerformanceArea.EMOTIONAL;

const linePlayerCriteria: CriterionSeed[] = [
  {
    area: F,
    code: "LINE_PHYSICAL_AGILITY",
    label: "Agilidade e mudança de direção",
    description: "Coordenação motora para mudar de direção com velocidade e equilíbrio.",
    levels: [
      "Tem dificuldade no zigue-zague e perde o equilíbrio com frequência.",
      "Completa o percurso lentamente, abre as curvas e apresenta instabilidade.",
      "Contorna os cones com velocidade controlada e boa coordenação corporal.",
      "Muda de direção de forma explosiva, sem perder equilíbrio ou ritmo.",
    ],
  },
  {
    area: F,
    code: "LINE_PHYSICAL_REACTION",
    label: "Velocidade de reação",
    description: "Tempo de resposta a estímulos visuais e sonoros.",
    levels: [
      "Não reage ao estímulo ou inicia o movimento para a direção errada.",
      "Reage com atraso e depende da reação da bola ou dos colegas.",
      "Inicia o movimento assim que identifica o estímulo.",
      "Reage de forma instantânea, antecipa a trajetória e acelera com intensidade.",
    ],
  },
  {
    area: F,
    code: "LINE_PHYSICAL_ENDURANCE",
    label: "Resistência geral",
    description: "Capacidade de manter atividade e intensidade durante o treino ou jogo.",
    levels: [
      "Cansa nos primeiros minutos e reduz muito a participação.",
      "Começa bem, mas apresenta queda acentuada de rendimento.",
      "Mantém-se ativo durante a maior parte da atividade.",
      "Mantém intensidade alta do início ao fim e participa continuamente.",
    ],
  },
  {
    area: F,
    code: "LINE_PHYSICAL_BALANCE",
    label: "Equilíbrio estático e dinâmico",
    description: "Controle corporal ao correr, parar, chutar e saltar.",
    levels: [
      "Não sustenta apoio unipodal e perde o equilíbrio em ações simples.",
      "Apresenta instabilidade e precisa apoiar o pé rapidamente.",
      "Sustenta o corpo com estabilidade e executa o chute sem cair.",
      "Apresenta estabilidade elevada e mecânica corporal firme em movimento.",
    ],
  },
  {
    area: F,
    code: "LINE_PHYSICAL_EXPLOSIVE_STRENGTH",
    label: "Força explosiva",
    description: "Potência nos primeiros passos, arranques e saltos.",
    levels: [
      "Apresenta salto curto e arranque muito lento para a faixa observada.",
      "Demonstra alguma potência, mas os primeiros passos ainda são lentos.",
      "Apresenta bom salto e bom arranque inicial.",
      "Executa saltos potentes e primeiro passo muito rápido.",
    ],
  },
  {
    area: T,
    code: "LINE_TECHNICAL_CONTROL",
    label: "Controle e domínio",
    description: "Capacidade de amortecer e manter a bola próxima para a ação seguinte.",
    levels: [
      "A bola se afasta após o contato e o atleta não consegue controlá-la.",
      "Amortece a bola, mas permite que ela se afaste e facilite o desarme.",
      "Domina mantendo a bola próxima e pronta para a próxima ação.",
      "Domina orientando a bola para o espaço livre e escapando da pressão.",
    ],
  },
  {
    area: T,
    code: "LINE_TECHNICAL_DRIBBLING",
    label: "Condução de bola",
    description: "Transporte da bola com controle em retas, curvas e mudanças de direção.",
    levels: [
      "Toca a bola muito à frente e perde o controle em curvas simples.",
      "Conduz principalmente em linha reta, com o pé dominante e olhando para baixo.",
      "Mantém a bola próxima em velocidade moderada e alterna o olhar.",
      "Conduz em velocidade, muda de direção e utiliza os dois pés.",
    ],
  },
  {
    area: T,
    code: "LINE_TECHNICAL_PASS",
    label: "Precisão de passe",
    description: "Direção e força de passes curtos e médios.",
    levels: [
      "Não direciona o passe e perde a posse com frequência.",
      "Acerta passes curtos sem pressão, mas erra quando pressionado.",
      "Executa passes curtos firmes e direcionados ao companheiro.",
      "Ajusta a força e encontra companheiros em movimento ou a média distância.",
    ],
  },
  {
    area: T,
    code: "LINE_TECHNICAL_FINISHING",
    label: "Finalização e chute",
    description: "Coordenação, força e precisão das finalizações.",
    levels: [
      "Erra o contato com a bola ou finaliza sem coordenação e força.",
      "Finaliza bolas paradas, com pouca variedade técnica.",
      "Chuta com força e intenção utilizando peito do pé ou parte interna.",
      "Finaliza bolas em movimento com força, precisão e escolha dos cantos.",
    ],
  },
  {
    area: T,
    code: "LINE_TECHNICAL_TACKLE",
    label: "Desarme",
    description: "Uso do corpo e escolha do momento para recuperar a bola.",
    levels: [
      "Escolhe o momento errado e evita disputas pela bola.",
      "Acompanha o adversário, mas comete faltas ou usa o corpo sem controle.",
      "Intercepta ou desarma no momento adequado e de forma limpa.",
      "Antecipa a jogada, recupera a bola e inicia imediatamente o ataque.",
    ],
  },
  {
    area: A,
    code: "LINE_TACTICAL_SPATIAL_ORIENTATION",
    label: "Noção espacial e alvo",
    description: "Orientação em relação aos gols, limites e espaços de jogo.",
    levels: [
      "Demonstra desorientação sobre direção, gols e linhas do campo.",
      "Reconhece o alvo, mas se perde quando o jogo ganha velocidade.",
      "Ataca e defende na direção correta e respeita os limites com autonomia.",
      "Orienta-se perfeitamente nos espaços mesmo sob pressão.",
    ],
  },
  {
    area: A,
    code: "LINE_TACTICAL_WIDTH",
    label: "Dispersão com bola",
    description: "Capacidade de oferecer amplitude sem se aglomerar ao redor da bola.",
    levels: [
      "Permanece muito próximo do companheiro com a bola.",
      "Tenta abrir o campo, mas volta frequentemente para a aglomeração.",
      "Mantém distância adequada e oferece apoio lateral.",
      "Ocupa naturalmente os corredores e amplia o espaço ofensivo.",
    ],
  },
  {
    area: A,
    code: "LINE_TACTICAL_RECOVERY",
    label: "Recomposição sem bola",
    description: "Reação defensiva imediatamente após a perda da posse.",
    levels: [
      "Permanece parado ou caminha após a perda da posse.",
      "Tenta retornar, mas sem intensidade ou direção correta.",
      "Corre em direção ao próprio gol e ajuda a fechar os espaços.",
      "Retorna em velocidade máxima e se posiciona entre a bola e o gol.",
    ],
  },
  {
    area: A,
    code: "LINE_TACTICAL_PASSING_LANES",
    label: "Leitura de linhas de passe",
    description: "Movimentação para sair da marcação e oferecer opção de passe.",
    levels: [
      "Fica escondido atrás do marcador e não se movimenta para receber.",
      "Movimenta-se, mas permanece em zonas congestionadas.",
      "Procura espaços vazios e sai da sombra do marcador.",
      "Antecipa a linha de passe e indica claramente onde deseja receber.",
    ],
  },
  {
    area: A,
    code: "LINE_TACTICAL_ROLES",
    label: "Ocupação de funções",
    description: "Compreensão e alternância entre responsabilidades ofensivas e defensivas.",
    levels: [
      "Não compreende quando deve defender ou atacar.",
      "Permanece apenas em uma função e participa pouco da outra fase.",
      "Alterna entre defesa e ataque conforme a jogada.",
      "Compreende a dinâmica coletiva e ocupa espaços deixados pelos companheiros.",
    ],
  },
  {
    area: C,
    code: "LINE_COGNITIVE_DECISION_SPEED",
    label: "Velocidade de decisão",
    description: "Rapidez para escolher entre passar, conduzir ou finalizar.",
    levels: [
      "Demora para agir e perde a bola antes de tomar uma decisão.",
      "Escolhe uma ação adequada, mas executa com atraso.",
      "Toma decisões rápidas e autônomas ao receber a bola.",
      "Antecipa o cenário e define a ação antes de a bola chegar.",
    ],
  },
  {
    area: C,
    code: "LINE_COGNITIVE_FOCUS",
    label: "Atenção e foco sustentado",
    description: "Concentração durante explicações, exercícios e jogos.",
    levels: [
      "Distrai-se facilmente com estímulos externos.",
      "Mantém o foco no início, mas se desconecta em momentos sem bola.",
      "Permanece focado e acompanha as jogadas mesmo longe da bola.",
      "Mantém concentração total e reage imediatamente às mudanças.",
    ],
  },
  {
    area: C,
    code: "LINE_COGNITIVE_GAME_VISION",
    label: "Visão de jogo",
    description: "Percepção dos espaços, colegas e adversários antes e durante a ação.",
    levels: [
      "Mantém a cabeça baixa e percebe apenas a bola.",
      "Observa principalmente o adversário mais próximo.",
      "Ergue a cabeça durante a condução e identifica o espaço à frente.",
      "Usa visão periférica e encontra companheiros em posições vantajosas.",
    ],
  },
  {
    area: C,
    code: "LINE_COGNITIVE_PROBLEM_SOLVING",
    label: "Resolução de problemas",
    description: "Criatividade e adaptação para sair de situações de pressão.",
    levels: [
      "Desiste da jogada ou afasta a bola sem buscar solução.",
      "Repete a mesma tentativa mesmo quando o caminho está fechado.",
      "Encontra soluções simples e inteligentes para conservar a posse.",
      "Cria fintas ou passes inesperados para superar a pressão.",
    ],
  },
  {
    area: C,
    code: "LINE_COGNITIVE_GAME_MEMORY",
    label: "Memória de jogo",
    description: "Capacidade de lembrar e aplicar regras e instruções.",
    levels: [
      "Esquece regras básicas e orientações dadas no início.",
      "Lembra inicialmente, mas deixa de aplicar as instruções durante a atividade.",
      "Recorda e aplica regras e orientações com facilidade.",
      "Assimila comandos rapidamente e corrige erros com base em experiências anteriores.",
    ],
  },
  {
    area: E,
    code: "LINE_EMOTIONAL_FRUSTRATION",
    label: "Tolerância à frustração",
    description: "Reação após erros, gols sofridos e situações adversas.",
    levels: [
      "Interrompe a participação ou reage com descontrole após o erro.",
      "Demonstra irritação ou desânimo e perde a concentração.",
      "Aceita o erro e retoma o jogo com naturalidade.",
      "Reage positivamente e busca recuperar a bola imediatamente.",
    ],
  },
  {
    area: E,
    code: "LINE_EMOTIONAL_CONFIDENCE",
    label: "Autoconfiança e iniciativa",
    description: "Coragem para participar, criar e assumir ações no jogo.",
    levels: [
      "Evita participar e se desfaz da bola por medo de errar.",
      "Escolhe apenas ações muito seguras e demonstra timidez.",
      "Tenta dribles, conduções e finalizações com confiança.",
      "Assume o jogo e tenta ações difíceis sem medo do erro.",
    ],
  },
  {
    area: E,
    code: "LINE_EMOTIONAL_TEAMWORK",
    label: "Respeito e espírito de equipe",
    description: "Cooperação com colegas e respeito às regras e decisões.",
    levels: [
      "Cria conflitos, desrespeita colegas ou recusa a cooperação.",
      "Participa de forma individual e ignora colegas, sem conflitos diretos.",
      "Coopera, comemora com o grupo e respeita decisões.",
      "Apoia os colegas, incentiva o grupo e demonstra companheirismo exemplar.",
    ],
  },
  {
    area: E,
    code: "LINE_EMOTIONAL_STRESS",
    label: "Gestão do estresse",
    description: "Controle emocional em situações de pressão.",
    levels: [
      "Perde o controle diante de pressão do adversário ou ambiente.",
      "Fica nervoso e passa a errar ações simples.",
      "Mantém calma e controle durante situações equilibradas ou difíceis.",
      "Absorve a pressão e preserva clareza nas ações mais exigentes.",
    ],
  },
  {
    area: E,
    code: "LINE_EMOTIONAL_ENGAGEMENT",
    label: "Motivação e engajamento",
    description: "Energia, interesse e dedicação nas atividades.",
    levels: [
      "Demonstra apatia e pouco interesse nas tarefas.",
      "Realiza as atividades por obrigação e reduz o esforço sem a bola.",
      "Demonstra energia e dedicação nas tarefas propostas.",
      "Mantém intensidade máxima e influencia positivamente o grupo.",
    ],
  },
];

const goalkeeperCriteria: CriterionSeed[] = [
  {
    area: F,
    code: "GK_PHYSICAL_MANUAL_REACTION",
    label: "Tempo de reação manual",
    description: "Rapidez para posicionar as mãos após o chute.",
    levels: [
      "Move as mãos somente depois que a bola passou ou entrou.",
      "Tenta reagir, mas apresenta atraso visível.",
      "Inicia o movimento das mãos assim que a bola é chutada.",
      "Reage instantaneamente e alcança chutes rápidos a curta distância.",
    ],
  },
  {
    area: F,
    code: "GK_PHYSICAL_GROUND_AGILITY",
    label: "Agilidade no solo",
    description: "Rapidez para levantar e reagir após uma queda ou defesa.",
    levels: [
      "Permanece no chão por muito tempo após a ação.",
      "Levanta lentamente ou com desequilíbrio.",
      "Cai, defende e se levanta rapidamente para acompanhar o jogo.",
      "Recupera-se de forma explosiva e está pronto para o segundo lance.",
    ],
  },
  {
    area: F,
    code: "GK_PHYSICAL_EYE_HAND_COORDINATION",
    label: "Coordenação ocular-manual",
    description: "Capacidade de acompanhar e segurar a bola com as mãos.",
    levels: [
      "Não acompanha a trajetória e deixa a bola escapar.",
      "Observa a bola, mas fecha as mãos fora do tempo correto.",
      "Acompanha a trajetória e segura a bola com segurança.",
      "Calcula trajetórias difíceis e prende a bola na primeira tentativa.",
    ],
  },
  {
    area: F,
    code: "GK_PHYSICAL_JUMP",
    label: "Impulsão e salto",
    description: "Potência para alcançar bolas altas e laterais.",
    levels: [
      "Não impulsiona o corpo e tenta alcançar apenas com os braços.",
      "Executa saltos curtos e com pouca potência.",
      "Apresenta boa impulsão lateral e vertical.",
      "Salta de forma explosiva e coordenada para alcançar os cantos.",
    ],
  },
  {
    area: F,
    code: "GK_PHYSICAL_FLEXIBILITY",
    label: "Flexibilidade e elasticidade",
    description: "Amplitude de movimento nas defesas e estiradas.",
    levels: [
      "Apresenta rigidez e alcance reduzido nas bolas rasteiras.",
      "Tenta se esticar, mas demonstra limitação ou descoordenação.",
      "Apresenta boa amplitude de braços e pernas.",
      "Alcança bolas extremas com estiradas amplas, limpas e seguras.",
    ],
  },
  {
    area: T,
    code: "GK_TECHNICAL_CATCHING",
    label: "Pega e encaixe",
    description: "Técnica para segurar bolas rasteiras, médias e altas.",
    levels: [
      "Não consegue prender a bola junto ao corpo.",
      "Usa os braços, mas solta a bola com frequência.",
      "Encaixa bolas rasteiras e médias junto ao peito com segurança.",
      "Domina diferentes técnicas de encaixe sem conceder rebotes.",
    ],
  },
  {
    area: T,
    code: "GK_TECHNICAL_HAND_DISTRIBUTION",
    label: "Reposição com as mãos",
    description: "Precisão e força no lançamento para os companheiros.",
    levels: [
      "Lança sem direção ou força adequada.",
      "Consegue lançar, mas erra o alvo ou a intensidade.",
      "Repõe com força adequada e encontra o companheiro livre.",
      "Executa reposições precisas que iniciam contra-ataques.",
    ],
  },
  {
    area: T,
    code: "GK_TECHNICAL_FEET",
    label: "Jogo com os pés",
    description: "Controle e passe em bolas recuadas, inclusive sob pressão.",
    levels: [
      "Erra o contato ou coloca a própria meta em risco.",
      "Afasta a bola sem direção e evita construir o jogo.",
      "Domina recuos e executa passes curtos com segurança.",
      "Usa os dois pés, mantém calma e distribui passes firmes sob pressão.",
    ],
  },
  {
    area: T,
    code: "GK_TECHNICAL_DEFLECTION",
    label: "Espalmada e desvio",
    description: "Direção segura da bola quando não é possível encaixar.",
    levels: [
      "Desvia a bola para a frente ou para uma zona perigosa.",
      "Tenta desviar, mas não controla a direção da bola.",
      "Direciona a bola para as laterais ou para fora.",
      "Altera trajetórias difíceis com precisão e segurança.",
    ],
  },
  {
    area: T,
    code: "GK_TECHNICAL_BASE_POSITION",
    label: "Posicionamento base",
    description: "Postura corporal de prontidão antes do chute.",
    levels: [
      "Permanece ereto ou sem postura de prontidão.",
      "Flexiona as pernas, mas mantém mãos e corpo mal posicionados.",
      "Adota base equilibrada, joelhos flexionados e mãos prontas.",
      "Mantém postura perfeita e ajusta os apoios ao movimento da bola.",
    ],
  },
  {
    area: A,
    code: "GK_TACTICAL_GOAL_ORIENTATION",
    label: "Noção de baliza e gol",
    description: "Orientação espacial e ajuste de ângulo em relação à meta.",
    levels: [
      "Perde a referência da meta e se posiciona fora do lance.",
      "Fica preso à linha e não acompanha o ângulo da jogada.",
      "Mantém-se centralizado e acompanha lateralmente a bola.",
      "Reduz o ângulo de forma consciente e precisa.",
    ],
  },
  {
    area: A,
    code: "GK_TACTICAL_ATTACK_SUPPORT",
    label: "Participação no ataque",
    description: "Atuação como apoio recuado na construção ofensiva.",
    levels: [
      "Evita avançar ou oferecer apoio quando o time tem a bola.",
      "Observa o ataque sem se posicionar como opção de passe.",
      "Posiciona-se fora da área como apoio recuado seguro.",
      "Cria superioridade e participa ativamente como goleiro-linha.",
    ],
  },
  {
    area: A,
    code: "GK_TACTICAL_DEFENSIVE_COVER",
    label: "Cobertura defensiva",
    description: "Saída da meta para interceptar bolas nas costas da defesa.",
    levels: [
      "Não sai da linha mesmo quando a bola está livre.",
      "Sai de forma precipitada e aumenta o risco defensivo.",
      "Sai no momento certo e afasta bolas longas.",
      "Antecipa passes e inicia o ataque após a cobertura.",
    ],
  },
  {
    area: A,
    code: "GK_TACTICAL_VERBAL_ORIENTATION",
    label: "Orientação verbal",
    description: "Comunicação para organizar e apoiar a equipe.",
    levels: [
      "Não se comunica com os companheiros.",
      "Comunica-se principalmente para reclamar após os lances.",
      "Orienta os colegas em situações defensivas básicas.",
      "Lidera a organização defensiva com comunicação clara e positiva.",
    ],
  },
  {
    area: A,
    code: "GK_TACTICAL_FAST_TRANSITION",
    label: "Transição ofensiva rápida",
    description: "Rapidez e qualidade da reposição após a defesa.",
    levels: [
      "Demora para repor e permite a reorganização adversária.",
      "Repõe rapidamente, mas escolhe uma opção insegura.",
      "Identifica e aciona companheiros em transição.",
      "Explora imediatamente a desorganização rival com reposição precisa.",
    ],
  },
  {
    area: C,
    code: "GK_COGNITIVE_TRAJECTORY",
    label: "Leitura da trajetória",
    description: "Antecipação do caminho, velocidade e quique da bola.",
    levels: [
      "Calcula incorretamente trajetórias e quiques simples.",
      "Apresenta dificuldade para estimar velocidade e direção.",
      "Lê a trajetória e posiciona-se para uma defesa segura.",
      "Antecipa efeito, desvios e trajetórias difíceis.",
    ],
  },
  {
    area: C,
    code: "GK_COGNITIVE_EXIT_DECISION",
    label: "Decisão de saída de gol",
    description: "Escolha entre permanecer na meta e sair para abordar o atacante.",
    levels: [
      "Fica paralisado ou sai sem observar o lance.",
      "Inicia a saída, hesita e fica mal posicionado.",
      "Escolhe corretamente entre esperar e sair para abafar.",
      "Sai com convicção no momento exato em que o adversário perde o controle.",
    ],
  },
  {
    area: C,
    code: "GK_COGNITIVE_PERIPHERAL_ATTENTION",
    label: "Atenção periférica",
    description: "Percepção de adversários e espaços ao redor da área.",
    levels: [
      "Observa apenas uma direção e perde adversários livres.",
      "Acompanha somente o portador da bola.",
      "Observa a bola e os atacantes que se movimentam na área.",
      "Mapeia todo o setor e antecipa ameaças para orientar a defesa.",
    ],
  },
  {
    area: C,
    code: "GK_COGNITIVE_SUSTAINED_FOCUS",
    label: "Foco sustentado",
    description: "Concentração mesmo quando a bola está longe da meta.",
    levels: [
      "Distrai-se quando participa pouco do jogo.",
      "Mantém foco sob pressão, mas se desliga durante ataques prolongados.",
      "Acompanha a jogada durante toda a atividade.",
      "Mantém nível máximo de alerta independentemente da posição da bola.",
    ],
  },
  {
    area: C,
    code: "GK_COGNITIVE_SURFACE_ADAPTATION",
    label: "Adaptação à superfície",
    description: "Ajuste aos diferentes pisos, velocidades e quiques.",
    levels: [
      "Erra ações simples quando a superfície altera o quique.",
      "Demora para ajustar o corpo a variações inesperadas.",
      "Ajusta braços e pernas aos diferentes quiques.",
      "Adapta imediatamente a técnica às características do piso.",
    ],
  },
  {
    area: E,
    code: "GK_EMOTIONAL_POST_GOAL",
    label: "Reação pós-gol",
    description: "Resiliência e retomada do foco após sofrer um gol.",
    levels: [
      "Perde o controle emocional ou pede para sair após sofrer o gol.",
      "Fica abatido e compromete os lances seguintes.",
      "Aceita o gol e reinicia o jogo concentrado.",
      "Reage positivamente, incentiva a equipe e cresce no jogo.",
    ],
  },
  {
    area: E,
    code: "GK_EMOTIONAL_COURAGE",
    label: "Coragem e iniciativa",
    description: "Disposição para proteger a meta e disputar a bola.",
    levels: [
      "Evita o impacto e reduz o corpo diante do chute.",
      "Hesita em divididas e bolas rasteiras.",
      "Coloca o corpo na trajetória e realiza defesas arrojadas.",
      "Aborda o lance com firmeza, coragem e convicção total.",
    ],
  },
  {
    area: E,
    code: "GK_EMOTIONAL_LEADERSHIP",
    label: "Liderança positiva",
    description: "Capacidade de apoiar e orientar os companheiros.",
    levels: [
      "Culpa ou confronta os companheiros após os erros.",
      "Isola-se e oferece pouco apoio ao grupo.",
      "Apoia os defensores e coopera com a equipe.",
      "Organiza emocionalmente o grupo e transmite segurança.",
    ],
  },
  {
    area: E,
    code: "GK_EMOTIONAL_PRESSURE_CONTROL",
    label: "Autocontrole sob pressão",
    description: "Calma para agir em lances decisivos e confrontos diretos.",
    levels: [
      "Entra em pânico e toma decisões de alto risco.",
      "Demonstra ansiedade e erra fundamentos simples.",
      "Mantém calma e clareza diante do atacante.",
      "Usa a tranquilidade para induzir o erro e defender com segurança.",
    ],
  },
  {
    area: E,
    code: "GK_EMOTIONAL_ACTION_CONFIDENCE",
    label: "Confiança nas ações",
    description: "Firmeza para assumir a bola e comunicar suas decisões.",
    levels: [
      "Hesita em todos os lances e demonstra insegurança corporal.",
      "Inicia a ação, mas recua por falta de firmeza.",
      "Decide com convicção e assume responsabilidade pela jogada.",
      "Transmite domínio absoluto por postura, voz e execução.",
    ],
  },
];

const ratingLabels = ["Iniciante", "Em desenvolvimento", "Eficiente", "Excelente"] as const;

async function upsertTemplate(input: {
  name: string;
  description: string;
  athleteRole: PerformanceAthleteRole;
  criteria: CriterionSeed[];
}) {
  const existing = await prisma.performanceTemplate.findFirst({
    where: {
      organizationId: null,
      systemDefault: true,
      athleteRole: input.athleteRole,
      sport: SportType.BOTH,
      version: 1,
    },
    select: { id: true },
  });

  const template = existing
    ? await prisma.performanceTemplate.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          description: input.description,
          active: true,
        },
      })
    : await prisma.performanceTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          athleteRole: input.athleteRole,
          sport: SportType.BOTH,
          active: true,
          systemDefault: true,
          version: 1,
        },
      });

  for (const [criterionIndex, item] of input.criteria.entries()) {
    const criterion = await prisma.performanceCriterion.upsert({
      where: {
        templateId_code: {
          templateId: template.id,
          code: item.code,
        },
      },
      update: {
        area: item.area,
        label: item.label,
        description: item.description,
        sortOrder: criterionIndex + 1,
        active: true,
      },
      create: {
        templateId: template.id,
        area: item.area,
        code: item.code,
        label: item.label,
        description: item.description,
        sortOrder: criterionIndex + 1,
        active: true,
      },
    });

    for (let index = 0; index < 4; index += 1) {
      const score = index + 1;
      await prisma.performanceCriterionLevel.upsert({
        where: {
          criterionId_score: {
            criterionId: criterion.id,
            score,
          },
        },
        update: {
          label: ratingLabels[index],
          description: item.levels[index],
        },
        create: {
          criterionId: criterion.id,
          score,
          label: ratingLabels[index],
          description: item.levels[index],
        },
      });
    }
  }

  return template;
}

async function main() {
  const line = await upsertTemplate({
    name: "Avaliação ONZEUP — Jogador de linha",
    description:
      "Modelo padrão com 25 critérios físicos, técnicos, táticos, cognitivos e emocionais.",
    athleteRole: PerformanceAthleteRole.LINE_PLAYER,
    criteria: linePlayerCriteria,
  });

  const goalkeeper = await upsertTemplate({
    name: "Avaliação ONZEUP — Goleiro",
    description:
      "Modelo padrão com 25 critérios específicos para o desenvolvimento de goleiros.",
    athleteRole: PerformanceAthleteRole.GOALKEEPER,
    criteria: goalkeeperCriteria,
  });

  console.log("Performance configurado com sucesso.", {
    linePlayerTemplateId: line.id,
    goalkeeperTemplateId: goalkeeper.id,
    criteria: linePlayerCriteria.length + goalkeeperCriteria.length,
    levels: (linePlayerCriteria.length + goalkeeperCriteria.length) * 4,
  });
}

main()
  .catch((error) => {
    console.error("Erro ao configurar o Performance:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
