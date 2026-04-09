import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PrimaryPillButton } from '@/components/common/PillButton';
import { writeTraitScore, readTraitScores } from '@/utils/traitScore';
import { useTraitsStore } from '@/store/traits';

const ROUTINES = [
  '사소한 말이나 표정에도 기분이 크게 흔들린다',
  '화·짜증이 나면 회복까지 시간이 오래 걸린다',
  '거절이나 비판을 받으면 머릿속에서 계속 반복된다',
] as const;

type BranchState = { queue?: string[] };

function EmotionalTypePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTraits } = useTraitsStore();

  const state = (location.state ?? {}) as BranchState;
  const queue = state.queue ?? [];

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [pickedOrder, setPickedOrder] = useState<number[]>([]);

  const card = 'bg-white rounded-xl shadow-sm';

  const pickedCount = pickedOrder.length;
  const isDisabledToPickMore = useMemo(() => pickedCount >= 3, [pickedCount]);

  function toggle(idx: number, next: boolean) {
    setChecked((prev) => ({ ...prev, [idx]: next }));

    setPickedOrder((prev) => {
      const has = prev.includes(idx);
      if (next) {
        if (has) return prev;
        if (prev.length >= 3) return prev;
        return [...prev, idx];
      }
      if (!has) return prev;
      return prev.filter((v) => v !== idx);
    });
  }

  async function goNext() {
    const score = Object.values(checked).filter(Boolean).length;
    writeTraitScore('emotional', score);

    if (queue.length === 0) {
      const allScores = readTraitScores();
      try {
        await updateTraits({
          attention: allScores.attention ?? 0,
          impulsive: allScores.impulsive ?? 0,
          complex: allScores.complex ?? 0,
          emotional: allScores.emotional ?? 0,
          motivation: allScores.motivation ?? 0,
          environment: allScores.environment ?? 0,
        });
      } catch (error) {
        console.error('성향 점수 저장 실패:', error);
      }
      navigate('/market');
      return;
    }
    const [next, ...rest] = queue;
    navigate(next, { state: { queue: rest } });
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="text-2xl text-[#795549] font-extrabold">
        나의 ADHD성향 테스트
      </div>

      <div className="w-full mt-8 space-y-8">
        <section className="space-y-3">
          <h3 className="text-[14px] font-semibold text-[#795549]">
            1.오늘의 나와 가장 가까운 문장을 골라주세요
          </h3>
          <p className="text-[12px] text-[#795549]/60">최대 3개 선택</p>

          <div className="space-y-3">
            {ROUTINES.map((text, idx) => {
              const isChecked = !!checked[idx];
              const disableThis = !isChecked && isDisabledToPickMore;

              return (
                <label
                  key={idx}
                  className={[
                    card,
                    'px-4 py-3 flex items-center gap-3 cursor-pointer select-none',
                    disableThis ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#795549]/40 accent-[#795549]"
                    checked={isChecked}
                    disabled={disableThis}
                    onChange={(e) => toggle(idx, e.target.checked)}
                  />
                  <span className="text-[13px] font-medium text-[#795549]">
                    {text}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="w-full mt-10">
          <PrimaryPillButton
            className="w-full text-[13px] font-semibold flex items-center justify-center gap-2"
            onClick={goNext}
          >
            <span>다음 단계 →</span>
          </PrimaryPillButton>

          <p className="text-center text-[12px] text-[#795549]/70 mt-2">
            지금은 고치는 시간이 아니라, 지나가는 시간이에요
          </p>
        </section>
      </div>
    </div>
  );
}

export default EmotionalTypePage;
