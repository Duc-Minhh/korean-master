import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu giáo trình Tiếng Hàn...');

  // 1. Tạo cài đặt người dùng mặc định
  await prisma.userSetting.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      name: 'Học viên chăm chỉ',
      targetWordsPerDay: 10,
      targetReviewPerDay: 15,
      theme: 'light',
      streakCount: 3,
      lastActiveDate: new Date().toISOString().split('T')[0],
    },
  });

  // 2. Tạo các Topics phổ biến
  const topicsData = [
    { name: 'Chào hỏi & Giao tiếp cơ bản', icon: 'Smile', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Quốc tịch & Đất nước', icon: 'Globe', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Nghề nghiệp', icon: 'Briefcase', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'Trường học & Học tập', icon: 'GraduationCap', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Đồ vật & Đồ dùng', icon: 'Package', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Gia đình', icon: 'Users', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { name: 'Ăn uống & Nhà hàng', icon: 'Utensils', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { name: 'Mua sắm & Giá cả', icon: 'ShoppingBag', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];

  const topicMap: Record<string, string> = {};
  for (const t of topicsData) {
    const topic = await prisma.topic.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
    topicMap[t.name] = topic.id;
  }

  // 3. Tạo Giáo trình "Tiếng Hàn Tổng Hợp Sơ Cấp 1"
  const existingTextbook = await prisma.textbook.findFirst({
    where: { title: 'Tiếng Hàn Tổng Hợp Sơ Cấp 1' },
  });

  let textbookId = existingTextbook?.id;
  if (!textbookId) {
    const tb = await prisma.textbook.create({
      data: {
        title: 'Tiếng Hàn Tổng Hợp Sơ Cấp 1',
        level: 'Sơ cấp 1',
        description: 'Giáo trình chuẩn dành cho người Việt Nam bắt đầu học tiếng Hàn từ số 0.',
        color: 'from-blue-600 to-indigo-700',
      },
    });
    textbookId = tb.id;
  }

  // 4. Tạo Chương 1: Giới thiệu bản thân (자기소개)
  let ch1 = await prisma.chapter.findFirst({
    where: { textbookId, title: 'Chương 1: Giới thiệu bản thân (자기소개)' },
  });
  if (!ch1) {
    ch1 = await prisma.chapter.create({
      data: {
        title: 'Chương 1: Giới thiệu bản thân (자기소개)',
        order: 1,
        textbookId: textbookId!,
      },
    });
  }

  // 5. Tạo Bài 1: Chào hỏi và Làm quen (인사하기)
  let lesson1 = await prisma.lesson.findFirst({
    where: { chapterId: ch1.id, title: 'Bài 1: Chào hỏi và Làm quen (인사하기)' },
  });
  if (!lesson1) {
    lesson1 = await prisma.lesson.create({
      data: {
        title: 'Bài 1: Chào hỏi và Làm quen (인사하기)',
        order: 1,
        chapterId: ch1.id,
      },
    });
  }

  // Tạo Bài 2: Quốc tịch và Nghề nghiệp (국적과 직업)
  let lesson2 = await prisma.lesson.findFirst({
    where: { chapterId: ch1.id, title: 'Bài 2: Quốc tịch và Nghề nghiệp (국적과 직업)' },
  });
  if (!lesson2) {
    lesson2 = await prisma.lesson.create({
      data: {
        title: 'Bài 2: Quốc tịch và Nghề nghiệp (국적과 직업)',
        order: 2,
        chapterId: ch1.id,
      },
    });
  }

  // 6. Dữ liệu Từ vựng mẫu chất lượng cao
  const sampleVocab = [
    {
      korean: '안녕하세요',
      hanja: 'an-nyeong-ha-se-yo',
      vietnamese: 'Xin chào',
      partOfSpeech: 'Thán từ',
      exampleKorean: '안녕하세요! 저는 민수입니다.',
      exampleVietnamese: 'Xin chào! Tôi là Min-soo.',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
      notes: 'Lời chào thông dụng, lịch sự trong tiếng Hàn.',
      status: 'MASTERED',
      srsStep: 3,
      srsInterval: 7,
      nextReviewDate: new Date(Date.now() + 7 * 86400000),
    },
    {
      korean: '감사합니다',
      hanja: 'gam-sa-ham-ni-da',
      vietnamese: 'Cảm ơn (trang trọng)',
      partOfSpeech: 'Thán từ',
      exampleKorean: '도와주셔서 정말 감사합니다.',
      exampleVietnamese: 'Thực sự cảm ơn vì đã giúp đỡ tôi.',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
      notes: 'Gốc Hán CẢM TẠ (感謝)',
      status: 'MASTERED',
      srsStep: 2,
      srsInterval: 3,
      nextReviewDate: new Date(Date.now() + 3 * 86400000),
    },
    {
      korean: '죄송합니다',
      hanja: 'joe-song-ham-ni-da',
      vietnamese: 'Xin lỗi (trang trọng)',
      partOfSpeech: 'Thán từ',
      exampleKorean: '늦어서 죄송합니다.',
      exampleVietnamese: 'Tôi xin lỗi vì đã đến muộn.',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
      notes: 'Gốc Hán TỘI TÙNG (罪悚)',
      status: 'LEARNING',
      srsStep: 1,
      srsInterval: 1,
      nextReviewDate: new Date(),
    },
    {
      korean: '안녕히 계세요',
      hanja: 'an-nyeong-hi gye-se-yo',
      vietnamese: 'Tạm biệt (nói với người ở lại)',
      partOfSpeech: 'Cụm từ',
      exampleKorean: '먼저 갑니다. 안녕히 계세요!',
      exampleVietnamese: 'Tôi về trước nhé. Xin chào ở lại mạnh giỏi!',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
      notes: 'Dùng khi mình là người rời đi, đối phương ở lại.',
      status: 'LEARNING',
      srsStep: 1,
      srsInterval: 1,
      nextReviewDate: new Date(),
    },
    {
      korean: '안녕히 가세요',
      hanja: 'an-nyeong-hi ga-se-yo',
      vietnamese: 'Tạm biệt (nói với người đi về)',
      partOfSpeech: 'Cụm từ',
      exampleKorean: '조심히 가세요. 안녕히 가세요!',
      exampleVietnamese: 'Đi cẩn thận nhé. Tạm biệt quý khách!',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
      notes: 'Dùng khi mình ở lại, đối phương rời đi (từ gốc 가다: đi).',
      status: 'LEARNING',
      srsStep: 1,
      srsInterval: 1,
      nextReviewDate: new Date(),
    },
    {
      korean: '베트남',
      hanja: 'be-teu-nam',
      vietnamese: 'Việt Nam',
      partOfSpeech: 'Danh từ',
      exampleKorean: '저는 베트남 사람입니다.',
      exampleVietnamese: 'Tôi là người Việt Nam.',
      topicId: topicMap['Quốc tịch & Đất nước'],
      lessonId: lesson2.id,
      notes: 'Tên đất nước Việt Nam.',
      status: 'MASTERED',
      srsStep: 4,
      srsInterval: 14,
    },
    {
      korean: '한국',
      hanja: 'hang-guk',
      vietnamese: 'Hàn Quốc',
      partOfSpeech: 'Danh từ',
      exampleKorean: '한국어를 열심히 공부합니다.',
      exampleVietnamese: 'Tôi học tiếng Hàn chăm chỉ.',
      topicId: topicMap['Quốc tịch & Đất nước'],
      lessonId: lesson2.id,
      notes: 'Gốc Hán HÀN QUỐC (韓國)',
      status: 'MASTERED',
      srsStep: 4,
      srsInterval: 14,
    },
    {
      korean: '선생님',
      hanja: 'seon-saeng-nim',
      vietnamese: 'Giáo viên, thầy/cô giáo',
      partOfSpeech: 'Danh từ',
      exampleKorean: '선생님께서 친절하게 가르쳐 주십니다.',
      exampleVietnamese: 'Thầy giáo dạy rất ân cần.',
      topicId: topicMap['Nghề nghiệp'],
      lessonId: lesson2.id,
      notes: 'Gốc Hán TIÊN SINH (先生) + kính ngữ 님',
      status: 'LEARNING',
      srsStep: 1,
      srsInterval: 1,
      nextReviewDate: new Date(),
    },
    {
      korean: '학생',
      hanja: 'hak-saeng',
      vietnamese: 'Học sinh, sinh viên',
      partOfSpeech: 'Danh từ',
      exampleKorean: '남 씨는 대학교 학생입니다.',
      exampleVietnamese: 'Nam là sinh viên đại học.',
      topicId: topicMap['Nghề nghiệp'],
      lessonId: lesson2.id,
      notes: 'Gốc Hán HỌC SINH (學生)',
      status: 'MASTERED',
      srsStep: 3,
      srsInterval: 7,
    },
    {
      korean: '회사원',
      hanja: 'hoe-sa-won',
      vietnamese: 'Nhân viên công ty',
      partOfSpeech: 'Danh từ',
      exampleKorean: '제 형은 한국 회사원입니다.',
      exampleVietnamese: 'Anh trai tôi là nhân viên công ty Hàn Quốc.',
      topicId: topicMap['Nghề nghiệp'],
      lessonId: lesson2.id,
      notes: 'Gốc Hán HỘI XÃ VIÊN (會社員)',
      status: 'NOT_LEARNED',
      srsStep: 0,
    },
    {
      korean: '의사',
      hanja: 'ui-sa',
      vietnamese: 'Bác sĩ',
      partOfSpeech: 'Danh từ',
      exampleKorean: '민우의 꿈은 의사입니다.',
      exampleVietnamese: 'Ước mơ của Minwoo là làm bác sĩ.',
      topicId: topicMap['Nghề nghiệp'],
      lessonId: lesson2.id,
      notes: 'Gốc Hán Y SƯ (醫師)',
      status: 'NOT_LEARNED',
      srsStep: 0,
    },
    {
      korean: '책상',
      hanja: 'chaek-sang',
      vietnamese: 'Bàn học, bàn làm việc',
      partOfSpeech: 'Danh từ',
      exampleKorean: '책상 위에 책이 있습니다.',
      exampleVietnamese: 'Trên bàn có sách.',
      topicId: topicMap['Đồ vật & Đồ dùng'],
      lessonId: lesson1.id,
      notes: 'Gốc Hán SÁCH SÀNG (冊床)',
      status: 'NOT_LEARNED',
      srsStep: 0,
    },
  ];

  for (const v of sampleVocab) {
    const existing = await prisma.vocabulary.findFirst({
      where: { korean: v.korean },
    });
    if (!existing) {
      await prisma.vocabulary.create({ data: v });
    }
  }

  // 7. Dữ liệu Ngữ pháp mẫu chuẩn
  const sampleGrammar = [
    {
      structure: 'N + 은/는',
      meaning: 'Là tiểu từ chủ đề đặt sau danh từ để biểu thị chủ ngữ hoặc chủ đề được nói tới.',
      usage: 'Dùng gắn sau danh từ làm chủ đề của câu, dùng để giới thiệu, giải thích hoặc nhấn mạnh sự đối chiếu, so sánh.',
      formation: 'Danh từ có patchim (phụ âm cuối) + 은\nDanh từ không có patchim + 는\nVí dụ: 사람 + 은 -> 사람은, 저 + 는 -> 저는',
      exceptions: 'Khi đối chiếu hai vế trái ngược nhau, thường dùng 은/는 ở cả hai vế.',
      exampleKorean: '저는 베트남 사람입니다. 마이클 씨는 미국 사람입니다.',
      exampleVietnamese: 'Tôi là người Việt Nam. Còn Michael là người Mỹ.',
      similarGrammar: 'N + 이/가: 이/가 nhấn mạnh vào chính chủ ngữ thực hiện hành động hoặc thông tin mới xuất hiện, trong khi 은/는 nhấn mạnh vị ngữ hoặc chủ đề câu chuyện.',
      notes: 'Ngữ pháp cơ bản số 1 của Tiếng Hàn sơ cấp.',
      status: 'MASTERED',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
    },
    {
      structure: 'N + 입니다 / 입니까?',
      meaning: 'Là... / Có phải là... không? (Đuôi câu trang trọng, kính cẩn)',
      usage: 'Gắn trực tiếp vào sau danh từ, dùng trong giao tiếp trang trọng, phỏng vấn, thuyết trình, phát thanh hoặc lần đầu gặp gỡ.',
      formation: 'Danh từ (có hoặc không có patchim đều giống nhau) + 입니다 (câu trần thuật)\nDanh từ + 입니까? (câu hỏi nghi vấn)\nVí dụ: 학생 + 입니다 -> 학생입니다. 의사 + 입니까? -> 의사입니까?',
      exceptions: 'Không phân biệt danh từ có patchim hay không patchim. Chú ý phát âm biến âm: ㅂ đứng trước ㄴ phát âm thành [ㅁ] (im-ni-da).',
      exampleKorean: '저는 한국 대학교 학생입니다. 당신은 선생님입니까?',
      exampleVietnamese: 'Tôi là sinh viên trường Đại học Hàn Quốc. Bạn có phải là giáo viên không?',
      similarGrammar: 'N + 이에요/예요: cũng mang nghĩa "là" nhưng dùng trong ngữ cảnh thân mật, đời thường hơn (dạng 해요체).',
      notes: 'Gốc động từ là 이다 (là). Phủ định là N + 이/가 아닙니다.',
      status: 'MASTERED',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson1.id,
    },
    {
      structure: 'N + 이/가 아닙니다',
      meaning: 'Không phải là... (Phủ định của N + 입니다)',
      usage: 'Dùng để phủ định danh từ đứng trước, mang nghĩa "không phải là cái gì/ai đó".',
      formation: 'Danh từ có patchim + 이 아닙니다\nDanh từ không có patchim + 가 아닙니다\nVí dụ: 학생 + 이 아닙니다 -> 학생이 아닙니다, 의사 + 가 아닙니다 -> 의사가 아닙니다',
      exceptions: 'Đuôi thân mật lịch sự tương ứng là N + 이/가 아니에요.',
      exampleKorean: '저는 일본 사람이 아닙니다. 베트남 사람입니다.',
      exampleVietnamese: 'Tôi không phải là người Nhật Bản. Tôi là người Việt Nam.',
      similarGrammar: '안 + V/A: phủ định hành động/tính chất (không làm gì, không thế nào). Còn 이/가 아닙니다 là phủ định danh tính/sự vật.',
      notes: 'Luôn phải có tiểu từ 이 hoặc 가 đi kèm danh từ trước 아닙니다.',
      status: 'LEARNING',
      topicId: topicMap['Chào hỏi & Giao tiếp cơ bản'],
      lessonId: lesson2.id,
    },
    {
      structure: 'V/A + -ㅂ니다/습니다',
      meaning: 'Đuôi câu kính ngữ trang trọng thì hiện tại.',
      usage: 'Gắn vào thân động từ hoặc tính từ, dùng để trần thuật sự thật hoặc hành động một cách tôn kính và lịch sự.',
      formation: 'Thân V/A không có patchim + -ㅂ니다\nThân V/A có patchim + -습니다\nNghi vấn: -ㅂ니까? / -습니까?\nVí dụ: 가다 -> 갑니다, 먹다 -> 먹습니다',
      exceptions: 'Thân có patchim ㄹ thì lược bỏ ㄹ rồi cộng với -ㅂ니다 (살다 -> 삽니다, 만들다 -> 만듭니다).',
      exampleKorean: '저는 매일 아침 도서관에서 한국어를 공부합니다.',
      exampleVietnamese: 'Tôi học tiếng Hàn ở thư viện mỗi buổi sáng.',
      similarGrammar: '-아/어요: dạng đuôi câu thân mật đời sống thường ngày.',
      notes: 'Rất hay xuất hiện trong đề thi Topik và các cuộc hội thoại công sở.',
      status: 'LEARNING',
      topicId: topicMap['Trường học & Học tập'],
      lessonId: lesson2.id,
    },
  ];

  for (const g of sampleGrammar) {
    const existing = await prisma.grammar.findFirst({
      where: { structure: g.structure },
    });
    if (!existing) {
      await prisma.grammar.create({ data: g });
    }
  }

  // 8. Tạo một số Study Log để Dashboard có biểu đồ sống động ngay lập tức
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    await prisma.studyLog.upsert({
      where: { date: dateStr },
      update: {},
      create: {
        date: dateStr,
        wordsLearned: 5 + Math.floor(Math.random() * 8),
        grammarLearned: 1 + Math.floor(Math.random() * 3),
        reviewsCompleted: 8 + Math.floor(Math.random() * 12),
        quizzesCompleted: 1 + Math.floor(Math.random() * 2),
      },
    });
  }

  console.log('✅ Khởi tạo dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
