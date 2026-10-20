# Ana Fit Planner

PWA mobile-first para acompanhar treino, alimentação, cardio, hábitos e progresso corporal em perfis individuais.

## Atualização 1.2 · dentro da academia

- Tema escuro como padrão, com destaque mint, maior contraste e opção Claro/Escuro nos Ajustes. A escolha explícita fica salva por perfil; o claro imposto pela versão 1.1 passa para escuro uma única vez.
- Sessões em andamento abrem no modo academia: agenda, biblioteca e cardio recolhidos, progresso no topo, atalhos para séries pendentes e troca direta de exercício quando o aparelho estiver ocupado.
- Ajustes rápidos de carga (passos de 0,5/1/2,5/5 kg), repetições e botão de 0 kg para exercícios sem carga externa.
- Preenchimento opcional de séries vazias a partir da última sessão finalizada. Valores já digitados e séries concluídas são preservados; nenhuma série é marcada como feita automaticamente.
- Concluir uma série é uma ação única, protegida contra dois toques. Para alterar valores, use Corrigir. Essa ação também cancela o descanso da série correspondente.
- Descanso com −15 s, +30 s e Pular, persistência isolada por conta e contagem por horário absoluto. Cada alteração reagenda o alarme, até o limite de 10 minutos. Finalizar o treino encerra o descanso.
- Botão Manter tela acesa, com liberação ao sair do modo academia e nova solicitação ao retornar ao app. Depende do suporte e das condições de energia do aparelho; falhas mostram um aviso no próprio controle.

As sessões e os critérios de XP continuam iguais. As melhorias de retomada do descanso não alteram a autenticação: abrir uma conta do zero sem internet ainda pode exigir reconexão para validar a sessão.

## Atualização 1.1 · sua rotina, seu ritmo

- Interface clara com navegação fixa no celular e lateral no desktop.
- Início com agenda interativa, resumo real da semana, continuação de sessões e metas rápidas.
- Biblioteca de rotinas com busca por treino, exercício e músculo; editor acessível pelo botão Organizar.
- Catálogo inicial de 44 exercícios com filtros por músculo e equipamento, além de exercícios personalizados. As prescrições iniciais são editáveis.
- Registro por série com referência anterior, repetição de valores, validação de carga/repetições e descanso automático. Para exercícios sem carga externa, informe 0 kg.
- Resumo antes de finalizar: séries, duração, volume e elegibilidade para XP.
- Evolução com períodos de 7, 30, 90 e 365 dias, frequência, volume, duração, recordes de carga e histórico detalhado por exercício e sessão.
- Cardio com atividade, data, duração, distância opcional e observação; totais por período. Registrar o cardio programado para hoje marca a meta automaticamente e mantém o limite de XP diário.
- Exportação de cópia completa em JSON e das séries em CSV nos Ajustes.

Dados existentes continuam na estrutura v5 e na mesma conta. O campo opcional `cardioEntries` inicia vazio em cópias antigas. Histórico, plano nutricional atribuído, sincronização e critérios de XP são preservados. A duração mede o intervalo entre início e finalização, incluindo pausas; não estima tempo em atividade. Recordes comparam a maior carga externa de uma série válida e não são uma medida clínica de evolução.

O PWA mantém as notificações já existentes; esta atualização não adiciona Live Activities, HealthKit ou widgets nativos do iPhone.

## Experiência de treino

- Sessões datadas: o treino de hoje não sobrescreve a sessão anterior.
- Registro individual por série com carga, repetições, RIR e conclusão.
- Séries extras, cópia da série anterior, referência da última sessão e notas por exercício.
- Timer de descanso iniciado ao concluir uma série.
- Alarme global de descanso com som, aviso visual e vibração quando suportada. Com o PWA instalado e as notificações permitidas, um Web Push agendado avisa mesmo se o iPhone suspender o aplicativo.
- Feedback de progressão baseado no conjunto das séries, não em um único valor agregado.
- Editor de split, treinos, exercícios, ordem, músculos-alvo e número de séries em **Gerenciar plano**.
- Migração automática dos dados locais `v4` para `v5`; cargas antigas entram como referência, sem inventar histórico ou XP.

## Ranks

A jornada possui 24 níveis: três divisões (`I → II → III`) em cada um dos oito ranks:

| Rank | Divisão I | Divisão II | Divisão III |
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
npm test
npm run test:render
npm run build
```

Use Node.js 24 para desenvolvimento e testes. `npm test` verifica regras de domínio e interações React em DOM simulado, incluindo toque duplo, correção, ajustes rápidos, navegação, preferência de tema, trava de tela e ciclo de vida dos alarmes. `test:render` renderiza as cinco áreas com React no servidor, incluindo cenários com dados persistidos. Esses testes não substituem uma revisão visual em navegador ou as notificações em um dispositivo físico.

## Deploy no Netlify

Crie um novo site apontando para esta pasta e use:

- Build command: `npm run build`
- Publish directory: `dist`

O `netlify.toml` já configura a aplicação como SPA.

## Login e sincronização Supabase

O app aceita contas individuais por e-mail e senha e mantém a sessão salva por padrão. Em **Ajustes**, cada usuário pode optar por esquecer o login depois de 7, 30 ou 90 dias sem uso. Perfil, treinos, séries, dieta, progresso e rank ficam em um cache local separado por usuário e na tabela `anfit_user_app_data` como cópia vinculada à conta.

Novas contas passam por um onboarding de objetivo, medidas e preferências alimentares. Planos nutricionais individuais também podem ser atribuídos de forma administrativa: ficam vinculados à conta no Supabase e protegidos contra a sobrescrita por um cache antigo do aparelho.

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor.
2. Em **Authentication > URL Configuration**, defina `https://anfit.netlify.app` como Site URL e Redirect URL.
3. Em **Authentication > Providers > Email**, permita novos cadastros e mantenha a confirmação de e-mail habilitada. Em produção, configure também rate limit e CAPTCHA para reduzir abuso.
4. Em **Authentication > Sessions**, mantenha Time-box e Inactivity timeout desativados; o app controla localmente a opção de 7, 30 ou 90 dias sem uso.
5. Configure no Netlify: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. Opcionalmente, para manter o convite administrativo da conta legada da Ana, execute localmente com `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ANA_EMAIL` e `SUPABASE_REDIRECT_URL` no ambiente:

```bash
npm run invite:ana
```

A chave secreta é usada somente pelo script administrativo e nunca deve receber o prefixo `VITE_`. O convite marca a conta com `force_password_change`; ao abrir o link, a usuária precisa criar uma nova senha antes que o app leia ou sincronize os dados do aparelho.

Para atribuir um plano individual, mantenha o preset JSON fora do Git (a pasta `scripts/data/` é ignorada) e valide primeiro:

```bash
npm run assign:nutrition -- --plan-file scripts/data/plano.json --validate-only
```

O comando sem `--apply` faz apenas uma prévia e mostra os quatro valores de confirmação exigidos pela gravação. O script localiza uma única conta pelo parâmetro `--email`, mescla somente dieta, metas e preferências alimentares e verifica que treino, progresso, rank e histórico não mudaram.

No primeiro acesso feito pelo próprio iPhone, se ainda não houver dados na nuvem, a cópia `v5` (ou a antiga `v4`) do aparelho é enviada automaticamente. Se a nuvem já tiver dados, ela é restaurada antes da abertura do aplicativo.

Para notificações push no iPhone, configure:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

No iPhone, o app precisa estar adicionado à Tela de Início e aberto pelo ícone instalado.

## Dados locais

Perfil, plano, refeições, sessões, rank e progresso são salvos no `localStorage` em chaves vinculadas ao ID da conta. As chaves globais `ana-fit-planner:data:v5` e `v4` são tratadas apenas como origens legadas de migração e nunca são reivindicadas automaticamente por uma conta recém-criada no aplicativo.
