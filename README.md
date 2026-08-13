# ONZEUP v0.9.4.0 — Pilot Ready

Etapa de consolidação para publicação do ambiente de demonstração.

## Principais mudanças
- uploads preparados para Vercel Blob em produção
- fallback de upload local apenas em desenvolvimento
- feedback visual de upload
- confirmação global antes de ações destrutivas
- proteção de navegação entre perfis Clube / Família / Super Admin
- nova tela `Piloto` com checklist operacional e técnico
- revisão responsiva do painel para celular
- `.env.example` com variáveis necessárias ao deploy
- preservação da Demo Experience e do ONZE Player premium

## Para testar localmente

```bash
npm install
npx prisma format
npx prisma validate
npx prisma generate
npm run build
npm run dev
```

Não há alteração de schema nesta versão em relação à v0.9.3.5.

## Para o deploy
No Vercel configurar:
- `DATABASE_URL`
- `SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Depois validar `/piloto` antes de apontar o domínio.
