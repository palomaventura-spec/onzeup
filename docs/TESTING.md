# Teste pré-deploy — OnzeUp v0.9.0

## Correção aplicada
- Seed corrigido após mudança de `Subscription.plan` para enum `PlanCode`.
- Valor demo alterado de `TRIAL` para `STARTER`.

## Validações feitas no pacote
- estrutura do schema Prisma revisada
- relações Organization/User/Category/Athlete/Match/CallUp/Charge revisadas
- rotas principais presentes
- isolamento por `organizationId` mantido nas ações administrativas

## Validações a executar localmente
```bash
npm install
npx prisma format
npx prisma validate
npx prisma generate
npm run build
```

Depois de configurar um banco novo:
```bash
npx prisma db push
npm run db:seed
npm run dev
```

## Fluxo manual de teste
1. Login coordenador
2. Criar categoria
3. Criar comissão
4. Criar atleta + responsável
5. Criar treino
6. Criar jogo
7. Criar convocação
8. Abrir WhatsApp
9. Criar mensalidade
10. Gerar taxa de arbitragem
11. Abrir site público
12. Login Super Admin
13. Conferir organizações/planos
