import { useEffect, useRef } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { formatRankName, type RankLevel } from '../utils/ranks';
import { RankBadge } from './RankBadge';

type RankLevelUpModalProps = {
  level: RankLevel;
  onDismiss: () => void;
};

export function RankLevelUpModal({ level, onDismiss }: RankLevelUpModalProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const isOlympiaFinal = level.id === 'olympia-3';
  const rankName = formatRankName(level);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => continueButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div className="rank-levelup-backdrop" role="presentation">
      <section
        aria-describedby="rank-levelup-description"
        aria-labelledby="rank-levelup-title"
        aria-modal="true"
        className={`rank-levelup-card ${isOlympiaFinal ? 'rank-levelup-card--olympia' : ''}`}
        role="dialog"
      >
        <div className="rank-levelup-sparks" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
        </div>
        <span className="rank-levelup-kicker">
          <Sparkles size={15} aria-hidden="true" /> Novo rank desbloqueado
        </span>
        <div className="rank-levelup-crest">
          <RankBadge level={level} size="xl" />
        </div>
        <p className="rank-levelup-eyebrow">Parabéns</p>
        <h2 className="rank-levelup-title" id="rank-levelup-title">
          Você chegou ao {rankName}
        </h2>
        <p className="rank-levelup-description" id="rank-levelup-description">
          {isOlympiaFinal
            ? 'O cume da jornada é seu. Sua consistência transformou rotina em conquista.'
            : 'A sua consistência abriu um novo patamar. Continue registrando para alcançar o próximo brasão.'}
        </p>
        <button className="rank-levelup-button" onClick={onDismiss} ref={continueButtonRef} type="button">
          <Trophy size={18} aria-hidden="true" /> Continuar
        </button>
      </section>
    </div>
  );
}
