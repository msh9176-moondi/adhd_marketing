import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PrimaryPillButton } from '@/components/common/PillButton';
import { writeTraitScore, readTraitScores } from '@/utils/traitScore';
import { useTraitsStore } from '@/store/traits';

const ROUTINES = [
  '시작만 하면 될 것 같은데, 그 시작이 너무 어렵다',
  '준비하다가 지쳐서 포기한 적이 많다',
  '타이머가 없으면 시간 감각이 사라진다',
] as const;

type BranchState = {
  queue?: string[];
};

function AttentionTypePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTraits } = useTraitsStore();

  // ✅ 이전 페이지에서 넘어온 큐(다음에 보여줄 타입 페이지들)
  const state = (location.state ?? {}) as BranchState;
  const queue = state.queue ?? [];

  // 체크 여부
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  // ✅ 선택 "순서" (최대 3) - UI 유지용
  const [pickedOrder, setPickedOrder] = useState<number[]>([]);

  const card = 'bg-white rounded-xl shadow-sm';

  const pickedCount = pickedOrder.length;
  const isDisabledToPickMore = useMemo(() => pickedCount >= 3, [pickedCount]);

  function toggle(idx: number, next: boolean) {
    setChecked((prev) => ({ ...prev, [idx]: next }));

    setPickedOrder((prev) => {
      const has = prev.includes(idx);

      // 체크 ON
      if (next) {
        if (has) return prev;
        if (prev.length >= 3) return prev; // 3개 넘으면 무시
        return [...prev, idx]; // ✅ 선택 순서대로 push
      }

      // 체크 OFF
      if (!has) return prev;
      return prev.filter((v) => v !== idx);
    });
  }

  async function goNext() {
    const score = Object.values(checked).filter(Boolean).length;
    writeTraitScore('attention', score);

    // ✅ 큐가 남아있으면 다음 타입 페이지로, 없으면 백엔드 저장 후 마켓으로
    if (queue.length === 0) {
      // 로컬스토리지에서 모든 점수 읽어서 백엔드에 저장
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

        {/* CTA */}
        <section className="w-full mt-10">
          <PrimaryPillButton
            className="w-full text-[13px] font-semibold flex items-center justify-center gap-2"
            onClick={goNext}
          >
            <span>다음 단계 →</span>
          </PrimaryPillButton>

          <p className="text-center text-[12px] text-[#795549]/70 mt-2">
            시작은 결과를 약속하지 않아도 된다는걸 잊지마세요{' '}
          </p>
        </section>
      </div>
    </div>
  );
}

export default AttentionTypePage;
