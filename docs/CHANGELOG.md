# Changelog

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
