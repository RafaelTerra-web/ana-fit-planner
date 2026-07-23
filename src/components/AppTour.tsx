import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Dumbbell,
  Home,
  Settings,
  Sparkles,
  Trophy,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AppTab } from '../types';

type AppTourProps = {
  activeTab: AppTab;
  onClose: () => void;
  onTabChange: (tab: AppTab) => void;
};

type TourStep = {
  accent: string;
  description: string;
  icon: LucideIcon;
  id: string;
  tab?: AppTab;
  target: string;
  tip: string;
  title: string;
};

type TargetRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const ecosystemItems: Array<{ icon: LucideIcon; label: string; stepIndex: number; tab: AppTab }> = [
  { tab: 'today', label: 'Início', icon: Home, stepIndex: 1 },
  { tab: 'workout', label: 'Treino', icon: Dumbbell, stepIndex: 2 },
  { tab: 'diet', label: 'Dieta', icon: Utensils, stepIndex: 3 },
  { tab: 'progress', label: 'Progresso', icon: Activity, stepIndex: 4 },
  { tab: 'settings', label: 'Ajustes', icon: Settings, stepIndex: 5 },
];

const tourSteps: TourStep[] = [
  {
    id: 'ecosystem',
    target: 'bottom-nav',
    icon: Sparkles,
    accent: 'from-lime-300 to-emerald-300',
    title: 'Todo o AnFit em cinco áreas',
    description:
      'Esta barra é o mapa do aplicativo. O tour vai abrir cada área e mostrar, na própria tela, onde estão as funções importantes.',
    tip: 'Você pode tocar nos ícones deste guia para pular diretamente para uma área.',
  },
  {
    id: 'today',
    tab: 'today',
    target: 'today-plan',
    icon: Home,
    accent: 'from-rose-300 to-amber-200',
    title: 'Início: o que fazer hoje',
    description:
      'Aqui aparece o treino, cardio ou descanso programado. Logo abaixo ficam água, passos, refeições e outras ações rápidas que rendem XP.',
    tip: 'Comece o dia por esta tela. Ela transforma todo o seu planejamento em poucas ações.',
  },
  {
    id: 'workout',
    tab: 'workout',
    target: 'workout-session',
    icon: Dumbbell,
    accent: 'from-lime-300 to-emerald-300',
    title: 'Treino: execute uma série por vez',
    description:
      'Escolha o treino do dia, registre carga, repetições e RIR. Ao concluir uma série, o descanso inicia e avisa quando terminar.',
    tip: 'A edição do treino fica nos Ajustes; esta aba permanece limpa para usar durante a sessão.',
  },
  {
    id: 'diet',
    tab: 'diet',
    target: 'diet-meals',
    icon: Utensils,
    accent: 'from-teal-300 to-cyan-200',
    title: 'Dieta: refeições e porções',
    description:
      'Marque cada refeição concluída, abra os cartões para ver opções e ajuste as quantidades quando precisar adaptar uma porção.',
    tip: 'O dia de treino, cardio ou descanso muda automaticamente quais refeições são essenciais.',
  },
  {
    id: 'progress',
    tab: 'progress',
    target: 'progress-rank',
    icon: Trophy,
    accent: 'from-amber-300 to-orange-300',
    title: 'Progresso: XP, ranks e evolução',
    description:
      'Seu brasão, o caminho do Ferro I ao Olympia III e a barra de XP ficam aqui. Também é onde você registra peso, medidas, fotos e cargas.',
    tip: 'Consistência aumenta o rank. Longos períodos sem atividade podem reduzir XP.',
  },
  {
    id: 'workout-library',
    tab: 'settings',
    target: 'settings-workouts',
    icon: Dumbbell,
    accent: 'from-lime-300 to-emerald-300',
    title: 'Ajustes: crie e nomeie treinos',
    description:
      'Em Meus treinos você cria fichas, dá nomes fáceis de reconhecer e organiza exercícios, séries, repetições e descanso.',
    tip: 'Toque em qualquer treino para abrir o editor completo sem distrações.',
  },
  {
    id: 'week-plan',
    tab: 'settings',
    target: 'settings-week',
    icon: CalendarDays,
    accent: 'from-teal-300 to-cyan-200',
    title: 'Agenda: monte a sua semana',
    description:
      'Abra qualquer dia, de segunda a domingo, e escolha Treino, Cardio ou Descanso. Você pode repetir a mesma ficha em vários dias.',
    tip: 'A agenda também recalcula automaticamente a frequência usada nas sugestões do plano.',
  },
  {
    id: 'profile',
    tab: 'settings',
    target: 'settings-profile',
    icon: Cloud,
    accent: 'from-violet-300 to-fuchsia-300',
    title: 'Perfil e preferências',
    description:
      'Nesta parte você ajusta seus dados, objetivo e preferências. Na mesma aba ficam metas, notificações, conta e tempo para esquecer o login.',
    tip: 'Se a nuvem estiver ativa, o estado da sincronização aparece no topo dos Ajustes. Para rever este guia, toque em “Tour do app”.',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AppTour({ activeTab, onClose, onTabChange }: AppTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const initialTabRef = useRef(activeTab);
  const step = tourSteps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === tourSteps.length - 1;
  const popoverAtTop = step.target === 'bottom-nav';

  useEffect(() => {
    const appPage = document.querySelector<HTMLElement>('.app-page');
    appPage?.setAttribute('inert', '');
    const frameId = window.requestAnimationFrame(() => primaryButtonRef.current?.focus());

    return () => {
      appPage?.removeAttribute('inert');
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (step.tab && activeTab !== step.tab) {
      setTargetRect(null);
      onTabChange(step.tab);
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let attempts = 0;
    let target: HTMLElement | null = null;

    const measure = () => {
      if (!target || cancelled) return;
      const rect = target.getBoundingClientRect();
      const left = clamp(rect.left - 7, 7, window.innerWidth - 15);
      const top = clamp(rect.top - 7, 7, window.innerHeight - 15);
      setTargetRect({
        left,
        top,
        width: clamp(rect.right + 7, 15, window.innerWidth - 7) - left,
        height: clamp(rect.bottom + 7, 15, window.innerHeight - 7) - top,
      });
    };

    const locate = () => {
      if (cancelled) return;
      target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!target && attempts < 20) {
        attempts += 1;
        frameId = window.requestAnimationFrame(locate);
        return;
      }
      if (!target) {
        setTargetRect(null);
        return;
      }

      if (step.target !== 'bottom-nav') {
        const targetTop = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
      }
      frameId = window.requestAnimationFrame(measure);
    };

    locate();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [activeTab, onTabChange, step]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeTab !== initialTabRef.current) onTabChange(initialTabRef.current);
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled])')
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, onClose, onTabChange]);

  const closeAndRestore = () => {
    if (activeTab !== initialTabRef.current) onTabChange(initialTabRef.current);
    onClose();
  };

  const finishTour = () => {
    if (activeTab !== 'today') onTabChange('today');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[90]" aria-hidden="true" />
      {targetRect ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[91] bg-slate-950/85 transition-all duration-300" style={{ height: targetRect.top }} />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[91] bg-slate-950/85 transition-all duration-300"
            style={{ top: targetRect.top + targetRect.height }}
          />
          <div
            className="pointer-events-none fixed left-0 z-[91] bg-slate-950/85 transition-all duration-300"
            style={{ height: targetRect.height, top: targetRect.top, width: targetRect.left }}
          />
          <div
            className="pointer-events-none fixed right-0 z-[91] bg-slate-950/85 transition-all duration-300"
            style={{
              height: targetRect.height,
              left: targetRect.left + targetRect.width,
              top: targetRect.top,
            }}
          />
          <div
            className="pointer-events-none fixed z-[92] rounded-[1.55rem] border-2 border-lime-200 shadow-[0_0_0_4px_rgba(190,242,100,0.16),0_0_28px_rgba(190,242,100,0.2)] transition-all duration-300"
            style={{
              height: targetRect.height,
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
            }}
          >
            <span className="absolute -top-3 left-4 rounded-full bg-lime-300 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.12em] text-slate-950 shadow-lg">
              Veja aqui
            </span>
          </div>
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[91] bg-slate-950/85 backdrop-blur-sm" aria-hidden="true" />
      )}

      <div
        className={`pointer-events-none fixed inset-x-3 z-[93] flex justify-center ${
          popoverAtTop ? 'top-[max(0.75rem,env(safe-area-inset-top))]' : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'
        }`}
      >
        <section
          aria-describedby="app-tour-description"
          aria-labelledby="app-tour-title"
          aria-modal="true"
          className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[1.7rem] border border-white/15 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
          ref={dialogRef}
          role="dialog"
        >
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.accent}`} />
          <button
            aria-label="Fechar tour do aplicativo"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400"
            onClick={closeAndRestore}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 pr-11">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-slate-950 shadow-lg`}>
              <StepIcon size={23} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.63rem] font-black uppercase tracking-[0.15em] text-lime-300">
                Tour visual · {stepIndex + 1} de {tourSteps.length}
              </p>
              <h2 className="mt-1 text-lg font-black leading-tight text-slate-50" id="app-tour-title">
                {step.title}
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-slate-950/55 p-1.5" aria-label="Mapa do aplicativo">
            {ecosystemItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = step.tab === item.tab;
              return (
                <button
                  aria-label={`Ir para a explicação de ${item.label}`}
                  aria-pressed={isActive}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
                    isActive ? 'bg-lime-300 text-slate-950' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                  }`}
                  key={item.tab}
                  onClick={() => setStepIndex(item.stepIndex)}
                  type="button"
                >
                  <ItemIcon size={16} aria-hidden="true" />
                  <span className="max-w-full truncate text-[0.55rem] font-black">{item.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-300" id="app-tour-description">
            {step.description}
          </p>
          <div className="mt-3 flex gap-2.5 rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
            <Sparkles className="mt-0.5 shrink-0 text-lime-300" size={16} aria-hidden="true" />
            <p className="text-xs font-semibold leading-relaxed text-slate-400">{step.tip}</p>
          </div>

          <div className="mt-4 flex gap-1.5" aria-label={`Etapa ${stepIndex + 1} de ${tourSteps.length}`}>
            {tourSteps.map((tourStep, index) => (
              <button
                aria-label={`Ir para etapa ${index + 1}: ${tourStep.title}`}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={`h-1.5 flex-1 rounded-full transition ${index === stepIndex ? 'bg-lime-300' : index < stepIndex ? 'bg-lime-300/40' : 'bg-white/10'}`}
                key={tourStep.id}
                onClick={() => setStepIndex(index)}
                type="button"
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className="secondary-button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Voltar
            </button>
            <button
              className="primary-button"
              onClick={() => (isLastStep ? finishTour() : setStepIndex((current) => current + 1))}
              ref={primaryButtonRef}
              type="button"
            >
              {isLastStep ? <Check size={18} aria-hidden="true" /> : null}
              {isLastStep ? 'Ir para o início' : 'Próximo'}
              {!isLastStep ? <ChevronRight size={18} aria-hidden="true" /> : null}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
