# espaço · coworking app

Web app completo para gestão de salas de coworking.  
Stack: **Next.js 14** + **Supabase** + **Recharts** + **Tailwind CSS**

---

## ✅ Funcionalidades

- Calendário semanal com visão de todas as salas
- Nova reserva com **detecção automática de conflito**
- Alertas de lembrete configuráveis (15min, 30min, 1h, 1 dia)
- Exportação para **Google Calendar**, **Apple Calendar** e **.ics**
- Lista de reservas com filtros e exportação CSV
- Painel de relatórios com gráficos de ocupação
- Status das salas em tempo real
- Autenticação com e-mail/senha (Supabase Auth)
- Responsivo — funciona no celular e desktop

---

## 🚀 Como configurar (passo a passo)

### 1. Criar conta no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**
2. Crie uma conta com Google ou e-mail
3. Clique em **New project**
4. Preencha:
   - **Name**: coworking-app (ou o nome do seu espaço)
   - **Database Password**: anote esta senha
   - **Region**: South America (São Paulo)
5. Aguarde ~2 minutos para o projeto ser criado

### 2. Configurar o banco de dados

1. No painel do Supabase, acesse **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Copie TODO o conteúdo do arquivo `supabase-schema.sql`
4. Cole no editor e clique em **Run**
5. Deve aparecer: *Success. No rows returned*

### 3. Obter as credenciais

1. No Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** → é o `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → é o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Configurar o projeto local

```bash
# Clone ou baixe o projeto, depois entre na pasta
cd coworking-app

# Copie o arquivo de variáveis de ambiente
cp .env.local.example .env.local

# Abra .env.local e cole suas credenciais do Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Instale as dependências
npm install

# Rode em modo desenvolvimento
npm run dev
```

Acesse **http://localhost:3000** no navegador.

### 5. Publicar na internet (Vercel — gratuito)

1. Acesse [vercel.com](https://vercel.com) e crie conta com GitHub
2. Suba o código para um repositório GitHub:
   ```bash
   git init
   git add .
   git commit -m "primeiro commit"
   git remote add origin https://github.com/SEU_USUARIO/coworking-app.git
   git push -u origin main
   ```
3. No Vercel, clique em **Add New Project**
4. Importe o repositório do GitHub
5. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → chave anon
6. Clique em **Deploy**

Pronto! O app estará disponível em `https://seu-app.vercel.app`

---

## 📧 Configurar alertas por e-mail (opcional)

O Supabase tem um sistema de Edge Functions para disparar e-mails.

### Opção A: Resend (recomendado, gratuito até 3.000 e-mails/mês)

1. Crie conta em [resend.com](https://resend.com)
2. Gere uma API Key
3. No Supabase, vá em **Edge Functions** e crie uma função chamada `send-booking-alert`
4. Use o código abaixo:

```typescript
// supabase/functions/send-booking-alert/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { email, name, room, date, start, end, title } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'coworking@seudominio.com',
      to: email,
      subject: `Lembrete: ${title} em ${room}`,
      html: `
        <h2>Olá, ${name}!</h2>
        <p>Lembrete da sua reserva:</p>
        <ul>
          <li><strong>Sala:</strong> ${room}</li>
          <li><strong>Data:</strong> ${date}</li>
          <li><strong>Horário:</strong> ${start} – ${end}</li>
          <li><strong>Pauta:</strong> ${title}</li>
        </ul>
      `,
    }),
  })

  return new Response(JSON.stringify({ ok: res.ok }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

5. Configure o secret `RESEND_API_KEY` no Supabase → **Settings → Edge Functions → Secrets**

---

## 🗂️ Estrutura do projeto

```
coworking-app/
├── app/
│   ├── layout.tsx          # Layout raiz + fontes
│   ├── globals.css         # Design system / variáveis
│   ├── page.tsx            # Redirect → /dashboard
│   ├── login/page.tsx      # Autenticação
│   ├── dashboard/page.tsx  # Calendário semanal
│   ├── book/page.tsx       # Nova reserva
│   ├── bookings/page.tsx   # Lista de reservas
│   ├── reports/page.tsx    # Relatórios e gráficos
│   └── rooms/page.tsx      # Status das salas
├── components/
│   └── AppShell.tsx        # Sidebar + layout base
├── lib/
│   └── supabase.ts         # Client + todas as queries
├── types/
│   └── index.ts            # Tipos TypeScript
├── supabase-schema.sql     # Schema completo do banco
├── .env.local.example      # Variáveis de ambiente
└── package.json
```

---

## 🔧 Personalização rápida

### Adicionar uma sala nova
No Supabase → **Table Editor → rooms**, clique em **Insert row** e preencha os campos.

### Mudar as cores das salas
Na tabela `rooms`, edite o campo `color` com qualquer cor hex.

### Tornar um usuário admin
Na tabela `profiles`, edite o campo `role` de `member` para `admin`.

### Adicionar mais opções de horário
Em `app/book/page.tsx`, ajuste o array `TIMES` para incluir os horários desejados.

---

## 📊 Banco de dados — tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `rooms` | Salas cadastradas |
| `profiles` | Perfis dos usuários |
| `bookings` | Reservas (com status) |
| `booking_stats` | View para relatórios |

Função SQL `check_booking_conflict()` garante que conflitos sejam detectados no banco, mesmo se dois usuários tentarem reservar ao mesmo tempo.

---

## 💰 Custos estimados

| Serviço | Plano gratuito | Quando pagar |
|---------|---------------|--------------|
| Supabase | 500MB DB, 50.000 usuários | Crescimento grande |
| Vercel | Projetos ilimitados | Alto tráfego |
| Resend | 3.000 e-mails/mês | Volume maior |
| **Total inicial** | **R$ 0/mês** | — |
"# salasarace" 
