# Ana Fit Planner

PWA mobile-first para a Ana acompanhar dieta de cutting, treino com foco em glúteos, cardio e progresso corporal.

## Instalar

```bash
npm install
```

## Rodar localmente

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy no Netlify

Crie um novo site apontando para esta pasta e use:

- Build command: `npm run build`
- Publish directory: `dist`

O arquivo `netlify.toml` já deixa o app pronto para SPA.

Para notificações push no iPhone, configure estas variáveis no Netlify:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

No iPhone, o app precisa estar adicionado à Tela de Início e aberto pelo ícone instalado.

## Arquivos principais

- `src/App.tsx`: estado principal, navegacao e persistencia local.
- `src/pages/Today.tsx`: tela inicial com escolha simples entre treino e dieta.
- `src/pages/Workout.tsx`: rotina semanal, exercícios e registro de carga/reps.
- `src/pages/Diet.tsx`: metas, refeições calculadas e sugestões.
- `src/pages/Progress.tsx`: peso, medidas, cargas, fotos locais e graficos.
- `src/pages/Settings.tsx`: perfil, metas, alimentos e tema.
- `src/data/workoutPlan.ts`: plano semanal de treino.
- `src/data/dietPlan.ts`: perfil, metas e refeições iniciais.

## Editar treino e dieta

Para mudar treino, edite `src/data/workoutPlan.ts`.

Para mudar refeições, metas iniciais ou perfil da Ana, edite `src/data/dietPlan.ts`.

Os ajustes feitos dentro do app ficam salvos no `localStorage` do navegador.
