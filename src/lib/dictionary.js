// 단어 조회 어댑터.
// 지금은 데모 데이터를 돌려주며, 백엔드가 준비되면 이 함수 내부만 fetch('/api/...')로 교체하면 됩니다.
const DEMO_ENTRIES = {
  지지부진: {
    part: '형용사',
    meaning: '일이 잘 진척되지 않아 매우 더디다.',
    explanation: '글의 흐름에서는 결정을 내리지 못한 채 고민이 오래 이어지는 상태를 나타냅니다.',
    examples: ['협상은 여러 쟁점 때문에 지지부진하게 이어졌다.', '계획이 지지부진하자 일정을 다시 조정했다.'],
  },
  망설이다: {
    part: '동사',
    meaning: '이리저리 생각만 하고 결정을 선뜻 하지 못하다.',
    explanation: '선택지가 있거나 결과가 걱정되어 행동을 미루는 상황에 쓰입니다.',
    examples: ['그는 대답을 망설이다가 천천히 고개를 끄덕였다.'],
  },
  결정: {
    part: '명사',
    meaning: '행동이나 태도를 분명하게 정함.',
    explanation: '문맥에서는 계약서에 서명할지 말지를 최종적으로 선택하는 일을 뜻합니다.',
    examples: ['충분히 생각한 뒤 결정을 내렸다.'],
  },
  서류: {
    part: '명사',
    meaning: '글자로 기록한 문서.',
    explanation: '행정·계약·업무 등에서 사실이나 내용을 증명하기 위해 작성한 자료입니다.',
    examples: ['필요한 서류를 책상 위에 올려두었다.'],
  },
};

/** @returns {Promise<{part:string, meaning:string, explanation:string, examples:string[]}>} */
export async function lookupWord(word) {
  return (
    DEMO_ENTRIES[word] ?? {
      part: /다$/.test(word) ? '동사·형용사(추정)' : '형태소 분석 대기',
      meaning: '선택한 표현의 사전 뜻과 문맥 의미가 이 영역에 표시됩니다.',
      explanation:
        '현재 화면은 프론트엔드 데모입니다. 백엔드 연결 후 형태소 분석, 문맥 기반 의미 추정 및 미인지 단어 판별 결과로 대체할 수 있습니다.',
      examples: ['예문 데이터는 API 연동 후 제공됩니다.'],
    }
  );
}
