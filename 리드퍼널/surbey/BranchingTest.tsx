import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryPillButton } from '@/components/common/PillButton';
import { clearTraitScores } from '@/utils/traitScore';

const ROUTINES = [
  '해야 할 건 많은데, 어디서부터 손대야 할지 모르겠다',
  '생각보다 말이나 행동이 먼저나간다',
  '멍하다가도 갑자기 과열된다',
  '사소한 일에도 기분이 크게 흔들린다',
  '하고 싶은데 몸에 시동이 안걸린다',
  '장소나 분위기에 따라 완전히 다른 사람이 된다',
] as const;

// type RoutineText = (typeof ROUTINES)[number];

// ✅ 문장 -> 라우트 매핑
const ROUTE_BY_TEXT: Record<(typeof ROUTINES)[number], string> = {
  '해야 할 건 많은데, 어디서부터 손대야 할지 모르겠다':
    '/market/test/branchingtest/attention',

  '생각보다 말이나 행동이 먼저나간다': '/market/test/branchingtest/impulsive',

  '멍하다가도 갑자기 과열된다': '/market/test/branchingtest/complex',

  '사소한 일에도 기분이 크게 흔들린다': '/market/test/branchingtest/emotional',

  '하고 싶은데 몸에 시동이 안걸린다': '/market/test/branchingtest/motivation',

  '장소나 분위기에 따라 완전히 다른 사람이 된다':
    '/market/test/branchingtest/environment',
};

function BranchingTestPage() {
  const navigate = useNavigate();

  // 체크 여부
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  // ✅ 선택 "순서" (최대 3)
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

  function goNext() {
    if (pickedOrder.length === 0) return;

    // 새 테스트 시작 전 이전 점수 초기화
    clearTraitScores();

    // 선택 순서대로 라우트 큐 생성
    const queue = pickedOrder.map((i) => ROUTE_BY_TEXT[ROUTINES[i]]);
    const [first, ...rest] = queue;

    // ✅ 첫 페이지로 이동하면서 나머지 큐를 state로 전달
    navigate(first, { state: { queue: rest } });
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
            disabled={pickedOrder.length === 0}
          >
            <span>다음 단계 →</span>
          </PrimaryPillButton>

          <p className="text-center text-[12px] text-[#795549]/70 mt-2">
            작은 실행들이 모여 큰 변화를 만들어냅니다.
          </p>
        </section>
      </div>
    </div>
  );
}

export default BranchingTestPage;
