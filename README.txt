ONZEUP v1.6.0-b.2

Correção pontual após validação da cortesia no Super Admin.

ALTERAÇÕES
- Dashboard passa a ler Organization.accessStatus.
- Quando COMPLIMENTARY, exibe "Plano ... — Cortesia".
- Exibe "Sem cobrança durante a cortesia".
- Exibe data final e motivo quando cadastrados.
- Botão passa a "Ver acesso e planos".
- Mantém comportamento normal para assinaturas pagas/trial.
- Não altera Prisma nem banco.

COMO USAR
1. Extraia esta pasta FORA de C:\Users\User\Documents\onzeup.
2. Execute APLICAR_V160B2.cmd.
3. Aguarde o npm run build.
4. Se passar, execute npm run dev e teste Dashboard + Assinatura.
5. Não faça git push antes do teste visual.
