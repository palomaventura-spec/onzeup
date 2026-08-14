# Changelog

## v1.2.9 — Uniform Premium Video Gallery
- remove o destaque gigante do primeiro vídeo
- todos os vídeos Premium usam exatamente a mesma proporção 16:9
- 2 vídeos por linha em desktop/tablet
- 1 vídeo por linha em telas menores
- novos vídeos entram automaticamente na grade
- mantém o player do YouTube e títulos


## v1.2.8a — Example Route Fix
- elimina página Premium estática antiga
- /exemplos/player-premium redireciona para o perfil real gustavo-aguiar
- /exemplos/player-free redireciona para o perfil real gustavo-aguiar-free
- landing e catálogo usam os perfis reais como demonstração
- evita divergência entre demo e perfil público no futuro


## v1.2.8 — Premium Complete Redesign
- redesenha completamente o miolo do perfil Premium
- elimina faixas vazias e rótulos simples
- cria seções editoriais com numeração grande
- vídeos passam a usar players reais, sem caixas falsas
- perfil ganha grade de dados esportivos
- trajetória vira timeline visual
- conquistas viram cards
- Player/Coach routing preservados


## v1.2.7 — Coach Routing Fix
- botão Explorar Coach passa a usar rota interna /coaches
- cadastro e login do Coach usam rotas internas confiáveis
- cards do catálogo Coach usam /coach-profile/[slug]
- adiciona alias /coach -> /coaches
- mantém compatibilidade com coach.onzeup.com.br via middleware
- não altera Player Premium


## v1.2.6 — Premium Editorial Redesign
- redesenha numeração e títulos das seções Premium
- troca rótulos simples por navegação editorial visual
- remove duplicação visual de thumbnail + iframe nos vídeos
- cria vitrine de vídeos com player único por card
- melhora hierarquia de carreira e conquistas
- reforça aparência de site esportivo Premium


## v1.2.5 — UI Polish Consolidated
- corrige acabamento do botão Explorar atletas
- aplica o mesmo padrão visual no Coach
- equaliza altura e espaçamento dos CTAs principais e secundários
- melhora hover e responsividade dos botões
- corrige acabamento dos botões Personalizar site e Abrir site público
- preserva todas as correções de routing/schema/login da v1.2.4


## v1.2.4 — Routing + Schema Cleanup
- roteamento de subdomínios reforçado por middleware e rewrites por Host
- `players.onzeup.com.br` força o portal Player
- `coach.onzeup.com.br` força o portal Coach
- suporte local a `players.localhost` e `coach.localhost`
- removida a última referência visível a "ecossistema"
- adicionado `npm run db:sync` para sincronizar Prisma e banco
- mantém `websiteUrl` no PlayerProfile


## v1.2.3 — Player Real Account + Premium Showcase
- cria conta modelo real do Gustavo no seed
- cria perfis Gustavo Free e Premium na mesma conta de responsável
- dashboard identifica plano Free/Premium
- adiciona link opcional de Instagram e site externo
- Free limita publicação a 1 vídeo
- Premium aceita vários vídeos
- perfil público passa a renderizar layout Premium real conforme plano
- vídeos Premium ganham thumbnails e embeds
- Premium recebe carreira, conquistas, galeria e links sociais
- adiciona preview Free/Premium no painel da família


## v1.2.2 — Player Showcase + Auth Fixes
- remove Ecossistema/Piloto da experiência comercial
- corrige Explorar Players
- cria exemplos Gustavo Free e Premium
- corrige sobreposição Free x Premium
- corrige botão Personalizar site
- remove menu Piloto do dashboard
- adiciona COACH ao UserRole
- implementa recuperação e redefinição de senha


## v1.2.1 — Commercial Routing + Independent Portals
- landing principal mantém identidade ONZEUP e remove linguagem "Ecossistema"
- bloco comercial passa a apresentar Club + Player + Coach
- ONZEUP Coach ganha CTA e navegação na landing
- `players.onzeup.com.br` ganha home própria e catálogo de atletas
- `coach.onzeup.com.br` ganha home própria e catálogo profissional
- middleware reforçado com leitura de `x-forwarded-host`
- Player e Coach não reutilizam a landing principal
- cadastros permanecem centralizados em `onzeup.com.br`
- perfis públicos mantêm URLs limpas nos respectivos subdomínios


## v1.2.0 — ONZEUP Ecosystem Commercial
- ecossistema comercial Club + Player + Coach
- ONZEUP Coach Free lançado
- cadastro e editor profissional Coach
- catálogo `coach.onzeup.com.br`
- perfil público `coach.onzeup.com.br/[slug]`
- middleware separa Player e Coach sem conflito de slugs
- landing passa a apresentar Coach
- Club mantém trial comercial de 15 dias
- Player mantém Free/Premium
- limpeza de linguagem piloto/demo na experiência do cliente
- novo model `CoachProfile`


## v1.1.6 — Club Onboarding + Clean Dashboard
- cadastro Club cria sessão e segue direto para onboarding
- onboarding inicial com dados públicos, modalidade, cidade, cor, categoria e treino
- categoria e treino opcionais são criados automaticamente
- dashboard exige onboarding concluído
- dashboard inicial redesenhado, limpo e orientado a ações
- informações cadastradas aparecem imediatamente no painel
- contador de dias restantes do trial
- checklist comercial de configuração
- site público destacado desde o primeiro acesso
- removida linguagem residual de ambiente demo


## v1.1.4 — Players Directory Flow
- landing principal preservada visualmente
- Club CTA confirmado para `/cadastro-clube`
- `players.onzeup.com.br` abre diretamente o catálogo público
- portal ONZE Players ganha CTA de cadastro gratuito
- catálogo recebe hero, busca, cards e seção "Como funciona"
- estado vazio convida os primeiros atletas a se cadastrar
- perfis continuam em `players.onzeup.com.br/[slug]`


## v1.1.3 — Players Subdomain + Commercial Flow
- `players.onzeup.com.br` passa a abrir o catálogo ONZE Players
- perfis públicos passam ao padrão `players.onzeup.com.br/[slug]`
- links de compartilhamento usam o subdomínio Players
- fluxo demo de Clube removido
- ONZEUP Club passa para cadastro comercial com 15 dias grátis
- nova rota `/cadastro-clube`
- trial criado no banco com validade de 15 dias
- cadastro de Clube preparado para confirmação de e-mail
- login sem mensagens ou lógica de demonstração
- landing atualizada para Club trial + Player Free
- `/players` permanece como fallback local para desenvolvimento


## v1.1.2 — Demo Club + Clean Auth
- demo Clube passa a se autocriar/recuperar ao clicar
- demo Clube não depende mais de seed manual para abrir
- removido definitivamente fluxo demo do ONZE Player
- bloqueio de autofill antigo na tela de cadastro do responsável
- tela de login sem demonstrações e sem formulários aninhados
- busca e remoção de referências literais a Leximóvel no código/documentação
- feedback de erro específico para falha do demo Clube


## v1.1.1 — Player Free Fixes
- corrigido conflito entre `/atletas` interno e catálogo público
- catálogo público agora usa `/players`
- removidos formulários aninhados no login
- retirada demonstração Player da tela de autenticação
- CTA "Criar ONZE Player grátis" conectado ao cadastro real
- seção ONZEUP Parceiros reposicionada comercialmente


## v1.1.0 — ONZE Player Free
- entrada comercial real para famílias
- removido fluxo demo do CTA de criação gratuita
- cadastro de responsável
- estrutura de verificação de e-mail
- plano Player FREE
- catálogo público de atletas
- URLs públicas na raiz do domínio
- controles de publicação e catálogo
- limite de 1 vídeo YouTube no Free
- Super Admin preparado para gestão de Players
- estrutura de Premium e cortesia no banco


## v1.0.0 — MVP Comercial
- landing reposicionada de piloto para produto comercial
- CTA principal direcionado aos planos
- plano Base reduzido para R$ 49,90/mês
- plano Pro definido em R$ 99,90/mês
- plano Clube definido em R$ 179,90/mês
- programa piloto substituído por ONZEUP Parceiros
- possibilidade de acesso cortesia para organizações selecionadas
- textos comerciais revisados para evitar promessas de recursos fora do MVP
- FAQ atualizada para demonstração antes da contratação


## v0.9.4.3 — Neutral Demo Placeholders
- removidos exemplos baseados no Gustavo da tela de criação demo
- placeholders substituídos por dados genéricos fictícios
- experiência de criação do ONZE Player totalmente neutra


## v0.9.4.2 — Isolated ONZE Player Demo
- botão Player cria uma sessão temporária individual e vazia
- visitante cria o próprio perfil fictício durante o teste
- removido redirecionamento para o perfil demo pré-preenchido
- Gustavo permanece somente como exemplo visual na landing
- onboarding específico para teste do Player


## v0.9.4.1 — Ecosystem + ONZE Player Premium
- landing comercial reposicionada para Clube → Família → Atleta
- imagem demonstrativa do Gustavo no ONZE Player
- seção de escala para grandes operações de base
- planos previstos: Base, Pro e Clube
- Programa Clube Parceiro / piloto
- FAQ comercial
- reforço da separação entre ficha administrativa e perfil familiar


## v0.9.4.0 — Pilot Ready
- storage persistente preparado com Vercel Blob
- upload com feedback de sucesso/erro
- confirmação de ações destrutivas
- guards de navegação por perfil
- checklist `/piloto`
- revisão mobile do painel
- `.env.example` para deploy


## v0.9.3.5 — UI Action Polish
- refinamento visual de Ver agenda / Novo jogo
- Treinos / Jogos da Agenda convertidos em controle compacto agrupado
- melhor alinhamento e hierarquia das ações de cabeçalho


## v0.9.3.4 — Demo Isolation Fix
- conta demo do clube separada do Arouca e de qualquer organização de teste
- nova organização exclusiva `Clube Demo OnzeUp`
- seed reassocia `admin@onzeup.com.br` à organização demo mesmo se o usuário já existir
- responsável demo permanece fora de organizações
- categorias demo garantidas de forma idempotente


## v0.9.3.3 — Demo Experience
- login demo com um clique para Clube e ONZE Player
- botões de teste na landing e no login
- banner visível de ambiente demonstrativo
- seed enriquecido com atleta, treinador, treino, jogo e Player fictícios
- Player demo público e vínculo de clube verificado


## v0.9.3.2 — ONZE Player Profile Upgrade
- mini-site premium do atleta
- nome completo em destaque e apelido secundário
- novos campos opcionais de perfil e estatísticas
- carreira, conquistas, capa e dois templates
- compartilhar, copiar link e QR Code
- remoção de pré-preenchimentos indevidos no login/novo Player


## v0.9.3.1
- landing pública comercial em `/`
- apresentação ONZEUP Organizações + ONZE Player
- demonstrações visuais de dashboard, site, comunicação e Player
- login renomeado para conta ONZEUP e credenciais demo dos dois perfis
- ONZE Player com status público/privado e ações Ver página, Copiar link e Compartilhar


## v0.9.3.0 — Operations + ONZE Player
- dashboard operacional orientado ao dia a dia
- próximos treinos e jogos em destaque
- atalhos rápidos
- agenda unificada de treinos recorrentes e jogos
- central da categoria com elenco, comissão, treinos e jogos
- cards de atletas administrativos mais visuais
- central de comunicação com WhatsApp básico
- central de notificações derivadas de pendências
- visão agrupada de responsáveis
- ONZE Player com múltiplos perfis por responsável
- edição de foto, bio, vídeos, galeria e dados esportivos
- perfil público ONZE Player redesenhado
- vínculos Player ↔ atleta do clube exibidos separadamente
- busca de possíveis vínculos pelo e-mail do responsável
- aprovação/recusa de vínculo ONZE Player pelo coordenador
- nenhuma nova tabela Prisma nesta versão


## v0.9.2.2
- onboarding guiado por módulo
- tutorial automático na primeira visita
- botão "Ajuda desta tela" para reabrir tour
- checklist de primeiros passos no dashboard
- progresso baseado nos cadastros reais da organização
- balões contextuais de ajuda
- central Ajuda com opção de reativar tutoriais
- explicação de Atleta do clube x OnzeUp Player
- explicação de QTR, WhatsApp básico e Pix manual
- estado dos tutoriais salvo no navegador, sem alteração no banco


## v0.9.2.1
- Home pública: elenco agora é apresentado por categorias
- Cards de Sub-8/Sub-9/etc. com contagem de atletas e comissão
- Página pública específica para cada categoria
- Página da categoria reúne atletas, comissão, treinos, jogos e resultados
- Cards de categorias da seção Nossa Base agora também abrem a categoria


## v0.9.1 — QTR visual refresh
- QTR redesenhado em cards por atividade
- horário inicial/final com campos próprios
- modal de edição por célula
- treinos, jogos, amistosos e eventos com cores distintas
- navegação semanal
- duplicação da semana anterior
- geração automática mantida
- edição manual/híbrida mantida
- impressão/PDF e compartilhamento

## v0.9.1
- QTR semanal automático, manual e editável
- preferência de tema do painel
- personalização de cores/fundo do site público
- chave Pix e formas de baixa financeira
- WhatsApp básico + copiar mensagem
- upload local JPEG/PNG/WEBP para logo e capa (piloto local; produção requer storage persistente)
- papel GUARDIAN e OnzeUp Player separado do atleta do clube
- perfil público do atleta administrado pela família

## v0.9.0
Base SaaS multi-organização, financeiro, convocações, integrações e Super Admin.

## v0.9.2
- Site público transformado em portal esportivo do clube.
- Hero, próximo jogo, categorias, agenda, resultados, elenco, comissão e sobre.
- Cards visuais de atletas com foto e página pública individual.
- Tema público claro/escuro preservado e separado do painel.
- Responsividade mobile.
- Correção do warning CSS `align-items: end` para `flex-end`.
- QTR v0.9.1 preservado.
