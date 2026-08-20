# ONZEUP v1.4.3 — Testers Release

## O que esta versão fecha

### Player
- atleta com ou sem clube pode criar perfil;
- uso do mesmo e-mail do responsável para encontrar cadastro feito por clube;
- vínculo continua dependendo de confirmação;
- múltiplos clubes/modalidades permanecem suportados;
- depoimento real do Gustavo G9 na landing.

### Coach
- perfil público vira microsite profissional;
- foto e capa editáveis;
- experiência, clubes, licenças, formação, idiomas, metodologia, conquistas, vídeo e contatos;
- treinador nunca compartilha login do Club;
- clube pode cadastrar e-mail do treinador antes de ele criar Coach;
- Coach criado depois com o mesmo e-mail encontra o vínculo;
- botão "Buscar vínculos com clubes";
- solicitações do Coach aguardam aprovação do clube;
- convites do Club aguardam aceite do Coach;
- vários clubes/categorias/modalidades por Coach.

### Club
- comissão guarda e-mail usado para futuro vínculo Coach;
- gestor aprova ou recusa solicitação iniciada pelo Coach;
- depoimento real do Julio na landing.

### Visual
- correção do contraste do FAQ;
- perguntas brancas e respostas em cinza claro nos cards escuros.

## Aplicação

Extraia o ZIP na raiz do projeto, substituindo os arquivos.

Depois:

```cmd
cd C:\Users\User\Documents\onzeup
APLICAR_V143.cmd
npx prisma validate
npx prisma db push
npx prisma generate
npm run build
```

Se tudo passar:

```cmd
git add .
git commit -m "ONZEUP v1.4.3 - testers release"
git push origin main
```

## Teste Coach ↔ Club

1. No Club, cadastre um membro em Comissão e informe o e-mail que o treinador usará.
2. O treinador cria o Coach com exatamente o mesmo e-mail.
3. No dashboard Coach, clicar em "Buscar vínculos com clubes".
4. No Club, abrir Comissão e aprovar a solicitação.
5. Voltar ao Coach e confirmar vínculo ativo.
6. Validar acesso a jogos/convocações conforme permissão.

## Teste de site Coach

1. Coach > Editar meu perfil.
2. Enviar foto e capa.
3. Preencher experiência, clubes, formação, licenças, metodologia e contatos.
4. Marcar "Publicar meu site profissional".
5. Abrir "Ver site".

## Teste de edição da comissão

Edite um membro já cadastrado e confirme que e-mail do Coach, modalidade e permissão de convocação permanecem salvos.
