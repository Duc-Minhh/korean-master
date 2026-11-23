import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

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

// Rich set of Korean verbs and dynamic templates for non-repeating procedural generation
const DYNAMIC_VERB_TEMPLATES = [
  {
    base: '사다',
    meaningVi: 'mua',
    past: '산',
    present: '사는',
    future: '살',
    connective: '사서',
    rule: 'Động từ "사다" không có patchim kết hợp với "-ㄴ"',
    sentence: '어제 백화점에서 [ _____ ] 옷이 아주 마음에 들어요.',
    sentenceVi: 'Bộ quần áo tôi đã mua ở trung tâm thương mại hôm qua rất vừa ý.',
  },
  {
    base: '먹다',
    meaningVi: 'ăn',
    past: '먹은',
    present: '먹는',
    future: '먹을',
    connective: '먹어서',
    rule: 'Động từ "먹다" có patchim kết hợp với "-은"',
    sentence: '어제 저녁에 식당에서 [ _____ ] 불고기가 정말 맛있었어요.',
    sentenceVi: 'Món thịt nướng tôi đã ăn ở nhà hàng tối qua thực sự rất ngon.',
  },
  {
    base: '보다',
    meaningVi: 'xem',
    past: '본',
    present: '보는',
    future: '볼',
    connective: '봐서',
    rule: 'Động từ "보다" không có patchim kết hợp với "-ㄴ"',
    sentence: '지난 주말에 극장에서 [ _____ ] 영화가 무척 감동적이었어요.',
    sentenceVi: 'Bộ phim tôi đã xem ở rạp cuối tuần trước vô cùng cảm động.',
  },
  {
    base: '만들다',
    meaningVi: 'làm, chế biến',
    past: '만든',
    present: '만드는',
    future: '만들',
    connective: '만들어서',
    rule: 'Bất quy tắc "ㄹ": Động từ "만들다" bỏ "ㄹ" rồi kết hợp với "-ㄴ" thành "만든"',
    sentence: '어머니께서 직접 [ _____ ] 김치가 제일 맛있어요.',
    sentenceVi: 'Món kim chi do mẹ tự tay làm là ngon nhất.',
  },
  {
    base: '듣다',
    meaningVi: 'nghe',
    past: '들은',
    present: '듣는',
    future: '들을',
    connective: '들어서',
    rule: 'Bất quy tắc "ㄷ": Động từ "듣다" gặp nguyên âm biến thành "들" kết hợp với "-은" thành "들은"',
    sentence: '어젯밤 라디오에서 [ _____ ] 노래 제목이 무엇인가요?',
    sentenceVi: 'Tên bài hát tôi đã nghe trên radio tối qua là gì vậy?',
  },
  {
    base: '만나다',
    meaningVi: 'gặp gỡ',
    past: '만난',
    present: '만나는',
    future: '만날',
    connective: '만나서',
    rule: 'Động từ "만나다" không có patchim kết hợp với "-ㄴ"',
    sentence: '어제 카페에서 [ _____ ] 친구는 고등학교 동창이에요.',
    sentenceVi: 'Người bạn tôi đã gặp ở quán cà phê hôm qua là bạn học cùng cấp 3.',
  },
  {
    base: '읽다',
    meaningVi: 'đọc',
    past: '읽은',
    present: '읽는',
    future: '읽을',
    connective: '읽어서',
    rule: 'Động từ "읽다" có patchim kết hợp với "-은"',
    sentence: '도서관에서 [ _____ ] 소설책이 정말 흥미진진했어요.',
    sentenceVi: 'Cuốn tiểu thuyết tôi đã đọc ở thư viện thực sự rất hấp dẫn.',
  },
  {
    base: '마시다',
    meaningVi: 'uống',
    past: '마신',
    present: '마시는',
    future: '마실',
    connective: '마셔서',
    rule: 'Động từ "마시다" không có patchim kết hợp với "-ㄴ"',
    sentence: '오늘 아침에 [ _____ ] 원두커피 향이 아주 좋았어요.',
    sentenceVi: 'Mùi hương của ly cà phê tôi đã uống sáng nay rất thơm.',
  },
  {
    base: '배우다',
    meaningVi: 'học',
    past: '배운',
    present: '배우는',
    future: '배울',
    connective: '배워서',
    rule: 'Động từ "배우다" không có patchim kết hợp với "-ㄴ"',
    sentence: '지난 학기에 [ _____ ] 한국어 문법을 복습하고 있어요.',
    sentenceVi: 'Tôi đang ôn tập lại các ngữ pháp tiếng Hàn đã học ở học kỳ trước.',
  },
  {
    base: '가다',
    meaningVi: 'đi',
    past: '간',
    present: '가는',
    future: '갈',
    connective: '가서',
    rule: 'Động từ "가다" không có patchim kết hợp với "-ㄴ"',
    sentence: '작년에 가족과 함께 [ _____ ] 제주도 바다가 그립네요.',
    sentenceVi: 'Tôi nhớ bờ biển đảo Jeju nơi tôi đã đi cùng gia đình năm ngoái.',
  },
  {
    base: '돕다',
    meaningVi: 'giúp đỡ',
    past: '도운',
    present: '돕는',
    future: '도울',
    connective: '도와서',
    rule: 'Bất quy tắc "ㅂ": "돕다" biến đổi thành "도우" kết hợp với "-ㄴ" thành "도운"',
    sentence: '어려울 때 나를 [ _____ ] 고마운 분께 편지를 썼어요.',
    sentenceVi: 'Tôi đã viết thư gửi người tốt bụng đã giúp đỡ tôi lúc khó khăn.',
  },
  {
    base: '쓰다',
    meaningVi: 'viết',
    past: '쓴',
    present: '쓰는',
    future: '쓸',
    connective: '써서',
    rule: 'Động từ "쓰다" không có patchim kết hợp với "-ㄴ"',
    sentence: '선생님께 [ _____ ] 감사 편지를 우체통에 넣었어요.',
    sentenceVi: 'Tôi đã bỏ lá thư cảm ơn đã viết cho thầy cô vào hòm thư.',
  },
];

// Call Google Gemini AI to generate completely dynamic, non-repeating TOPIK questions
async function generateGeminiAIQuestions({
  apiKey,
  targetGrammars,
  count,
}: {
  apiKey: string;
  targetGrammars: any[];
  count: number;
}) {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const grammarBrief = targetGrammars
      .map(
        (g, idx) =>
          `${idx + 1}. Cấu trúc: "${g.structure}" - Ý nghĩa: "${g.meaning}" - Cách dùng: "${
            g.usage || ''
          }" - Công thức: "${g.formation || ''}" - Ví dụ: "${g.exampleKorean}" (${
            g.exampleVietnamese
          })`
      )
      .join('\n');

    const prompt = `Bạn là chuyên gia giáo dục và khảo thí tiếng Hàn TOPIK cao cấp.
Nhiệm vụ: Hãy tạo ra đúng ${count} câu hỏi trắc nghiệm kiểm tra ngữ pháp tiếng Hàn chất lượng cao cho người học.

Danh sách ngữ pháp trọng tâm:
${grammarBrief}

YÊU CẦU NGHIÊM NGẶT:
1. MỖI CÂU HỎI TRONG ${count} CÂU PHẢI HOÀN TOÀN KHÁC NHAU VỀ NGỮ CẢNH, ĐỘNG TỪ VÀ CHỦ ĐỀ (không được lặp lại câu văn hoặc động từ giống nhau).
2. Tận dụng đa dạng chủ đề cuộc sống tự nhiên: công việc, trường học, gia đình, du lịch, ăn uống, sở thích, thời tiết...
3. Các dạng câu hỏi phong phú:
   - Dạng 1: Điền dạng chia đúng của động từ vào chỗ trống [ _____ ] trong câu (thử thách patchim, bất quy tắc ㄷ, ㅂ, ㅅ, ㄹ...).
   - Dạng 2: Cho câu tiếng Hàn hoàn chỉnh, hỏi cấu trúc ngữ pháp nào đã được áp dụng và ý nghĩa là gì.
   - Dạng 3: Cho câu tiếng Việt, chọn câu tiếng Hàn biểu đạt chuẩn xác và tự nhiên nhất.
   - Dạng 4: Chọn câu sử dụng đúng ngữ pháp nhất trong 4 câu ví dụ thực tế.
4. Mỗi câu hỏi gồm đủ 4 phương án trắc nghiệm A, B, C, D độc lập, trong đó chỉ có 1 phương án đúng.
5. Giải thích (explanation) phải chi tiết bằng tiếng Việt: vì sao đúng, phân tích nguyên tắc chia và mẹo ghi nhớ.

Định dạng trả về: JSON thuần túy (Mảng JSON gồm ${count} phần tử) với schema:
[
  {
    "id": "q_1",
    "type": 7,
    "typeName": "Điền cấu trúc ngữ pháp vào câu",
    "question": "어제 시장에서 [ _____ ] 사과가 아주 달고 맛있었어요.",
    "instruction": "Nghĩa câu: 'Quả táo tôi đã mua ở chợ hôm qua rất ngọt và ngon'. Điền dạng chia đúng:",
    "options": ["산", "사는", "살", "사서"],
    "correctAnswer": "산",
    "explanation": "Động từ '사다' (mua) không có patchim, khi kết hợp với định ngữ quá khứ '-(으)ㄴ' tạo thành '산' (đã mua).",
    "relatedVocabOrGrammar": "${targetGrammars[0]?.structure || 'Ngữ pháp'}"
  }
]
CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO KHÁC NGOÀI JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) return null;

    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, count);
    }
    return null;
  } catch (err) {
    console.warn('Lỗi gọi Gemini AI tạo câu hỏi (chuyển sang bộ sinh động thông minh):', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'all'; // 'vocab', 'grammar', 'all', or legacy '1' to '8'
    const countParam = parseInt(searchParams.get('count') || '10');
    const topicId = searchParams.get('topicId');
    const lessonId = searchParams.get('lessonId');

    const vocabWhere: any = {};
    const grammarWhere: any = {};

    // Chủ đề dùng để lọc Từ vựng
    if (topicId && topicId !== 'all') {
      vocabWhere.topicId = topicId;
    }
    // Bài học dùng để lọc Ngữ pháp
    if (lessonId && lessonId !== 'all') {
      grammarWhere.lessonId = lessonId;
    }

    // Fetch target items, global pool, and user settings for Gemini API Key
    const [targetVocabs, targetGrammars, globalVocabs, globalGrammars, userSetting] =
      await Promise.all([
        prisma.vocabulary.findMany({ where: vocabWhere }),
        prisma.grammar.findMany({ where: grammarWhere }),
        prisma.vocabulary.findMany({ take: 60, orderBy: { createdAt: 'desc' } }),
        prisma.grammar.findMany({ take: 60, orderBy: { createdAt: 'desc' } }),
        prisma.userSetting.findUnique({ where: { id: 'default-user' } }),
      ]);

    // Validation theo từng chế độ
    if (typeParam === 'vocab') {
      if (targetVocabs.length === 0) {
        return NextResponse.json(
          { error: 'Chủ đề này hiện chưa có từ vựng nào để tạo bài ôn luyện từ vựng.' },
          { status: 400 }
        );
      }
    } else if (typeParam === 'grammar') {
      if (targetGrammars.length === 0) {
        return NextResponse.json(
          { error: 'Bài học này hiện chưa có cấu trúc ngữ pháp nào để tạo bài ôn luyện ngữ pháp.' },
          { status: 400 }
        );
      }
    } else {
      if (targetVocabs.length === 0 && targetGrammars.length === 0) {
        return NextResponse.json(
          { error: 'Chưa có đủ từ vựng và ngữ pháp để tạo đề thi tổng hợp.' },
          { status: 400 }
        );
      }
    }

    // Đề tổng hợp: Fix cứng 40 câu; Ôn từ vựng / ngữ pháp: Theo số lượng người dùng chọn (mặc định 10)
    let questionCount = 10;
    if (typeParam === 'all') {
      questionCount = 40;
    } else {
      questionCount = Math.min(Math.max(countParam, 1), 50);
    }

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

    // Shuffled dynamic verb list so every question in the loop uses a fresh verb & scenario
    const shuffledVerbTemplates = shuffle(DYNAMIC_VERB_TEMPLATES);

    // Generator 1: Câu hỏi từ vựng (Dạng 1 - 5)
    const buildVocabQuestion = (vocabItem: any, idx: number) => {
      const vType = (idx % 5) + 1;
      if (vType === 1) {
        const distractors = getVocabDistractors(vocabItem.vietnamese, false);
        const options = shuffle([vocabItem.vietnamese, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 1,
          typeName: 'Tiếng Hàn → Chọn nghĩa tiếng Việt',
          question: vocabItem.korean,
          instruction: 'Chọn nghĩa tiếng Việt chính xác của từ tiếng Hàn trên:',
          options,
          correctAnswer: vocabItem.vietnamese,
          explanation: `"${vocabItem.korean}" (${vocabItem.partOfSpeech}) nghĩa là "${vocabItem.vietnamese}".`,
          relatedVocabOrGrammar: vocabItem.korean,
        };
      } else if (vType === 2) {
        const distractors = getVocabDistractors(vocabItem.korean, true);
        const options = shuffle([vocabItem.korean, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 2,
          typeName: 'Tiếng Việt → Chọn từ tiếng Hàn',
          question: vocabItem.vietnamese,
          instruction: 'Chọn từ tiếng Hàn tương ứng với nghĩa trên:',
          options,
          correctAnswer: vocabItem.korean,
          explanation: `Nghĩa "${vocabItem.vietnamese}" trong tiếng Hàn là "${vocabItem.korean}".`,
          relatedVocabOrGrammar: vocabItem.korean,
        };
      } else if (vType === 3) {
        let maskedSentence = vocabItem.exampleKorean || `${vocabItem.korean}을/를 공부합니다.`;
        if (vocabItem.exampleKorean && vocabItem.exampleKorean.includes(vocabItem.korean)) {
          maskedSentence = vocabItem.exampleKorean.replace(vocabItem.korean, '[ _____ ]');
        } else {
          maskedSentence = `[ _____ ] (Dịch: ${vocabItem.vietnamese})`;
        }
        const distractors = getVocabDistractors(vocabItem.korean, true);
        const options = shuffle([vocabItem.korean, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 3,
          typeName: 'Điền từ còn thiếu vào câu',
          question: maskedSentence,
          instruction: `Nghĩa câu: "${vocabItem.exampleVietnamese || vocabItem.vietnamese}". Điền từ thích hợp vào chỗ trống:`,
          options,
          correctAnswer: vocabItem.korean,
          explanation: `Từ cần điền là "${vocabItem.korean}".`,
          relatedVocabOrGrammar: vocabItem.korean,
        };
      } else if (vType === 4) {
        return {
          id: `q_${idx + 1}`,
          type: 4,
          typeName: 'Viết nghĩa tiếng Việt (Tự gõ)',
          question: vocabItem.korean,
          instruction: `Hãy tự gõ nghĩa tiếng Việt của từ "${vocabItem.korean}" (${vocabItem.partOfSpeech}):`,
          correctAnswer: vocabItem.vietnamese,
          explanation: `Từ "${vocabItem.korean}" có nghĩa là: "${vocabItem.vietnamese}".`,
          relatedVocabOrGrammar: vocabItem.korean,
        };
      } else {
        return {
          id: `q_${idx + 1}`,
          type: 5,
          typeName: 'Nhìn nghĩa Việt & Gõ từ tiếng Hàn',
          question: vocabItem.vietnamese,
          instruction: `Hãy gõ từ tiếng Hàn tương ứng với nghĩa "${vocabItem.vietnamese}" (${vocabItem.partOfSpeech}):`,
          correctAnswer: vocabItem.korean,
          explanation: `Đáp án chính xác là: "${vocabItem.korean}".`,
          relatedVocabOrGrammar: vocabItem.korean,
        };
      }
    };

    // Generator 2: Câu hỏi ngữ pháp (Dạng 6 - 8)
    const buildGrammarQuestion = (grammarItem: any, idx: number) => {
      const verbTemplate = shuffledVerbTemplates[idx % shuffledVerbTemplates.length];
      const subType = idx % 5;
      if (subType === 0) {
        const distractors = shuffle([
          verbTemplate.present,
          verbTemplate.future,
          verbTemplate.connective,
        ]);
        const options = shuffle([verbTemplate.past, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 7,
          typeName: 'Điền dạng chia ngữ pháp vào câu',
          question: verbTemplate.sentence,
          instruction: `Nghĩa câu: "${verbTemplate.sentenceVi}". Hãy chọn dạng chia đúng của động từ "${verbTemplate.base}" (${verbTemplate.meaningVi}):`,
          options,
          correctAnswer: verbTemplate.past,
          explanation: `Từ cần điền là "${verbTemplate.past}". Quy tắc: ${verbTemplate.rule}. Câu hoàn chỉnh: ${verbTemplate.sentence.replace('[ _____ ]', verbTemplate.past)}`,
          relatedVocabOrGrammar: grammarItem.structure,
        };
      } else if (subType === 1) {
        const distractors = getGrammarMeaningDistractors(grammarItem.meaning);
        const options = shuffle([grammarItem.meaning, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 6,
          typeName: 'Trắc nghiệm nhận biết ngữ pháp',
          question: `Cấu trúc: ${grammarItem.structure}`,
          instruction: 'Chọn ý nghĩa và công dụng đúng của cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: grammarItem.meaning,
          explanation: `Ngữ pháp "${grammarItem.structure}": ${grammarItem.meaning}. ${
            grammarItem.usage ? `Cách dùng: ${grammarItem.usage}. ` : ''
          }${grammarItem.formation ? `Công thức: ${grammarItem.formation}.` : ''}`,
          relatedVocabOrGrammar: grammarItem.structure,
        };
      } else if (subType === 2) {
        const correctSentence = verbTemplate.sentence.replace('[ _____ ]', verbTemplate.past);
        const distractors = getGrammarExampleDistractors(correctSentence);
        const options = shuffle([correctSentence, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 8,
          typeName: 'Chọn câu sử dụng ngữ pháp đúng',
          question: `Cấu trúc: ${grammarItem.structure} (${grammarItem.meaning})`,
          instruction: `Chọn câu tiếng Hàn diễn đạt đúng ý: "${verbTemplate.sentenceVi}":`,
          options,
          correctAnswer: correctSentence,
          explanation: `Câu đúng là: "${correctSentence}". Áp dụng cấu trúc ${grammarItem.structure} với động từ "${verbTemplate.base}": ${verbTemplate.rule}.`,
          relatedVocabOrGrammar: grammarItem.structure,
        };
      } else if (subType === 3) {
        const distractors = getGrammarStructureDistractors(grammarItem.structure);
        const options = shuffle([grammarItem.structure, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 6,
          typeName: 'Ý nghĩa → Chọn cấu trúc ngữ pháp',
          question: `Ý nghĩa: "${grammarItem.meaning}"`,
          instruction: 'Chọn cấu trúc ngữ pháp tiếng Hàn biểu thị ý nghĩa trên:',
          options,
          correctAnswer: grammarItem.structure,
          explanation: `Cấu trúc mang ý nghĩa "${grammarItem.meaning}" là "${grammarItem.structure}". Ví dụ: ${grammarItem.exampleKorean} (${grammarItem.exampleVietnamese})`,
          relatedVocabOrGrammar: grammarItem.structure,
        };
      } else {
        const distractors = getGrammarStructureDistractors(grammarItem.structure);
        const options = shuffle([grammarItem.structure, ...distractors]);
        return {
          id: `q_${idx + 1}`,
          type: 7,
          typeName: 'Điền cấu trúc ngữ pháp vào câu',
          question: `Ví dụ: ${grammarItem.exampleKorean}`,
          instruction: `Câu trên biểu đạt ý nghĩa: "${grammarItem.exampleVietnamese}". Ngữ pháp trọng tâm là:`,
          options,
          correctAnswer: grammarItem.structure,
          explanation: `Cấu trúc được sử dụng trong câu là "${grammarItem.structure}". Ý nghĩa: ${grammarItem.meaning}.`,
          relatedVocabOrGrammar: grammarItem.structure,
        };
      }
    };

    const geminiKey = process.env.GEMINI_API_KEY || userSetting?.geminiApiKey;

    // =========================================================================
    // TRƯỜNG HỢP 1: ÔN LUYỆN TỪ VỰNG (typeParam === 'vocab' hoặc dạng 1-5)
    // =========================================================================
    if (typeParam === 'vocab' || ['1', '2', '3', '4', '5'].includes(typeParam)) {
      const vocabQuestions: any[] = [];
      for (let i = 0; i < questionCount; i++) {
        const targetVocab = targetVocabs[i % targetVocabs.length];
        vocabQuestions.push(buildVocabQuestion(targetVocab, i));
      }

      return NextResponse.json({
        title: `Bài ôn luyện Từ vựng (${vocabQuestions.length} câu)`,
        total: vocabQuestions.length,
        isAIGenerated: false,
        questions: shuffle(vocabQuestions).map((q, idx) => ({ ...q, id: `q_${idx + 1}` })),
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: ÔN LUYỆN NGỮ PHÁP (typeParam === 'grammar' hoặc dạng 6-8)
    // =========================================================================
    if (typeParam === 'grammar' || ['6', '7', '8'].includes(typeParam)) {
      // Thử gọi AI Gemini nếu có key
      if (geminiKey && targetGrammars.length > 0) {
        const aiQuestions = await generateGeminiAIQuestions({
          apiKey: geminiKey,
          targetGrammars,
          count: questionCount,
        });

        if (aiQuestions && aiQuestions.length >= questionCount) {
          return NextResponse.json({
            title: `Bài ôn luyện Ngữ pháp AI (${aiQuestions.length} câu)`,
            total: aiQuestions.length,
            isAIGenerated: true,
            questions: aiQuestions.map((q, idx) => ({ ...q, id: `q_${idx + 1}` })),
          });
        }
      }

      // Bộ sinh động thông minh 12 động từ tiếng Hàn
      const grammarQuestions: any[] = [];
      for (let i = 0; i < questionCount; i++) {
        const targetGrammar = targetGrammars[i % targetGrammars.length];
        grammarQuestions.push(buildGrammarQuestion(targetGrammar, i));
      }

      return NextResponse.json({
        title: `Bài ôn luyện Ngữ pháp (${grammarQuestions.length} câu)`,
        total: grammarQuestions.length,
        isAIGenerated: false,
        questions: shuffle(grammarQuestions).map((q, idx) => ({ ...q, id: `q_${idx + 1}` })),
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 3: ĐỀ THI TỔNG HỢP HOÀN CHỈNH (typeParam === 'all' - FIX CỨNG 40 CÂU)
    // =========================================================================
    const total40 = 40;
    let vocabTargetCount = 20;
    let grammarTargetCount = 20;

    if (targetVocabs.length === 0) {
      vocabTargetCount = 0;
      grammarTargetCount = total40;
    } else if (targetGrammars.length === 0) {
      vocabTargetCount = total40;
      grammarTargetCount = 0;
    }

    let allGrammarQuestions: any[] = [];
    let isAI = false;

    // Sinh phần ngữ pháp (20 câu)
    if (grammarTargetCount > 0 && targetGrammars.length > 0) {
      if (geminiKey) {
        const aiQ = await generateGeminiAIQuestions({
          apiKey: geminiKey,
          targetGrammars,
          count: grammarTargetCount,
        });
        if (aiQ && aiQ.length >= grammarTargetCount) {
          allGrammarQuestions = aiQ;
          isAI = true;
        }
      }

      if (allGrammarQuestions.length === 0) {
        for (let i = 0; i < grammarTargetCount; i++) {
          const targetGrammar = targetGrammars[i % targetGrammars.length];
          allGrammarQuestions.push(buildGrammarQuestion(targetGrammar, i));
        }
      }
    }

    // Sinh phần từ vựng (20 câu)
    const allVocabQuestions: any[] = [];
    if (vocabTargetCount > 0 && targetVocabs.length > 0) {
      for (let i = 0; i < vocabTargetCount; i++) {
        const targetVocab = targetVocabs[i % targetVocabs.length];
        allVocabQuestions.push(buildVocabQuestion(targetVocab, i));
      }
    }

    // Trộn đều cả từ vựng và ngữ pháp thành 1 đề 40 câu hoàn chỉnh
    const combinedQuestions = shuffle([...allVocabQuestions, ...allGrammarQuestions]);
    const finalQuestions = combinedQuestions
      .slice(0, total40)
      .map((q, idx) => ({ ...q, id: `q_${idx + 1}` }));

    return NextResponse.json({
      title: 'Đề thi tổng hợp toàn diện (40 câu hoàn chỉnh)',
      total: finalQuestions.length,
      isAIGenerated: isAI,
      questions: finalQuestions,
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
