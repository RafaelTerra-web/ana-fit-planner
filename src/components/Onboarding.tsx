import {
  Apple,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Beef,
  Check,
  Dumbbell,
  Gauge,
  HeartPulse,
  Leaf,
  LoaderCircle,
  Salad,
  Scale,
  Sparkles,
  Target,
  Utensils,
  Waves,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { EatingStyle, FitnessObjective, Profile } from '../types';

export type OnboardingProfile = Pick<
  Profile,
  'name' | 'weightKg' | 'heightCm' | 'preferredFoods' | 'avoidedFoods'
> & {
  age: number;
  objective: FitnessObjective;
  eatingStyle: EatingStyle;
  mealsPerDay: 3 | 4 | 5 | 6;
};

type OnboardingProps = {
  profile: Profile;
  onComplete: (profile: OnboardingProfile) => Promise<void>;
};

const objectiveOptions: Array<{
  value: FitnessObjective;
  label: string;
  description: string;
  icon: typeof Target;
}> = [
  {
    value: 'body-recomposition',
    label: 'Recomposição',
    description: 'Reduzir gordura e construir massa magra.',
    icon: Sparkles,
  },
  {
    value: 'fat-loss',
    label: 'Perder gordura',
    description: 'Emagrecer preservando força e massa magra.',
    icon: Gauge,
  },
  {
    value: 'muscle-gain',
    label: 'Ganhar massa',
    description: 'Priorizar hipertrofia e evolução de cargas.',
    icon: Dumbbell,
  },
  {
    value: 'performance',
    label: 'Performance',
    description: 'Treinar melhor, ganhar força e condicionamento.',
    icon: HeartPulse,
  },
];

const eatingStyleOptions: Array<{
  value: EatingStyle;
  label: string;
  icon: typeof Beef;
}> = [
  { value: 'omnivore', label: 'Onívora', icon: Beef },
  { value: 'flexitarian', label: 'Flexitariana', icon: Salad },
  { value: 'vegetarian', label: 'Vegetariana', icon: Leaf },
  { value: 'vegan', label: 'Vegana', icon: Apple },
  { value: 'pescatarian', label: 'Pescetariana', icon: Waves },
];

const steps = ['Objetivo', 'Medidas', 'Alimentação'] as const;

function parseFoodList(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = item.toLocaleLowerCase('pt-BR');
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function Onboarding({ profile, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name === 'Atleta' ? '' : profile.name);
  const [objective, setObjective] = useState<FitnessObjective | null>(profile.objective ?? null);
  const [age, setAge] = useState(profile.age && profile.age > 0 ? String(profile.age) : '');
  const [weight, setWeight] = useState(profile.weightKg > 0 ? String(profile.weightKg) : '');
  const [height, setHeight] = useState(profile.heightCm > 0 ? String(profile.heightCm) : '');
  const [eatingStyle, setEatingStyle] = useState<EatingStyle>(profile.eatingStyle ?? 'omnivore');
  const [mealsPerDay, setMealsPerDay] = useState<3 | 4 | 5 | 6>(profile.mealsPerDay ?? 4);
  const [preferredFoods, setPreferredFoods] = useState(profile.preferredFoods.join(', '));
  const [avoidedFoods, setAvoidedFoods] = useState(profile.avoidedFoods.join(', '));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const ageValue = Number(age);
  const isMinor = Number.isFinite(ageValue) && ageValue > 0 && ageValue < 18;

  const validateCurrentStep = () => {
    if (step === 0) {
      if (name.trim().replace(/\s+/g, ' ').length < 2) return 'Informe o nome que você quer usar no app.';
      if (!objective) return 'Escolha o objetivo que mais combina com você agora.';
    }

    if (step === 1) {
      if (!Number.isInteger(ageValue) || ageValue < 13 || ageValue > 100) {
        return 'Informe uma idade entre 13 e 100 anos.';
      }
      const weightValue = Number(weight.replace(',', '.'));
      const heightValue = Number(height.replace(',', '.'));
      if (!Number.isFinite(weightValue) || weightValue < 35 || weightValue > 300) {
        return 'Informe um peso entre 35 e 300 kg.';
      }
      if (!Number.isFinite(heightValue) || heightValue < 120 || heightValue > 230) {
        return 'Informe uma altura entre 120 e 230 cm.';
      }
    }

    return '';
  };

  const advance = () => {
    const validationMessage = validateCurrentStep();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setMessage('');
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const finish = async () => {
    if (savingRef.current) return;
    if (!objective) {
      setStep(0);
      setMessage('Escolha o seu objetivo antes de continuar.');
      return;
    }

    const weightKg = Number(weight.replace(',', '.'));
    const heightCm = Number(height.replace(',', '.'));
    if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) {
      setStep(1);
      setMessage('Revise seu peso e sua altura.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setMessage('');
    try {
      await onComplete({
        name: name.trim().replace(/\s+/g, ' '),
        age: ageValue,
        objective,
        weightKg,
        heightCm,
        eatingStyle,
        mealsPerDay,
        preferredFoods: parseFoodList(preferredFoods),
        avoidedFoods: parseFoodList(avoidedFoods),
      });
      savingRef.current = false;
      setSaving(false);
    } catch {
      savingRef.current = false;
      setSaving(false);
      setMessage('Não foi possível salvar seu perfil na nuvem. Confira a conexão e tente novamente.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow--lime" aria-hidden="true" />
      <div className="auth-glow auth-glow--mint" aria-hidden="true" />

      <section className="premium-card my-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/75 shadow-2xl" aria-busy={saving}>
        <div className="border-b border-white/10 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-lime-200/20 bg-lime-300/10">
                <img className="h-9 w-9 rounded-xl" src="/pwa-icon.svg?v=2" alt="" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">Primeiros passos</p>
                <p className="truncate text-sm font-semibold text-slate-400">Seu Ana Fit, do seu jeito</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-extrabold text-slate-300">
              {step + 1} de {steps.length}
            </span>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`Etapa ${step + 1} de ${steps.length}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-300 to-teal-300 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[0.65rem] font-bold text-slate-500">
            {steps.map((label, index) => (
              <span className={index <= step ? 'text-lime-200' : undefined} key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          {step === 0 ? (
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-300/[0.07] px-3 py-1 text-xs font-extrabold text-lime-200">
                <Target size={14} aria-hidden="true" /> Comece pelo que importa
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">Vamos montar seu plano</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Conte quem você é e aonde quer chegar. Você poderá ajustar tudo depois.
              </p>

              <label className="mt-6 block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-name">
                <span>Como podemos chamar você?</span>
                <input
                  className="input"
                  id="onboarding-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(event) => { setName(event.target.value); setMessage(''); }}
                />
              </label>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-slate-200">Qual é seu objetivo principal?</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {objectiveOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = objective === option.value;
                    return (
                      <button
                        className={`flex min-h-[5.25rem] items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                          selected
                            ? 'border-lime-300/55 bg-lime-300/10 shadow-[0_0_24px_rgba(190,242,100,0.08)]'
                            : 'border-white/10 bg-white/[0.035] hover:border-white/20'
                        }`}
                        type="button"
                        key={option.value}
                        aria-pressed={selected}
                        onClick={() => { setObjective(option.value); setMessage(''); }}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selected ? 'bg-lime-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span>
                          <strong className="block text-sm font-extrabold text-white">{option.label}</strong>
                          <small className="mt-1 block text-xs font-medium leading-snug text-slate-400">{option.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/[0.07] px-3 py-1 text-xs font-extrabold text-teal-200">
                <Scale size={14} aria-hidden="true" /> Seu ponto de partida
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">Medidas para personalizar</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Usamos estes dados para estimar metas de proteína, água e energia de forma mais coerente.
              </p>

              <label className="mt-7 block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-age">
                <span>Idade</span>
                <span className="relative block">
                  <input
                    className="input pr-14"
                    id="onboarding-age"
                    inputMode="numeric"
                    placeholder="17"
                    value={age}
                    onChange={(event) => { setAge(event.target.value); setMessage(''); }}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-extrabold text-slate-500">anos</span>
                </span>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-weight">
                  <span>Peso atual</span>
                  <span className="relative block">
                    <input
                      className="input pr-11"
                      id="onboarding-weight"
                      inputMode="decimal"
                      placeholder="62"
                      value={weight}
                      onChange={(event) => { setWeight(event.target.value); setMessage(''); }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-extrabold text-slate-500">kg</span>
                  </span>
                </label>
                <label className="block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-height">
                  <span>Altura</span>
                  <span className="relative block">
                    <input
                      className="input pr-11"
                      id="onboarding-height"
                      inputMode="decimal"
                      placeholder="165"
                      value={height}
                      onChange={(event) => { setHeight(event.target.value); setMessage(''); }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-extrabold text-slate-500">cm</span>
                  </span>
                </label>
              </div>

              {isMinor ? (
                <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4" role="note">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20} aria-hidden="true" />
                  <p className="text-xs font-semibold leading-relaxed text-amber-100/85">
                    Como você tem menos de 18 anos, o Ana Fit não recomenda restrições agressivas. Faça mudanças na alimentação com acompanhamento de um responsável e de um profissional de saúde.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <HeartPulse className="mt-0.5 shrink-0 text-teal-300" size={20} aria-hidden="true" />
                <p className="text-xs font-medium leading-relaxed text-slate-400">
                  Estas estimativas servem como ponto de partida e não substituem acompanhamento profissional de saúde ou nutrição.
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-3 py-1 text-xs font-extrabold text-amber-200">
                <Utensils size={14} aria-hidden="true" /> Preferências reais
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">Uma dieta que cabe na rotina</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Quanto mais honesta for esta etapa, mais útil fica o planejamento alimentar.
              </p>

              <fieldset className="mt-6">
                <legend className="text-sm font-bold text-slate-200">Seu estilo alimentar</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {eatingStyleOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = eatingStyle === option.value;
                    return (
                      <button
                        className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-extrabold transition ${
                          selected ? 'border-amber-200/55 bg-amber-200/10 text-amber-100' : 'border-white/10 bg-white/[0.035] text-slate-400'
                        }`}
                        type="button"
                        key={option.value}
                        aria-pressed={selected}
                        onClick={() => setEatingStyle(option.value)}
                      >
                        <Icon size={19} aria-hidden="true" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold text-slate-200">Quantas refeições funcionam melhor?</legend>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {([3, 4, 5, 6] as const).map((amount) => (
                    <button
                      className={`rounded-xl border py-2.5 text-sm font-black transition ${
                        mealsPerDay === amount ? 'border-lime-300/55 bg-lime-300/10 text-lime-100' : 'border-white/10 bg-white/[0.035] text-slate-400'
                      }`}
                      type="button"
                      key={amount}
                      aria-pressed={mealsPerDay === amount}
                      onClick={() => setMealsPerDay(amount)}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-preferred-foods">
                  <span>Alimentos que você gosta <small className="font-medium text-slate-500">(opcional)</small></span>
                  <textarea
                    className="input min-h-24 resize-none text-sm"
                    id="onboarding-preferred-foods"
                    placeholder="Ex.: arroz, frango, banana"
                    value={preferredFoods}
                    onChange={(event) => setPreferredFoods(event.target.value)}
                  />
                </label>
                <label className="block space-y-2 text-sm font-bold text-slate-200" htmlFor="onboarding-avoided-foods">
                  <span>Não come ou precisa evitar <small className="font-medium text-slate-500">(opcional)</small></span>
                  <textarea
                    className="input min-h-24 resize-none text-sm"
                    id="onboarding-avoided-foods"
                    placeholder="Ex.: lactose, amendoim, peixe"
                    value={avoidedFoods}
                    onChange={(event) => setAvoidedFoods(event.target.value)}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">Separe os alimentos por vírgula. Inclua alergias e restrições no campo “evitar”.</p>
            </div>
          ) : null}

          {message ? (
            <p className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2.5 text-sm font-semibold text-rose-200" role="alert">
              {message}
            </p>
          ) : null}

          <div className="mt-7 grid grid-cols-[auto_1fr] gap-3 border-t border-white/10 pt-5">
            {step > 0 ? (
              <button className="secondary-button px-3" type="button" disabled={saving} onClick={() => { setStep((current) => current - 1); setMessage(''); }} aria-label="Voltar uma etapa">
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
            ) : <span />}
            {step < steps.length - 1 ? (
              <button className="primary-button w-full" type="button" onClick={advance}>
                Continuar <ArrowRight size={19} aria-hidden="true" />
              </button>
            ) : (
              <button className="primary-button w-full" type="button" disabled={saving} onClick={() => void finish()}>
                {saving ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : <Check size={19} aria-hidden="true" />}
                {saving ? 'Salvando...' : 'Salvar e começar'}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
