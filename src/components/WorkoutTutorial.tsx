import { CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell, Play, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type WorkoutTutorialProps = {
  onClose: () => void;
};

const tutorialSteps = [
  {
    eyebrow: 'Passo 1 de 3',
    title: 'Crie e dê um nome ao treino',
    description:
      'Em Meus treinos, toque em Novo treino. Use um nome fácil de reconhecer, como “Glúteos e quadríceps”, e adicione os exercícios.',
    icon: Dumbbell,
    accent: 'bg-lime-300/12 text-lime-200',
  },
  {
    eyebrow: 'Passo 2 de 3',
    title: 'Monte a sua semana',
    description:
      'Abra qualquer dia da Agenda semanal — inclusive quinta ou domingo — e escolha Treino, Cardio ou Descanso. Um mesmo treino pode aparecer em mais de um dia.',
    icon: CalendarDays,
    accent: 'bg-teal-300/12 text-teal-200',
  },
  {
    eyebrow: 'Passo 3 de 3',
    title: 'Treine sem distrações',
    description:
      'Depois de organizar tudo, use a aba Treino apenas para executar as séries, registrar cargas e acompanhar o descanso.',
    icon: Play,
    accent: 'bg-violet-300/12 text-violet-200',
  },
] as const;

export function WorkoutTutorial({ onClose }: WorkoutTutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const step = tutorialSteps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === tutorialSteps.length - 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frameId = window.requestAnimationFrame(() => actionButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-md sm:items-center" role="presentation">
      <section
        aria-describedby="workout-tutorial-description"
        aria-labelledby="workout-tutorial-title"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900 p-5 shadow-2xl"
        role="dialog"
        style={{ marginBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <button
          aria-label="Fechar tutorial"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400"
          onClick={onClose}
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${step.accent}`}>
          <StepIcon size={26} aria-hidden="true" />
        </div>
        <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.16em] text-lime-300">{step.eyebrow}</p>
        <h2 className="mt-2 pr-8 text-xl font-black leading-tight text-slate-50" id="workout-tutorial-title">
          {step.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400" id="workout-tutorial-description">
          {step.description}
        </p>

        <div className="mt-6 flex gap-2" aria-label={`Etapa ${stepIndex + 1} de ${tutorialSteps.length}`}>
          {tutorialSteps.map((tutorialStep, index) => (
            <span
              className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-lime-300' : 'bg-white/10'}`}
              key={tutorialStep.title}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
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
            onClick={() => (isLastStep ? onClose() : setStepIndex((current) => current + 1))}
            ref={actionButtonRef}
            type="button"
          >
            {isLastStep ? <Check size={18} aria-hidden="true" /> : null}
            {isLastStep ? 'Entendi' : 'Próximo'}
            {!isLastStep ? <ChevronRight size={18} aria-hidden="true" /> : null}
          </button>
        </div>
      </section>
    </div>
  );
}
