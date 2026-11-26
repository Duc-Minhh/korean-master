import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const TRANSLATION_THEMES = [
  'sinh hoạt hằng ngày ở nhà và gia đình',
  'học tập trên lớp, thư viện và thi cử',
  'đi mua sắm, siêu thị, quán cà phê và ăn uống',
  'du lịch, cuối tuần, gặp gỡ bạn bè và giải trí',
  'công việc văn phòng, kế hoạch tương lai và sức khỏe',
];

function cleanPlainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
}

async function callGeminiJson<T>({
  apiKey,
  input,
  schema,
}: {
  apiKey: string;
  input: string;
  schema: Record<string, any>;
}): Promise<T | null> {
  const ai = new GoogleGenAI({ apiKey });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Disable SDK internal retries (which call Request.clone() and fail in Node 20/Next.js)
      // and handle retries cleanly with a fresh request per attempt.
      const interaction = await ai.interactions.create(
        {
          model: GEMINI_MODEL,
          store: false,
          input,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema,
          },
        },
        { maxRetries: 0, timeout: 25000 }
      );
      const text = interaction.output_text?.trim() || '';
      if (!text) return null;
      return JSON.parse(text) as T;
    } catch (err) {
      console.warn(`Lỗi gọi Gemini API (lần ${attempt + 1}/3):`, err);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  return null;
}

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

/**
 * Generate fresh Vietnamese -> Korean translation exercises using Gemini AI.
 * Each invocation uses randomized context themes and a nonce so every session feels new.
 */
async function generateTranslationQuestions({
  apiKey,
  targetGrammars,
  count,
}: {
  apiKey: string;
  targetGrammars: any[];
  count: number;
}) {
  const grammarBrief = targetGrammars
    .map(
      (g, idx) =>
        `${idx + 1}. Cấu trúc: "${g.structure}" | Nghĩa: "${g.meaning}" | Cách dùng: "${
          g.usage || ''
        }" | Công thức: "${g.formation || ''}" | Ví dụ tham khảo (KHÔNG dùng lại câu này): "${
          g.exampleVietnamese
        }" -> "${g.exampleKorean}"`
    )
    .join('\n');

  const shuffledThemes = TRANSLATION_THEMES.slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join('; ');
  const sessionSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const prompt = `Bạn là giáo viên tiếng Hàn giàu kinh nghiệm.
Mã phiên luyện tập ngẫu nhiên: ${sessionSeed}
Nhiệm vụ: Tạo đúng ${count} câu bài tập luyện dịch Tiếng Việt → Tiếng Hàn HOÀN TOÀN MỚI cho học viên.

Danh sách cấu trúc ngữ pháp mục tiêu:
${grammarBrief}

YÊU CẦU BẮT BUỘC:
1. Tạo ĐÚNG ${count} câu tiếng Việt tự nhiên, gần gũi đời sống, thuộc các bối cảnh khác nhau (gợi ý: ${shuffledThemes}).
2. TUYỆT ĐỐI KHÔNG chép lại hoặc chỉ sửa nhẹ các "Ví dụ tham khảo" ở trên. Mỗi câu phải dùng động từ/tính từ, chủ ngữ, địa điểm hoặc hoàn cảnh khác nhau.
3. Mỗi câu tập trung luyện MỘT cấu trúc ngữ pháp cụ thể trong danh sách (phân bổ đều qua toàn bộ danh sách; nếu số câu hỏi nhiều hơn số ngữ pháp thì tạo các tình huống hoàn toàn khác biệt cho cùng cấu trúc đó).
4. Trường "vietnamese" phải viết bằng Tiếng Việt tự nhiên, rõ nghĩa để người học dịch sang tiếng Hàn.
5. Trường "grammarStructure" ghi chính xác tên cấu trúc trong danh sách mục tiêu.
6. Trường "korean" là 1 câu tiếng Hàn tự nhiên, chuẩn ngữ pháp dùng cấu trúc đó, DỊCH CHÍNH XÁC từng chi tiết ngữ nghĩa (tên quốc gia, địa điểm, thời gian, chủ ngữ) khớp với câu "vietnamese".
7. Trường "explanation" giải thích ngắn gọn bằng tiếng Việt: quy tắc chia cấu trúc (patchim / không patchim / bất quy tắc nếu có) và từ vựng quan trọng trong câu.
8. Trường "grammarStructure" chỉ ghi đúng tên cấu trúc (không thêm tiền tố "Cấu trúc:"), tuyệt đối chỉ trả về văn bản thuần, KHÔNG chèn thẻ HTML (như <b>, <i>) hay ký tự Markdown (**...**).`;

  const data = await callGeminiJson<{
    questions: {
      vietnamese: string;
      grammarStructure: string;
      grammarMeaning: string;
      korean: string;
      explanation: string;
    }[];
  }>({
    apiKey,
    input: prompt,
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              vietnamese: { type: 'string' },
              grammarStructure: { type: 'string' },
              grammarMeaning: { type: 'string' },
              korean: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['vietnamese', 'grammarStructure', 'grammarMeaning', 'korean', 'explanation'],
          },
        },
      },
      required: ['questions'],
    },
  });

  if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return null;
  }

  return data.questions.slice(0, count).map((item, idx) => {
    const rawStructure = cleanPlainText(item.grammarStructure)
      .replace(/^cấu\s*trúc\s*:\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    const matchedGrammar =
      targetGrammars.find((g) => {
        const gs = g.structure.trim().toLowerCase();
        const rs = rawStructure.toLowerCase();
        return gs === rs || rs.includes(gs) || gs.includes(rs);
      }) || targetGrammars[idx % targetGrammars.length];

    const structureLabel = matchedGrammar?.structure || rawStructure || 'Ngữ pháp';

    return {
      id: `q_${idx + 1}`,
      type: 9,
      typeName: 'Dịch Việt → Hàn',
      question: cleanPlainText(item.vietnamese),
      instruction: `Hãy dịch câu tiếng Việt sau sang tiếng Hàn bằng cấu trúc đã học:`,
      grammarStructure: structureLabel,
      grammarMeaning: cleanPlainText(item.grammarMeaning || matchedGrammar?.meaning || ''),
      correctAnswer: cleanPlainText(item.korean),
      explanation: cleanPlainText(item.explanation),
      relatedVocabOrGrammar: matchedGrammar?.structure || structureLabel,
    };
  });
}

/**
 * Evaluate free-form Korean translations in batch with Gemini AI.
 * Accepts valid synonyms, omitted subjects, and different polite endings as long as
 * meaning and target grammar usage are accurate.
 */
async function gradeTranslationAnswers({
  apiKey,
  items,
}: {
  apiKey: string;
  items: {
    id: string;
    vietnamese: string;
    grammarStructure: string;
    referenceKorean: string;
    userKorean: string;
  }[];
}) {
  if (items.length === 0) return null;

  const itemList = items
    .map(
      (it, idx) =>
        `${idx + 1}. [id=${it.id}] Câu Việt: "${it.vietnamese}" | Ngữ pháp yêu cầu: "${it.grammarStructure}" | Câu tham khảo: "${it.referenceKorean}" | Học viên viết: "${it.userKorean}"`
    )
    .join('\n');

  const prompt = `Bạn là giáo viên tiếng Hàn đang chấm bài tập dịch Việt → Hàn cho học viên.

Danh sách câu cần chấm:
${itemList}

TIÊU CHÍ CHẤM ĐIỂM CÔNG BẰNG:
1. "isCorrect" = true nếu câu của học viên:
   - Truyền đạt đúng ý nghĩa câu tiếng Việt (CHẤP NHẬN từ đồng nghĩa tự nhiên như 엄마/어머니, lược bỏ chủ ngữ 저는, đổi trật tự từ hợp lý, hoặc dùng đuôi câu -아/어요 / -습니다 / -(으)ㄹ 거예요 hợp ngữ cảnh).
   - Áp dụng đúng cấu trúc ngữ pháp yêu cầu và chia động từ/tính từ chuẩn (bỏ qua lỗi dấu câu '.', ',', '?' hoặc dấu cách nhỏ không làm sai nghĩa).
2. "isCorrect" = false nếu:
   - Sai cấu trúc ngữ pháp mục tiêu, chia sai patchim/bất quy tắc, sai thì nghiêm trọng, thiếu ý chính hoặc viết sai nghĩa câu.
3. "feedback": Nhận xét ngắn gọn, rõ ràng, thân thiện bằng tiếng Việt (nêu điểm đúng và chỉ rõ chỗ sai về ngữ pháp/tiểu từ/từ vựng nếu có).
4. "correctedKorean": Nếu học viên sai hoặc diễn đạt chưa tự nhiên, viết câu tiếng Hàn đã sửa sát với ý học viên nhất; nếu đã đúng hoàn toàn, viết chính câu hay/tự nhiên nhất.`;

  const data = await callGeminiJson<{
    results: {
      id: string;
      isCorrect: boolean;
      feedback: string;
      correctedKorean: string;
    }[];
  }>({
    apiKey,
    input: prompt,
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              isCorrect: { type: 'boolean' },
              feedback: { type: 'string' },
              correctedKorean: { type: 'string' },
            },
            required: ['id', 'isCorrect', 'feedback', 'correctedKorean'],
          },
        },
      },
      required: ['results'],
    },
  });

  if (!data?.results || !Array.isArray(data.results)) return null;

  const map: Record<string, { isCorrect: boolean; feedback: string; correctedKorean: string }> = {};
  for (const r of data.results) {
    if (r?.id) {
      map[r.id] = {
        isCorrect: Boolean(r.isCorrect),
        feedback: cleanPlainText(r.feedback),
        correctedKorean: cleanPlainText(r.correctedKorean),
      };
    }
  }
  return map;
}

// Call Google Gemini AI to generate completely dynamic, non-repeating TOPIK multiple-choice questions
async function generateGeminiAIQuestions({
  apiKey,
  targetGrammars,
  count,
}: {
  apiKey: string;
  targetGrammars: any[];
  count: number;
}) {
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
1. MỖI CÂU HỎI TRONG ${count} CÂU PHẢI HOÀN TOÀN KHÁC NHAU VỀ NGỮ CẢNH, ĐỘNG TỪ VÀ CHỦ ĐỀ.
2. Tận dụng đa dạng chủ đề cuộc sống tự nhiên: công việc, trường học, gia đình, du lịch, ăn uống, sở thích, thời tiết...
3. Các dạng câu hỏi phong phú (type 6, 7 hoặc 8):
   - Dạng 7: Điền dạng chia đúng của động từ vào chỗ trống [ _____ ] trong câu.
   - Dạng 6: Cho câu hoặc ý nghĩa, chọn cấu trúc ngữ pháp phù hợp.
   - Dạng 8: Chọn câu tiếng Hàn sử dụng đúng ngữ pháp nhất trong 4 phương án.
4. Mỗi câu hỏi gồm đủ 4 phương án trắc nghiệm độc lập, trong đó chỉ có 1 phương án đúng nằm trong "options".
5. Giải thích (explanation) chi tiết bằng tiếng Việt.`;

  const data = await callGeminiJson<{
    questions: {
      type: number;
      typeName: string;
      question: string;
      instruction: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      relatedVocabOrGrammar: string;
    }[];
  }>({
    apiKey,
    input: prompt,
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'integer' },
              typeName: { type: 'string' },
              question: { type: 'string' },
              instruction: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
              relatedVocabOrGrammar: { type: 'string' },
            },
            required: [
              'type',
              'typeName',
              'question',
              'instruction',
              'options',
              'correctAnswer',
              'explanation',
              'relatedVocabOrGrammar',
            ],
          },
        },
      },
      required: ['questions'],
    },
  });

  if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
    return null;
  }

  return data.questions.slice(0, count).map((q, idx) => ({
    id: `q_${idx + 1}`,
    ...q,
  }));
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
    } else if (typeParam === 'grammar' || typeParam === 'grammar-translate') {
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
    // TRƯỜNG HỢP 2: ÔN LUYỆN NGỮ PHÁP - DỊCH VIỆT → HÀN (typeParam === 'grammar' hoặc 'grammar-translate')
    // =========================================================================
    if (typeParam === 'grammar' || typeParam === 'grammar-translate') {
      if (targetGrammars.length === 0) {
        return NextResponse.json(
          { error: 'Bài học này hiện chưa có cấu trúc ngữ pháp nào để luyện tập.' },
          { status: 400 }
        );
      }

      if (geminiKey) {
        const translationQuestions = await generateTranslationQuestions({
          apiKey: geminiKey,
          targetGrammars,
          count: questionCount,
        });

        if (translationQuestions && translationQuestions.length > 0) {
          return NextResponse.json({
            title: `Ôn luyện Ngữ pháp · Dịch Việt → Hàn AI (${translationQuestions.length} câu)`,
            total: translationQuestions.length,
            isAIGenerated: true,
            questions: translationQuestions.map((q: any, idx: number) => ({ ...q, id: `q_${idx + 1}` })),
          });
        }
      }

      // Fallback nếu chưa cấu hình Gemini Key hoặc AI tạm gián đoạn
      const shuffledGrammars = shuffle(targetGrammars);
      const fallbackQuestions = Array.from({ length: Math.min(questionCount, Math.max(targetGrammars.length, 1)) }, (_, idx) => {
        const g = shuffledGrammars[idx % shuffledGrammars.length];
        return {
          id: `q_${idx + 1}`,
          type: 9,
          typeName: 'Dịch Việt → Hàn',
          question: g.exampleVietnamese || `Hãy viết một câu ví dụ bằng tiếng Hàn với cấu trúc ${g.structure}`,
          instruction: `Hãy dịch câu tiếng Việt sau sang tiếng Hàn bằng cấu trúc đã học:`,
          grammarStructure: g.structure,
          grammarMeaning: g.meaning,
          correctAnswer: g.exampleKorean || '',
          explanation: `Cấu trúc "${g.structure}": ${g.meaning}. ${g.usage ? `Cách dùng: ${g.usage}. ` : ''}${
            g.formation ? `Công thức: ${g.formation}` : ''
          }`,
          relatedVocabOrGrammar: g.structure,
        };
      });

      return NextResponse.json({
        title: `Ôn luyện Ngữ pháp · Dịch Việt → Hàn (${fallbackQuestions.length} câu)`,
        total: fallbackQuestions.length,
        isAIGenerated: false,
        questions: fallbackQuestions,
      });
    }

    // =========================================================================
    // TRƯỜNG HỢP 2C: NGỮ PHÁP TRẮC NGHIỆM LEGACY (dạng 6-8)
    // =========================================================================
    if (['6', '7', '8'].includes(typeParam)) {
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

    // Batch AI grading for Type 9 (Vietnamese -> Korean translation)
    const nonEmptyType9Items = questions
      .filter((q: any) => q.type === 9 && String(userAnswers[q.id] || '').trim().length > 0)
      .map((q: any) => ({
        id: String(q.id),
        vietnamese: String(q.question || ''),
        grammarStructure: String(q.grammarStructure || q.relatedVocabOrGrammar || ''),
        referenceKorean: String(q.correctAnswer || ''),
        userKorean: String(userAnswers[q.id] || '').trim(),
      }));

    let aiGrades: Record<string, { isCorrect: boolean; feedback: string; correctedKorean: string }> | null = null;
    if (nonEmptyType9Items.length > 0) {
      const userSetting = await prisma.userSetting.findUnique({ where: { id: 'default-user' } });
      const geminiKey = process.env.GEMINI_API_KEY || userSetting?.geminiApiKey;
      if (geminiKey) {
        aiGrades = await gradeTranslationAnswers({
          apiKey: geminiKey,
          items: nonEmptyType9Items,
        });
      }
    }

    let correctCount = 0;
    const evaluatedQuestions = questions.map((q: any) => {
      const userAns = String(userAnswers[q.id] || '').trim();
      const correctAns = String(q.correctAnswer || '').trim();

      let isCorrect = false;
      let aiFeedback: string | undefined;
      let correctedAnswer: string | undefined;

      if (q.type === 4 || q.type === 5) {
        const cleanUser = userAns.toLowerCase().replace(/[\,\.\;\:]/g, '');
        const cleanCorrect = correctAns.toLowerCase().replace(/[\,\.\;\:]/g, '');
        isCorrect =
          cleanUser === cleanCorrect ||
          cleanCorrect.includes(cleanUser) ||
          cleanUser.includes(cleanCorrect);
      } else if (q.type === 9) {
        if (!userAns) {
          isCorrect = false;
          aiFeedback = 'Bạn chưa nhập câu trả lời tiếng Hàn.';
        } else if (aiGrades?.[q.id]) {
          isCorrect = Boolean(aiGrades[q.id].isCorrect);
          aiFeedback = aiGrades[q.id].feedback;
          correctedAnswer = aiGrades[q.id].correctedKorean;
        } else {
          // Offline/fallback grading: compare normalized Hangul strings cleanly (avoid trivial 1-char substring hits)
          const cleanUser = userAns.replace(/[\s\.\,\!\?\~]/g, '').toLowerCase();
          const cleanCorrect = correctAns.replace(/[\s\.\,\!\?\~]/g, '').toLowerCase();
          const hasHangul = /[가-힣]/.test(cleanUser);
          isCorrect = Boolean(hasHangul && cleanCorrect && cleanUser === cleanCorrect);
          aiFeedback = isCorrect
            ? 'Chính xác!'
            : 'Chấm cơ bản theo so khớp trực tiếp (AI tạm không phản hồi). Hãy đối chiếu cấu trúc câu của bạn với câu gợi ý bên dưới.';
        }
      } else {
        isCorrect = userAns.toLowerCase() === correctAns.toLowerCase();
      }

      if (isCorrect) correctCount++;

      return {
        ...q,
        userAnswer: userAns,
        isCorrect,
        ...(aiFeedback ? { aiFeedback } : {}),
        ...(correctedAnswer ? { correctedAnswer } : {}),
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
