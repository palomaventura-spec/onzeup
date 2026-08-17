# Testes v1.3.9.1 — E-mail

## Antes
Confirme na Vercel:
- RESEND_API_KEY
- RESEND_FROM_EMAIL=ONZEUP <nao-responda@onzeup.com.br>
- NEXT_PUBLIC_APP_URL=https://www.onzeup.com.br

Opcional:
- RESEND_REPLY_TO=onzeupfutebolbase@gmail.com

## Teste cadastro Player
1. Use um e-mail novo.
2. Clique "Criar conta grátis".
3. O botão deve mostrar "Criando conta e enviando e-mail..."
4. A tela deve informar "E-mail enviado".
5. Resend > Emails deve mostrar a mensagem.
6. O destinatário deve receber "Confirme seu e-mail — ONZEUP Player".
7. Clicar "Ativar minha conta".
8. Deve abrir /login?verificacao=ok.
9. Login deve funcionar.

## Teste reenvio
1. Cadastre uma conta e não clique no primeiro e-mail.
2. Use "Reenviar e-mail de ativação".
3. Um novo e-mail deve aparecer no Resend.
4. O link antigo deixa de ser válido.
5. O novo link deve ativar a conta.

## Teste recuperação
1. /esqueci-senha
2. Informe e-mail cadastrado.
3. Resend deve mostrar "Redefinição de senha — ONZEUP".
4. Clique no link.
5. Crie nova senha.
6. Faça login.

## Teste erro
Se o Resend retornar erro, a tela deve mostrar erro de envio; não deve afirmar que enviou.
