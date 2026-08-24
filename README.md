# ONZEUP v1.7.0-a — Asaas recorrência + tolerância de 10 dias

## Regra implementada

- Player Premium: continua Premium até 10 dias após o vencimento; depois passa para Free.
- Club: continua acessível até 10 dias após o vencimento; depois o painel é bloqueado.
- Pagamento confirmado depois do atraso reativa Premium/Club automaticamente.
- Cancelamento da assinatura: Player volta para Free; Club fica bloqueado.
- Cortesia manual do Super Admin continua prevalecendo no Club.
- Nenhum dado do clube ou do atleta é apagado.

## Correções técnicas

- Webhook passa a tratar PAYMENT_OVERDUE, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, SUBSCRIPTION_INACTIVATED e SUBSCRIPTION_DELETED.
- Pagamentos recorrentes são idempotentes por `payment.id`, evitando somar dois meses quando o Asaas envia CONFIRMED e depois RECEIVED para a mesma cobrança.
- A cobrança recorrente continua sendo localizada pelo `subscriptionId` armazenado no pagamento inicial.
- Player não confia mais no campo `plan` enviado pelo formulário para liberar funcionalidades Premium.
- Expiração do Player é reconciliada ao abrir portal, perfil público ou catálogo.
- Club verifica `Subscription.status/currentPeriodEnd` no acesso e só bloqueia depois da tolerância.

## Sem alteração de banco

Esta versão usa os campos já existentes: `premiumUntil`, `planStatus`, `Subscription.status` e `currentPeriodEnd`.

## Antes de produção

Depois de aplicar e validar o build, ainda falta configurar as variáveis reais da Vercel e o webhook de produção do Asaas. Não coloque chaves reais no código ou no Git.
