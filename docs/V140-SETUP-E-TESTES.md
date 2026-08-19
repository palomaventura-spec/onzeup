# ONZEUP v1.4.0 — setup e testes

## Banco
Esta versão adiciona `coverPosition` e `coverOverlay` em Organization.
Execute:
- npx prisma validate
- npx prisma generate
- npx prisma db push

## Vercel Blob — obrigatório para upload em produção
No projeto ONZEUP na Vercel:
1. Storage / Create Database / Blob
2. Crie um store PUBLIC e conecte ao projeto.
3. Para a versão atual do SDK, confirme que a Environment Variable `BLOB_READ_WRITE_TOKEN` foi adicionada a Production.
4. Faça Redeploy após conectar o store.

O upload local continua usando `public/uploads`.

## Testes
1. Site e Configurações > Logo: enviar PNG/JPEG/WEBP de até 4 MB.
2. Confirmar preview e mensagem de sucesso.
3. Salvar e abrir o site público.
4. Repetir com Capa.
5. Alterar posição da capa e escurecimento; salvar e conferir Hero.
6. Cadastrar 3+ jogos futuros.
7. Site público: carrossel deve mostrar 1 card por vez.
8. Mobile: arrastar lateralmente.
9. Desktop: testar setas e bolinhas.
10. Abrir “Ver todos os jogos”.
11. Conferir próximos jogos e resultados na página pública.
