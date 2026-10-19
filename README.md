# SnagMap (beta)

App para os alunos do curso **Do Japão para o Mundo**:

- **Buscar** (aberto a todos): preços online no 楽天市場 e lojas físicas num raio de 0 a 40 km (Google Maps + lojas cadastradas pelos alunos).
- **Ofertas dos alunos**: o aluno compartilha uma oferta que encontrou, com foto da etiqueta. Pode liberar na hora ou em 12/24 h. A oferta expira em 48 h e os outros confirmam com "ainda vale / acabou".
- **Achados**: os alunos cadastram **lojas** que não aparecem na busca e **produtos novos** que valem a pena revender. Dá para pôr foto e marcar como "útil". As lojas cadastradas também aparecem na aba Buscar.
- **Comunidade**: um **mural** onde os alunos postam texto e fotos, e a lista de **pessoas**, com categorias, província e a opção "compro para outros" com taxa (% ou valor fixo).
- **Mensagens**: só abrem depois que a pessoa aceita a solicitação. Dá para mandar fotos, e tem botão de denunciar. As fotos do chat só são vistas pelas duas pessoas da conversa.
- **Admin**: liberar e remover e-mails de alunos e ver denúncias.

Tecnologia: Next.js (hospedado na Vercel) + Supabase (login, banco, fotos, chat em tempo real) + Google Places API + Rakuten Ichiba API.

---

## Como colocar no ar (uma vez só)

### 1. Banco de dados (Supabase)
1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   - A última linha libera `kinoshita.lu10@gmail.com` como administrador. Se você for usar outro e-mail no app, troque antes de rodar.
3. **Authentication → URL Configuration**
   - *Site URL*: `https://searchup.vercel.app` (ou o endereço que a Vercel der)
   - *Redirect URLs*: adicione o mesmo endereço
4. **Authentication → Email Templates → Magic Link**: troque o texto do e-mail por algo assim, para o aluno receber um código:
   ```
   <h2>Seu código do SnagMap</h2>
   <p>Digite este código no app: <b>{{ .Token }}</b></p>
   <p>Ou clique: <a href="{{ .ConfirmationURL }}">entrar no SnagMap</a></p>
   ```

> O e-mail padrão do Supabase envia poucos e-mails por hora. Para o beta com poucos alunos é suficiente. Para abrir para todos, configure um SMTP próprio em *Authentication → SMTP Settings* (ex.: Resend, SendGrid).

### 2. Google Maps (lojas no raio)
1. Entre em https://console.cloud.google.com/ e crie um projeto chamado `searchup`. Vai pedir um cartão para ativar a cobrança; o uso do beta fica dentro da cota grátis.
2. Ative a API **Places API (New)**.
3. Crie uma **chave de API** e, nas restrições da chave, permita só a **Places API (New)**.
4. **O limite diário já vem no app**: ele faz no máximo **150 buscas de lojas por dia** (≈4.500 por mês, abaixo das 5.000 grátis do Google). Quando o limite acaba, o app avisa e continua mostrando as lojas cadastradas pelos alunos. Para mudar o número, crie a variável `GOOGLE_DAILY_LIMIT` na Vercel.
5. Por segurança, crie também um alerta de orçamento de ¥100 em *Billing → Budgets & alerts*. Assim você recebe um e-mail se algo sair do normal.

### 3. Hospedagem (Vercel)
1. Na Vercel: **Add New → Project** → importe o repositório `searchup` do GitHub.
2. Antes de clicar em Deploy, abra **Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://znacgonsmnzcotirmbfm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave *anon / publishable* do Supabase |
| `GOOGLE_MAPS_API_KEY` | chave de API do Google — **secreta** |
| `RAKUTEN_APP_ID` | Application ID do Rakuten |
| `RAKUTEN_ACCESS_KEY` | Access Key do Rakuten (`pk_...`) — **secreta** |
| `SITE_URL` | `https://searchup.vercel.app` (o endereço final do site) |
| `YAHOO_CLIENT_ID` | opcional; deixe sem se não tiver conta no Yahoo |

3. Clique em **Deploy**.

### 4. Ajustes finais
- **Rakuten** → seu app → *Allowed websites*: coloque o domínio real (ex.: `searchup.vercel.app`, sem `https://`).
- Se o endereço da Vercel for diferente de `searchup.vercel.app`, atualize `SITE_URL` na Vercel e a *Site URL* no Supabase.

### 5. Liberar alunos
Entre no app com o seu e-mail → aba **Admin** → cole os e-mails dos alunos → **Liberar acesso**.

---

## Instalar no celular
- **iPhone (Safari)**: Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome)**: menu ⋮ → *Instalar app*.

## Rodar no computador (opcional, para desenvolvedores)
```
cp .env.example .env.local   # preencha os valores
npm install
npm run dev
```

## Segurança e regras
- As chaves do Google e do Rakuten ficam só no servidor (rotas `app/api/*`).
- O banco usa *Row Level Security*: só alunos liberados veem ofertas, achados, mural, perfis e fotos. Mensagens e fotos do chat só são visíveis para as duas pessoas da conversa. O e-mail dos alunos nunca aparece para outros alunos.
- Os resultados do Google não são guardados no servidor (regra do Google). O app mostra a indicação "Google Maps" junto das lojas, como o Google exige.
- Nunca coloque a chave `service_role` do Supabase no app nem na Vercel.
