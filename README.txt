ONZEUP v1.7.1-b — Super Admin / gestão de inativos

Inclui:
- Players: filtro, desativar, reativar e excluir somente quando INACTIVE.
- Ao desativar Player: sai do catálogo, fica privado e perde destaque.
- Exclusão de Player preserva histórico Payment via playerId SetNull conforme schema.
- Organizações: filtro por status, desativar, reativar e excluir somente inativas.
- Exclusão de organização é bloqueada se houver Payment PAID ou Charge PAID.
- Confirmação obrigatória antes de desativar/excluir.
- Nenhuma alteração de schema Prisma.
- Nenhuma alteração no Asaas/webhook/checkout.

Aplicar fora da pasta do projeto executando APLICAR_V171B.cmd.
