# Deploy de teste — OnzeUp v0.9.0

## 1. Banco
Criar banco PostgreSQL/Neon exclusivo da OnzeUp.

Adicionar:
```env
DATABASE_URL="..."
SESSION_SECRET="..."
NEXT_PUBLIC_APP_URL="..."
```

## 2. Instalação local
```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

## 3. Testar
- login coordenador
- login Super Admin
- categorias
- comissão
- atletas
- treinos
- jogos/resultados
- site público
- convocações
- financeiro
- integrações

## 4. Vercel
Importar o repositório novo da OnzeUp e cadastrar as variáveis de ambiente.

Build:
```bash
npm run build
```

## 5. Segurança
Antes de compartilhar o piloto:
- trocar senhas demo
- usar `SESSION_SECRET` forte
- não reutilizar banco do Clyra
- não conectar gateway ou WhatsApp real sem credenciais próprias da OnzeUp
