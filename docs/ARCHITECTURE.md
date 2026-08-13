# Arquitetura

A OnzeUp é multi-tenant. Cada registro de negócio pertence a uma `Organization`.

Entidades principais:
- Organization
- User
- Session
- Category
- StaffMember
- Athlete
- TrainingSchedule
- Match
- Subscription

Princípio de segurança: todo acesso de coordenador deve filtrar por `organizationId`.
