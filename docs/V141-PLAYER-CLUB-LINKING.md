# ONZEUP v1.4.1 — Player ↔ Club Linking

Fluxo:
1. Clube cadastra atleta com e-mail do responsável.
2. Responsável cria ONZEUP Player com o mesmo e-mail.
3. No Player, clica "Buscar vínculos com clubes".
4. O sistema procura atletas ativos com o mesmo e-mail.
5. Também confere se nome/apelido corresponde ao perfil selecionado.
6. Se houver correspondência, cria vínculo pendente.
7. Clube revisa em /vinculos-player.
8. Clube confirma ou recusa.
9. Apenas vínculos confirmados liberam convocações no Player.

Segurança:
O mesmo e-mail sozinho nunca vincula automaticamente um atleta.
Isso evita associar irmãos ou outros atletas da mesma família ao perfil errado.
