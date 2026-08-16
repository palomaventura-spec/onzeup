# ONZEUP v1.3.8 — Multi-vínculos

## Exemplo Gustavo

Um único ONZE Player pode consolidar:

- Botafogo — Futebol de Campo — Sub-9 — Federação
- Botafogo — Futsal — Sub-9 — Federação
- Gênesis — Futsal — Sub-9 — Torneios paralelos
- Equipe X — Futebol de Campo — Sub-9 — Torneios paralelos

Cada organização continua vendo apenas os próprios dados administrativos.

## Coach

O mesmo ONZE Coach pode ter vários acessos:

- Organização A / Sub-9 / Futsal
- Organização A / Sub-10 / Campo
- CT próprio / todas as categorias

O acesso a convocações é filtrado pela organização e categoria vinculadas.

## Banco

Esta versão adiciona:
- AthleteMembership
- CoachOrganizationAccess

Após instalar a atualização:
npx prisma validate
npx prisma generate
npx prisma db push
