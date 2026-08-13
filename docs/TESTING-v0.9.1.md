# Teste v0.9.1

Após substituir a pasta do projeto, preserve seu `.env`.

```bash
npm install
npx prisma format
npx prisma validate
npx prisma db push
npm run db:seed
npm run build
npm run dev
```

Login responsável demo: `responsavel@onzeup.com.br` / `OnzeUp123!`.

Teste: Organização (cores, Pix e upload), Financeiro (baixa por Pix), Convocações (WhatsApp/copiar), QTR (gerar e editar), login responsável e Player público.

Nota: upload desta versão grava em `public/uploads`, adequado para teste local. Em Vercel, antes do piloto público, migrar para Cloudinary/S3/Supabase Storage porque o filesystem não é persistente.
