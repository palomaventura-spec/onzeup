# Prisma fix — v0.9.1

Correção aplicada:
- removida a relação inválida `Match.playerLinks`
- `PlayerAthleteLink` continua relacionando somente `PlayerProfile` e `Athlete`

Após extrair esta versão:

```bash
npm install
npx prisma format
npx prisma validate
npx prisma generate
npm run dev
```

Como esta correção remove apenas uma relação inválida do schema e não adiciona tabela/campo novo,
não é necessário `prisma db push` só por causa deste fix.
