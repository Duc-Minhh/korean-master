import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Curated high-frequency Korean grammar structures for rich distractor generation
const DEFAULT_GRAMMAR_POOL = [
  {
    structure: '-아/어서',
    meaning: 'Vì... nên... (nguyên nhân, lý do khách quan)',
    exampleKorean: '비가 와서 집에 있어요.',
    exampleVietnamese: 'Vì trời mưa nên tôi ở nhà.',
    usage: 'Diễn tả nguyên nhân hoặc mối quan hệ thứ tự trước sau',
  },
  {
    structure: '-(으)니까',
    meaning: 'Vì... nên... (lý do chủ quan, tiền đề khuyên bảo)',
    exampleKorean: '날씨가 좋으니까 소풍을 가요.',
    exampleVietnamese: 'Vì thời tiết đẹp nên chúng ta đi dã ngoại đi.',
    usage: 'Dùng khi câu sau là mệnh lệnh hoặc rủ rê',
  },
  {
    structure: '-(으)면',
    meaning: 'Nếu... thì... (giả định, điều kiện)',
    exampleKorean: '시간이 있으면 차를 마셔요.',
    exampleVietnamese: 'Nếu có thời gian thì uống trà nhé.',
    usage: 'Diễn tả điều kiện hoặc giả thiết',
  },
  {
    structure: '-(으)ㄹ 수 있다',
    meaning: 'Có thể làm gì... (khả năng, năng lực)',
    exampleKorean: '한국어를 유창하게 할 수 있어요.',
    exampleVietnamese: 'Tôi có thể nói tiếng Hàn lưu loát.',
    usage: 'Biểu đạt khả năng làm được một việc gì đó',
  },
  {
    structure: '-고 싶다',
    meaning: 'Muốn làm gì... (mong muốn của ngôi thứ nhất)',
    exampleKorean: '한국에 여행을 가고 싶어요.',
    exampleVietnamese: 'Tôi muốn đi du lịch Hàn Quốc.',
    usage: 'Diễn tả ước muốn hoặc nguyện vọng',
  },
  {
    structure: '-(으)려고 하다',
    meaning: 'Định làm gì... (dự định, kế hoạch)',
    exampleKorean: '새 책을 사려고 해요.',
    exampleVietnamese: 'Tôi định mua quyển sách mới.',
    usage: 'Biểu thị ý định hoặc dự tính sẽ thực hiện hành động',
  },
  {
    structure: '-지 않다',
    meaning: 'Không... (phủ định dài)',
    exampleKorean: '오늘은 춥지 않아요.',
    exampleVietnamese: 'Hôm nay trời không lạnh.',
    usage: 'Dạng phủ định trang trọng của tính từ hoặc động từ',
  },
  {
    structure: '-지만',
    meaning: 'Nhưng, tuy nhiên... (quan hệ đối lập)',
    exampleKorean: '한국 음식은 맵지만 맛있어요.',
    exampleVietnamese: 'Đồ ăn Hàn Quốc tuy cay nhưng rất ngon.',
    usage: 'Nối hai mệnh đề có ý nghĩa tương phản',
  },
  {
    structure: '-기 때문에',
    meaning: 'Bởi vì... nên... (nguyên nhân sâu xa)',
    exampleKorean: '일이 많기 때문에 못 갔어요.',
    exampleVietnamese: 'Bởi vì có nhiều việc nên tôi không thể đi.',
    usage: 'Nhấn mạnh lý do, nguyên nhân dẫn đến kết quả ở mệnh đề sau',
  },
  {
    structure: '-(으)ㄹ 때',
    meaning: 'Khi, lúc làm gì đó...',
    exampleKorean: '밥을 먹을 때 조용히 해요.',
    exampleVietnamese: 'Khi ăn cơm hãy yên lặng.',
    usage: 'Xác định thời điểm hành động xảy ra',
  },
  {
    structure: '-기 전에',
    meaning: 'Trước khi làm gì...',
    exampleKorean: '잠을 자기 전에 양치를 해요.',
    exampleVietnamese: 'Đánh răng trước khi đi ngủ.',
    usage: 'Biểu thị một hành động xảy ra trước hành động khác',
  },
  {
    structure: '-(으)ㄴ 후에',
    meaning: 'Sau khi làm gì...',
    exampleKorean: '식사한 후에 커피를 마셔요.',
    exampleVietnamese: 'Sau khi ăn cơm thì uống cà phê.',
    usage: 'Biểu thị hành động thứ hai xảy ra sau khi hành động thứ nhất kết thúc',
  },
  {
    structure: '-(으)ㄹ 줄 알다',
    meaning: 'Biết cách làm gì...',
    exampleKorean: '운전할 줄 알아요.',
    exampleVietnamese: 'Tôi biết lái xe ô tô.',
    usage: 'Diễn tả việc nắm được kỹ năng hoặc phương pháp làm gì đó',
  },
  {
    structure: '-아/어야 하다',
    meaning: 'Phải làm gì... (bắt buộc, cần thiết)',
    exampleKorean: '매일 한국어를 열심히 공부해야 해요.',
    exampleVietnamese: 'Mỗi ngày phải chăm chỉ học tiếng Hàn.',
    usage: 'Diễn tả nghĩa vụ hoặc việc cần thiết phải làm',
  },
  {
    structure: 'V + -는',
    meaning: 'Định ngữ động từ thì hiện tại ((mà) đang...)',
    exampleKorean: '지금 듣는 음악이 좋아요.',
    exampleVietnamese: 'Bản nhạc đang nghe bây giờ rất hay.',
    usage: 'Bổ nghĩa cho danh từ đứng sau diễn tả hành động đang xảy ra ở hiện tại',
  },
  {
    structure: 'V + -(으)ㄹ',
    meaning: 'Định ngữ động từ thì tương lai ((mà) sẽ...)',
    exampleKorean: '내일 볼 영화를 기대해요.',
    exampleVietnamese: 'Tôi rất mong đợi bộ phim sẽ xem vào ngày mai.',
    usage: 'Bổ nghĩa cho danh từ đứng sau diễn tả hành động sắp xảy ra trong tương lai',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'all'; // 1 to 8, or 'all'
    const countParam = parseInt(searchParams.get('count') || '10');
    const topicId = searchParams.get('topicId');
    const lessonId = searchParams.get('lessonId');

    const vocabWhere: any = {};
    const grammarWhere: any = {};

    if (topicId && topicId !== 'all') {
      vocabWhere.topicId = topicId;
      grammarWhere.topicId = topicId;
    }
    if (lessonId && lessonId !== 'all') {
      vocabWhere.lessonId = lessonId;
      grammarWhere.lessonId = lessonId;
    }

    // Fetch target items for the selected filter, plus a global pool for realistic distractors
    const [targetVocabs, targetGrammars, globalVocabs, globalGrammars] = await Promise.all([
      prisma.vocabulary.findMany({ where: vocabWhere }),
      prisma.grammar.findMany({ where: grammarWhere }),
      prisma.vocabulary.findMany({ take: 60, orderBy: { createdAt: 'desc' } }),
      prisma.grammar.findMany({ take: 60, orderBy: { createdAt: 'desc' } }),
    ]);

    // Validation
    if (targetVocabs.length === 0 && targetGrammars.length === 0) {
      return NextResponse.json(
        {
          error: 'Bài học hoặc chủ đề này hiện chưa có từ vựng hoặc ngữ pháp nào để tạo bài kiểm tra.',
        },
        { status: 400 }
      );
    }

    const questions: any[] = [];
    const questionCount = Math.min(countParam, 30);

    // Helpers
    const shuffle = <T>(array: T[]): T[] => array.slice().sort(() => Math.random() - 0.5);

    // Distractor generators
    const getGrammarMeaningDistractors = (correct: string): string[] => {
      const pool = [
        ...targetGrammars.map((g) => g.meaning),
        ...globalGrammars.map((g) => g.meaning),
        ...DEFAULT_GRAMMAR_POOL.map((g) => g.meaning),
      ].filter((m) => m && m.trim().toLowerCase() !== correct.trim().toLowerCase());
      return shuffle(Array.from(new Set(pool))).slice(0, 3);
    };

    const getGrammarStructureDistractors = (correct: string): string[] => {
      const pool = [
        ...targetGrammars.map((g) => g.structure),
        ...globalGrammars.map((g) => g.structure),
        ...DEFAULT_GRAMMAR_POOL.map((g) => g.structure),
      ].filter((s) => s && s.trim().toLowerCase() !== correct.trim().toLowerCase());
      return shuffle(Array.from(new Set(pool))).slice(0, 3);
    };

    const getGrammarExampleDistractors = (correct: string): string[] => {
      const pool = [
        ...targetGrammars.map((g) => g.exampleKorean),
        ...globalGrammars.map((g) => g.exampleKorean),
        ...DEFAULT_GRAMMAR_POOL.map((g) => g.exampleKorean),
      ].filter((e) => e && e.trim() !== correct.trim());
      return shuffle(Array.from(new Set(pool))).slice(0, 3);
    };

    const getVocabDistractors = (correct: string, isKorean: boolean): string[] => {
      const pool = isKorean
        ? [...targetVocabs.map((v) => v.korean), ...globalVocabs.map((v) => v.korean)]
        : [...targetVocabs.map((v) => v.vietnamese), ...globalVocabs.map((v) => v.vietnamese)];
      const filtered = pool.filter(
        (item) => item && item.trim().toLowerCase() !== correct.trim().toLowerCase()
      );
      return shuffle(Array.from(new Set(filtered))).slice(0, 3);
    };

    // Determine types to generate based on available data
    let typesToUse: number[] = [];
    const requestedType = typeParam !== 'all' ? parseInt(typeParam) : null;

    if (requestedType) {
      if ([1, 2, 3, 4, 5].includes(requestedType)) {
        if (targetVocabs.length > 0) {
          typesToUse = [requestedType];
        } else if (targetGrammars.length > 0) {
          // If lesson has NO vocabulary but has grammar, adapt intelligently to grammar types!
          typesToUse = [6, 7, 8];
        }
      } else if ([6, 7, 8].includes(requestedType)) {
        if (targetGrammars.length > 0) {
          typesToUse = [requestedType];
        } else if (targetVocabs.length > 0) {
          typesToUse = [1, 2, 3];
        }
      }
    } else {
      // typeParam === 'all'
      if (targetVocabs.length > 0 && targetGrammars.length > 0) {
        typesToUse = [1, 2, 3, 4, 5, 6, 7, 8];
      } else if (targetGrammars.length > 0) {
        // Lesson has ONLY grammar: use all rich grammar question varieties!
        typesToUse = [6, 7, 8, 9, 10];
      } else {
        // Lesson has ONLY vocabulary
        typesToUse = [1, 2, 3, 4, 5];
      }
    }

    if (typesToUse.length === 0) {
      typesToUse = targetGrammars.length > 0 ? [6, 7, 8] : [1, 2, 3];
    }

    for (let i = 0; i < questionCount; i++) {
      const qType = typesToUse[i % typesToUse.length];

      // ================= VOCABULARY QUESTION TYPES =================
      if (qType === 1 && targetVocabs.length > 0) {
        // 1. Tiếng Hàn -> Chọn nghĩa tiếng Việt
        const target = targetVocabs[Math.floor(Math.random() * targetVocabs.length)];
        const distractors = getVocabDistractors(target.vietnamese, false);
        const options = shuffle([target.vietnamese, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 1,
          typeName: 'Tiếng Hàn → Chọn nghĩa tiếng Việt',
          question: target.korean,
          instruction: 'Chọn nghĩa tiếng Việt chính xác của từ tiếng Hàn trên:',
          options,
          correctAnswer: target.vietnamese,
          explanation: `"${target.korean}" (${target.partOfSpeech}) nghĩa là "${target.vietnamese}". ${
            target.exampleKorean ? `Ví dụ: ${target.exampleKorean} (${target.exampleVietnamese})` : ''
          }`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 2 && targetVocabs.length > 0) {
        // 2. Tiếng Việt -> Chọn từ tiếng Hàn
        const target = targetVocabs[Math.floor(Math.random() * targetVocabs.length)];
        const distractors = getVocabDistractors(target.korean, true);
        const options = shuffle([target.korean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 2,
          typeName: 'Tiếng Việt → Chọn từ tiếng Hàn',
          question: target.vietnamese,
          instruction: 'Chọn từ tiếng Hàn tương ứng với nghĩa trên:',
          options,
          correctAnswer: target.korean,
          explanation: `Nghĩa "${target.vietnamese}" trong tiếng Hàn là "${target.korean}". ${
            target.hanja ? `Phiên âm/Hán: ${target.hanja}.` : ''
          }`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 3 && targetVocabs.length > 0) {
        // 3. Điền từ còn thiếu vào câu
        const candidates = targetVocabs.filter(
          (v) => v.exampleKorean && v.exampleKorean.includes(v.korean)
        );
        const target =
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : targetVocabs[Math.floor(Math.random() * targetVocabs.length)];

        let maskedSentence = target.exampleKorean || `${target.korean}을/를 공부합니다.`;
        if (target.exampleKorean && target.exampleKorean.includes(target.korean)) {
          maskedSentence = target.exampleKorean.replace(target.korean, '[ _____ ]');
        } else {
          maskedSentence = `[ _____ ] (Dịch nghĩa: ${target.vietnamese})`;
        }

        const distractors = getVocabDistractors(target.korean, true);
        const options = shuffle([target.korean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 3,
          typeName: 'Điền từ còn thiếu vào câu',
          question: maskedSentence,
          instruction: `Nghĩa câu: "${target.exampleVietnamese || target.vietnamese}". Điền từ thích hợp vào chỗ trống:`,
          options,
          correctAnswer: target.korean,
          explanation: `Từ cần điền là "${target.korean}". Câu hoàn chỉnh: ${
            target.exampleKorean || target.korean
          } (${target.exampleVietnamese || target.vietnamese})`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 4 && targetVocabs.length > 0) {
        // 4. Viết nghĩa tiếng Việt (tự gõ)
        const target = targetVocabs[Math.floor(Math.random() * targetVocabs.length)];
        questions.push({
          id: `q_${i + 1}`,
          type: 4,
          typeName: 'Viết nghĩa tiếng Việt',
          question: target.korean,
          instruction: `Hãy tự gõ nghĩa tiếng Việt của từ "${target.korean}" (${target.partOfSpeech}):`,
          correctAnswer: target.vietnamese,
          explanation: `Từ "${target.korean}" có nghĩa là: "${target.vietnamese}". ${
            target.notes ? `Ghi chú: ${target.notes}` : ''
          }`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 5 && targetVocabs.length > 0) {
        // 5. Nhìn nghĩa tiếng Việt và tự gõ tiếng Hàn
        const target = targetVocabs[Math.floor(Math.random() * targetVocabs.length)];
        questions.push({
          id: `q_${i + 1}`,
          type: 5,
          typeName: 'Nhìn nghĩa tiếng Việt & Gõ từ tiếng Hàn',
          question: target.vietnamese,
          instruction: `Hãy gõ từ tiếng Hàn tương ứng với nghĩa "${target.vietnamese}" (${target.partOfSpeech}):`,
          correctAnswer: target.korean,
          explanation: `Đáp án chính xác là: "${target.korean}". ${
            target.hanja ? `Phiên âm: ${target.hanja}.` : ''
          }`,
          relatedVocabOrGrammar: target.korean,
        });
      }

      // ================= GRAMMAR QUESTION TYPES =================
      else if (qType === 6 && targetGrammars.length > 0) {
        // 6. Trắc nghiệm nhận biết ý nghĩa ngữ pháp
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarMeaningDistractors(target.meaning);
        const options = shuffle([target.meaning, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 6,
          typeName: 'Trắc nghiệm nhận biết ngữ pháp',
          question: `Cấu trúc: ${target.structure}`,
          instruction: 'Chọn ý nghĩa và công dụng đúng của cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: target.meaning,
          explanation: `Ngữ pháp "${target.structure}": ${target.meaning}. ${
            target.usage ? `Cách dùng: ${target.usage}. ` : ''
          }${target.formation ? `Công thức: ${target.formation}.` : ''}`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 7 && targetGrammars.length > 0) {
        // 7. Xác định cấu trúc ngữ pháp trong câu
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarStructureDistractors(target.structure);
        const options = shuffle([target.structure, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 7,
          typeName: 'Điền cấu trúc ngữ pháp vào câu',
          question: `Ví dụ: ${target.exampleKorean}`,
          instruction: `Câu trên biểu đạt ý nghĩa: "${target.exampleVietnamese}". Ngữ pháp trọng tâm là:`,
          options,
          correctAnswer: target.structure,
          explanation: `Cấu trúc được sử dụng trong câu là "${target.structure}". Công thức: ${target.formation || 'Xem phần sổ tay ngữ pháp'}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 8 && targetGrammars.length > 0) {
        // 8. Chọn câu sử dụng ngữ pháp đúng
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarExampleDistractors(target.exampleKorean);
        const options = shuffle([target.exampleKorean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 8,
          typeName: 'Chọn câu sử dụng ngữ pháp đúng',
          question: `Cấu trúc: ${target.structure} (${target.meaning})`,
          instruction: 'Chọn câu tiếng Hàn sử dụng chuẩn xác cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: target.exampleKorean,
          explanation: `Câu đúng là: "${target.exampleKorean}" (Nghĩa: ${target.exampleVietnamese}). Cấu trúc "${target.structure}" có cách kết hợp: ${target.formation || ''}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 9 && targetGrammars.length > 0) {
        // 9. Ý nghĩa tiếng Việt → Chọn cấu trúc tiếng Hàn tương ứng
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarStructureDistractors(target.structure);
        const options = shuffle([target.structure, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 6,
          typeName: 'Ý nghĩa → Chọn cấu trúc ngữ pháp',
          question: `Ý nghĩa: "${target.meaning}"`,
          instruction: 'Chọn cấu trúc ngữ pháp tiếng Hàn biểu thị ý nghĩa trên:',
          options,
          correctAnswer: target.structure,
          explanation: `Cấu trúc mang ý nghĩa "${target.meaning}" là "${target.structure}". Ví dụ: ${target.exampleKorean} (${target.exampleVietnamese})`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 10 && targetGrammars.length > 0) {
        // 10. Điền cấu trúc ngữ pháp vào câu ví dụ (ẩn phần ngữ pháp)
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarStructureDistractors(target.structure);
        const options = shuffle([target.structure, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 7,
          typeName: 'Điền cấu trúc ngữ pháp vào câu',
          question: `Câu: "${target.exampleKorean}"`,
          instruction: `Câu trên có nghĩa: "${target.exampleVietnamese}". Ngữ pháp nào đã được áp dụng trong câu?`,
          options,
          correctAnswer: target.structure,
          explanation: `Đáp án đúng là "${target.structure}". Nghĩa: ${target.meaning}. Công thức: ${target.formation || ''}`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (targetGrammars.length > 0) {
        // Fallback to Grammar Type 6
        const target = targetGrammars[Math.floor(Math.random() * targetGrammars.length)];
        const distractors = getGrammarMeaningDistractors(target.meaning);
        const options = shuffle([target.meaning, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 6,
          typeName: 'Trắc nghiệm nhận biết ngữ pháp',
          question: `Cấu trúc: ${target.structure}`,
          instruction: 'Chọn ý nghĩa và công dụng đúng của cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: target.meaning,
          explanation: `Ngữ pháp "${target.structure}": ${target.meaning}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (targetVocabs.length > 0) {
        // Fallback to Vocab Type 1
        const target = targetVocabs[Math.floor(Math.random() * targetVocabs.length)];
        const distractors = getVocabDistractors(target.vietnamese, false);
        const options = shuffle([target.vietnamese, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 1,
          typeName: 'Tiếng Hàn → Chọn nghĩa tiếng Việt',
          question: target.korean,
          instruction: 'Chọn nghĩa tiếng Việt chính xác của từ tiếng Hàn trên:',
          options,
          correctAnswer: target.vietnamese,
          explanation: `"${target.korean}" (${target.partOfSpeech}) nghĩa là "${target.vietnamese}".`,
          relatedVocabOrGrammar: target.korean,
        });
      }
    }

    return NextResponse.json({
      title:
        typeParam === 'all'
          ? targetVocabs.length === 0
            ? 'Bài kiểm tra chuyên đề Ngữ pháp'
            : 'Bài kiểm tra tổng hợp'
          : `Bài kiểm tra dạng ${typeParam}`,
      total: questions.length,
      questions,
    });
  } catch (error) {
    console.error('Lỗi tạo bài kiểm tra:', error);
    return NextResponse.json({ error: 'Không thể tạo bài kiểm tra' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizType, title, questions, userAnswers } = body;

    if (!Array.isArray(questions) || !userAnswers) {
      return NextResponse.json({ error: 'Dữ liệu kiểm tra không hợp lệ' }, { status: 400 });
    }

    let correctCount = 0;
    const evaluatedQuestions = questions.map((q: any) => {
      const userAns = String(userAnswers[q.id] || '').trim();
      const correctAns = String(q.correctAnswer).trim();

      // Check correctness: exact match or clean match for free typing
      let isCorrect = false;
      if (q.type === 4 || q.type === 5) {
        const cleanUser = userAns.toLowerCase().replace(/[\,\.\;\:]/g, '');
        const cleanCorrect = correctAns.toLowerCase().replace(/[\,\.\;\:]/g, '');
        isCorrect =
          cleanUser === cleanCorrect ||
          cleanCorrect.includes(cleanUser) ||
          cleanUser.includes(cleanCorrect);
      } else {
        isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();
      }

      if (isCorrect) correctCount++;

      return {
        ...q,
        userAnswer: userAns,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const wrongCount = totalQuestions - correctCount;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Save quiz history
    const quizHistory = await prisma.quizHistory.create({
      data: {
        quizType: String(quizType || 'MIXED'),
        title: title || 'Bài kiểm tra tiếng Hàn',
        score,
        totalQuestions,
        correctCount,
        wrongCount,
        details: JSON.stringify(evaluatedQuestions),
      },
    });

    // Update study log
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: todayStr },
      update: { quizzesCompleted: { increment: 1 } },
      create: { date: todayStr, quizzesCompleted: 1 },
    });

    return NextResponse.json({
      id: quizHistory.id,
      score,
      totalQuestions,
      correctCount,
      wrongCount,
      details: evaluatedQuestions,
      completedAt: quizHistory.completedAt,
    });
  } catch (error) {
    console.error('Lỗi nộp bài kiểm tra:', error);
    return NextResponse.json({ error: 'Không thể lưu kết quả kiểm tra' }, { status: 500 });
  }
}
