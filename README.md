# Studio Janiquelen Alves — Sistema de Agendamento

App Next.js com agenda real (cliente + admin), preparado para **Supabase**.

## 1. Rodar agora (sem Supabase)

Funciona com **localStorage** (mesmo navegador):

```bash
npm install
npm run dev
```

- Site: http://localhost:3000  
- Admin: cadeado 🔒 → senha **9415**

Cliente e admin compartilham a mesma agenda no navegador.

## 2. Ligar o Supabase (produção / multi-dispositivo)

### A. Criar projeto
1. https://supabase.com → New project  
2. SQL Editor → cole `supabase/schema.sql` → Run  

### B. Chaves
Settings → API:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY`

### C. Arquivo `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PIN=9415
```

### D. Reiniciar

```bash
npm run dev
```

Confira: http://localhost:3000/api/health  
Deve mostrar `"mode": "supabase"` e `"connected": true`.

## Funcionalidades

### Já no app
- Agendamento mobile em etapas + resumo fixo
- Só horários livres (duração, almoço, passado, conflitos)
- 2 profissionais com cores e agendas separadas
- Bloqueio automático ao marcar
- Admin: dashboard, agenda clicável (tipo Google), cancelar com motivo
- CRUD serviços em modal (sem prompt)
- Ativar/desativar profissionais
- Clientes + busca + contagem de atendimentos
- Cadeado 🔒 senha 9415
- Schema completo no SQL: lista de espera, pagamentos, bloqueios, lembretes, buffer

### Tabelas prontas no SQL (próximas telas)
- `waitlist` — lista de espera  
- `blocked_slots` — folga/férias/bloqueio  
- `reminders` — fila de WhatsApp  
- `payment_status` / `payment_method` em `bookings`  
- `professional_hours` — horário individual  
- `service_professionals` — quem faz o quê  

## Deploy Vercel

1. Suba o repo  
2. Cole as env vars  
3. Deploy  

## Senha admin

Padrão: **9415** (variável `ADMIN_PIN`)
