# Diagnóstico de e-mail v1.3.9.3

Após deploy abra:
https://www.onzeup.com.br/api/email-diagnostico

Esperado:
{
  "resendApiKeyPresent": true,
  "resendFromEmailPresent": true,
  "appUrlPresent": true,
  "nodeEnv": "production"
}

A rota NÃO mostra valores secretos.

Depois clique "Reenviar e-mail de ativação" ou "Enviar link de recuperação".

Nos logs da Vercel procure:
- RESEND_SEND_ATTEMPT
- RESEND_CONFIG_MISSING
- RESEND_SEND_ERROR
- RESEND_NETWORK_ERROR
