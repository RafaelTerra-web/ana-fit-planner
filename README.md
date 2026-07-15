# Ana Fit Planner

PWA mobile-first para acompanhar treino, dieta, cardio, hábitos e progresso corporal durante um cutting sustentável.

## Experiência de treino

- Sessões datadas: o treino de hoje não sobrescreve a sessão anterior.
- Registro individual por série com carga, repetições, RIR e conclusão.
- Séries extras, cópia da série anterior, referência da última sessão e notas por exercício.
- Timer de descanso iniciado ao concluir uma série.
- Feedback de progressão baseado no conjunto das séries, não em um único valor agregado.
- Editor de split, treinos, exercícios, ordem, músculos-alvo e número de séries em **Gerenciar plano**.
- Migração automática dos dados locais `v4` para `v5`; cargas antigas entram como referência, sem inventar histórico ou XP.

## Ranks

A jornada possui 24 níveis: três divisões (`III → II → I`) em cada um dos oito ranks:

| Rank | Divisão III | Divisão II | Divisão I |
| --- | ---: | ---: | ---: |
| Ferro | 0 XP | 300 XP | 700 XP |
| Bronze | 1.200 XP | 1.800 XP | 2.500 XP |
| Prata | 3.300 XP | 4.200 XP | 5.200 XP |
| Ouro | 6.300 XP | 7.500 XP | 8.800 XP |
| Platina | 10.200 XP | 11.700 XP | 13.300 XP |
| Diamante | 15.000 XP | 16.800 XP | 18.700 XP |
| Elite | 20.700 XP | 22.800 XP | 25.000 XP |
| Olympia | 27.500 XP | 30.500 XP | 34.000 XP |

### Critério de XP

- Treino finalizado com ao menos 60% das séries planejadas: **60 a 100 XP**, proporcional à conclusão.
- Cardio programado concluído: **35 XP por dia**.
- Pelo menos 80% das refeições marcadas: **30 XP por dia**.
- Meta de água: **10 XP por dia**.
- Meta de passos: **10 XP por dia**.
- Check-in de progresso válido: **40 XP por semana**.

O sistema premia consistência e não concede XP por perder peso, reduzir medidas ou aumentar carga. Eventos possuem IDs determinísticos; marcar e desmarcar uma ação não duplica pontos.

Treinos, cardio, nutrição e check-ins são atividades centrais. Cada nova atividade central concede **14 dias de proteção**. Depois disso, o ledger registra uma perda semanal de **2% do XP atual**, com mínimo de **50 XP**, máximo de **300 XP** e sem deixar o total negativo. A perda pode rebaixar divisão ou rank. Água e passos continuam concedendo XP, mas não reiniciam a proteção de inatividade.

Em uma rotina completa de quatro treinos, três cardios, hábitos diários e um check-in semanal, o teto é próximo de 895 XP por semana. Assim, Olympia III exige cerca de 38 semanas de consistência máxima e normalmente leva mais tempo.

## Instalar

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Validar

```bash
npm run lint
npm run build
```

## Deploy no Netlify

Crie um novo site apontando para esta pasta e use:

- Build command: `npm run build`
- Publish directory: `dist`

O `netlify.toml` já configura a aplicação como SPA.

## Login e sincronização Supabase

O app usa autenticação por e-mail e senha e mantém a sessão salva por padrão. Em **Ajustes**, a usuária pode optar por esquecer o login depois de 7, 30 ou 90 dias sem uso. O perfil, treinos, séries, dieta, progresso e rank ficam no `localStorage` como cache offline e na tabela `user_app_data` como cópia vinculada à conta.

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor.
2. Em **Authentication > URL Configuration**, defina `https://anfit.netlify.app` como Site URL e Redirect URL.
3. Desative novos cadastros públicos em **Authentication > Providers > Email**; o app usa apenas convite administrativo.
4. Em **Authentication > Sessions**, mantenha Time-box e Inactivity timeout desativados; o app controla localmente a opção de 7, 30 ou 90 dias sem uso.
5. Configure no Netlify: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. Para convidar a Ana no primeiro acesso, execute localmente com `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ANA_EMAIL` e `SUPABASE_REDIRECT_URL` no ambiente:

```bash
npm run invite:ana
```

A chave secreta é usada somente pelo script administrativo e nunca deve receber o prefixo `VITE_`. O convite marca a conta com `force_password_change`; ao abrir o link, a usuária precisa criar uma nova senha antes que o app leia ou sincronize os dados do aparelho.

No primeiro acesso feito pelo próprio iPhone, se ainda não houver dados na nuvem, a cópia `v5` (ou a antiga `v4`) do aparelho é enviada automaticamente. Se a nuvem já tiver dados, ela é restaurada antes da abertura do aplicativo.

Para notificações push no iPhone, configure:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

No iPhone, o app precisa estar adicionado à Tela de Início e aberto pelo ícone instalado.

## Dados locais

Perfil, plano, refeições, sessões, rank e progresso são salvos no `localStorage`. A chave atual é `ana-fit-planner:data:v5`; a chave `v4` é mantida intacta como origem de migração.
