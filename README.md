# ONZEUP ⚽

**Gestão, comunicação e presença digital para clubes, escolinhas, projetos esportivos e famílias de atletas.**

A ONZEUP é uma plataforma SaaS voltada à gestão de categorias de base, reunindo em um único ambiente atletas, categorias, comissão técnica, treinos, jogos, convocações, QTR, financeiro, comunicação e site público.

Além da área de organizações, o ecossistema inclui o **ONZE Player**, um perfil esportivo administrado pela família.

---

## 🌐 Repositório

GitHub:

`https://github.com/palomaventura-spec/onzeup`

Autora:

**Paloma Ventura**  
GitHub: `palomaventura-spec`

---

## 🚀 Versão atual

**v0.9.4.1 — Pilot Ready**

Esta versão consolida a base para testes externos e preparação do ambiente demo.

---

## 🏟️ ONZEUP para organizações

A plataforma permite que clubes, escolinhas, projetos e centros de treinamento administrem:

- Dashboard operacional
- Categorias
- Comissão técnica
- Atletas
- Responsáveis
- Treinos
- Jogos e resultados
- Agenda
- Convocações
- QTR semanal
- Comunicação
- WhatsApp básico
- Financeiro
- Pix manual
- Notificações
- Vínculos com ONZE Player
- Site público da organização
- Personalização visual
- Ambiente demo
- Onboarding e ajuda contextual

### Site público automático

Os dados cadastrados no painel alimentam o site público da organização.

Exemplo de estrutura:

```text
/o/[slug]
/o/[slug]/categorias/[id]
/o/[slug]/atletas/[id]
```

A organização pode publicar categorias, atletas, comissão, jogos, resultados e outras informações sem precisar manter um segundo sistema.

---

## ⭐ ONZE Player

O **ONZE Player** é a área destinada aos pais e responsáveis.

O perfil pertence à família e permanece separado do cadastro administrativo criado pelo clube.

Funcionalidades atuais:

- múltiplos atletas por conta familiar
- foto principal
- imagem de capa
- nome completo
- apelido / nome esportivo
- posição principal e secundária
- ano de nascimento
- nacionalidade
- altura e peso
- pé dominante
- clube atual
- Instagram
- apresentação do atleta
- estatísticas
- carreira
- conquistas
- vídeos
- galeria
- perfil público ou privado
- templates Premium Dark e Clean Light
- compartilhar perfil
- copiar link
- QR Code
- vínculos verificados com organizações ONZEUP

Página pública:

```text
/player/[slug]
```

### Regra de propriedade dos dados

**Clube:** controla o cadastro administrativo do atleta.

**Família:** controla o ONZE Player.

O vínculo entre os dois não transfere permissão de edição.

---

## 📅 QTR

O módulo QTR permite:

- geração automática a partir de treinos e jogos
- criação manual
- modo híbrido
- edição por atividade
- horário inicial e final
- local
- observações
- duplicação da semana anterior
- impressão/PDF
- compartilhamento

---

## 📱 WhatsApp

A primeira integração utiliza o modelo básico:

```text
ONZEUP → mensagem pronta → WhatsApp do responsável
```

Não exige WhatsApp Business nem integração com a Meta.

O sistema não lê mensagens do usuário.

A automação via API oficial poderá ser adicionada posteriormente como recurso opcional.

---

## 💳 Financeiro

Recursos atuais:

- mensalidades
- taxa de arbitragem
- torneios
- uniformes
- viagens
- eventos
- outras cobranças
- Pix
- baixa manual
- controle de pendências
- mensagens de cobrança pelo WhatsApp

---

## 🧭 Demo

A ONZEUP possui dois ambientes de demonstração.

### Clube

```text
admin@onzeup.com.br
```

### ONZE Player

```text
responsavel@onzeup.com.br
```

Senha das contas demo:

```text
OnzeUp123!
```

A landing também possui entrada de demonstração com um clique.

O clube de demonstração é fictício e separado dos dados usados durante o desenvolvimento.

---

## 🛠️ Stack

- Next.js 15
- React 19
- TypeScript
- Prisma ORM 6
- PostgreSQL
- Neon
- Tailwind / CSS
- Vercel
- Vercel Blob
- bcryptjs
- jose
- QR Code
- Git / GitHub

---

## 📂 Estrutura principal

```text
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── agenda/
│   │   ├── organizacao/
│   │   ├── categorias/
│   │   ├── comissao/
│   │   ├── atletas/
│   │   ├── treinos/
│   │   ├── jogos/
│   │   ├── qtr/
│   │   ├── convocacoes/
│   │   ├── comunicacao/
│   │   ├── responsaveis/
│   │   ├── financeiro/
│   │   ├── notificacoes/
│   │   ├── vinculos-player/
│   │   └── piloto/
│   ├── responsavel/
│   ├── player/
│   ├── o/
│   ├── login/
│   └── api/
├── components/
└── lib/

prisma/
├── schema.prisma
└── seed.ts
```

---

## ⚙️ Configuração local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar `.env`

Exemplo:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="uma-chave-longa-e-aleatoria"
BLOB_READ_WRITE_TOKEN=""
```

O `BLOB_READ_WRITE_TOKEN` é necessário para uploads persistentes no ambiente de produção.

### 3. Prisma

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

Quando houver alteração no schema:

```bash
npx prisma db push
```

### 4. Dados demo

```bash
npm run db:seed
```

### 5. Build

```bash
npm run build
```

### 6. Desenvolvimento

```bash
npm run dev
```

Por padrão:

```text
http://localhost:3000
```

---

## ☁️ Deploy

Fluxo planejado:

```text
GitHub
   ↓
Vercel
   ↓
Neon PostgreSQL
   ↓
Vercel Blob
   ↓
Domínio ONZEUP
```

Variáveis necessárias na Vercel:

```text
DATABASE_URL
SESSION_SECRET
BLOB_READ_WRITE_TOKEN
```

Antes de apontar o domínio, validar:

```text
/piloto
```

---

## 🔐 Segurança e privacidade

A plataforma separa:

- dados administrativos do clube
- dados privados dos responsáveis
- informações públicas do site
- perfil esportivo administrado pela família

Dados como telefone e e-mail dos responsáveis não são publicados no site do clube.

Para utilização comercial com dados reais de menores, ainda serão realizadas revisões adicionais de permissões, auditoria, LGPD, segurança e políticas de retenção.

---

## 🗺️ Roadmap

### v0.9.4.x

- testes de ponta a ponta
- refinamento mobile
- revisão de permissões
- persistência definitiva de uploads
- correções do ambiente demo
- preparação Vercel/domínio

### v1.0.0

- primeiro piloto externo
- feedback de clubes/escolinhas
- correções do piloto
- revisão de segurança
- auditoria
- relatórios
- definição dos planos comerciais

---

## 📌 Status

**Em desenvolvimento / pré-piloto.**

A plataforma ainda não deve ser tratada como produto final de produção.

---

## 👩‍💻 Desenvolvimento

Projeto desenvolvido por **Paloma Ventura** como SaaS full-stack e projeto de portfólio, com foco em gestão esportiva, automação e Inteligência Artificial.

GitHub:

`https://github.com/palomaventura-spec`

---

**ONZEUP — O futuro do futebol começa na base.**


## v0.9.4.1 — Ecosystem Landing
- landing reposicionada como ecossistema Clube → Família → Atleta
- exemplo demonstrativo real do ONZE Player com imagem autorizada
- seção para operações de base em escala
- planos comerciais previstos após o piloto
- Programa Clube Parceiro
- FAQ comercial
- CTAs de demo e piloto reforçados
- aviso explícito de que a imagem demonstrativa não representa parceria institucional com o clube retratado


## v0.9.4.2 — Isolated ONZE Player Demo

O botão de demonstração do ONZE Player não usa mais um perfil pré-preenchido compartilhado.

Novo fluxo:

```text
Landing
→ Criar um Player de teste
→ sessão temporária individual
→ área familiar vazia
→ criar atleta fictício
→ publicar
→ visualizar perfil público
```

O perfil real usado como referência visual na landing não é carregado dentro da conta demo.

A conta demo de Clube continua sendo compartilhada.
