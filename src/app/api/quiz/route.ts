import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const [allVocabs, allGrammars] = await Promise.all([
      prisma.vocabulary.findMany({ where: vocabWhere }),
      prisma.grammar.findMany({ where: grammarWhere }),
    ]);

    if (allVocabs.length < 2 && allGrammars.length < 2) {
      return NextResponse.json({
        error: 'Cần có ít nhất 2 từ vựng hoặc ngữ pháp trong hệ thống để tạo bài kiểm tra.',
      }, { status: 400 });
    }

    const questions: any[] = [];
    const questionCount = Math.min(countParam, 30);

    // Helpers
    const shuffle = <T>(array: T[]): T[] => array.slice().sort(() => Math.random() - 0.5);

    const getDistractors = (correct: string, pool: string[], count = 3): string[] => {
      const filtered = pool.filter((item) => item !== correct);
      const shuffled = shuffle(filtered);
      return shuffled.slice(0, count);
    };

    // Determine types to generate
    let typesToUse: number[] = [];
    if (typeParam !== 'all') {
      typesToUse = [parseInt(typeParam)];
    } else {
      typesToUse = [1, 2, 3, 4, 5, 6, 7, 8];
    }

    for (let i = 0; i < questionCount; i++) {
      const qType = typesToUse[Math.floor(Math.random() * typesToUse.length)];

      if (qType === 1 && allVocabs.length > 0) {
        // 1. Tiếng Hàn -> Chọn nghĩa tiếng Việt
        const target = allVocabs[Math.floor(Math.random() * allVocabs.length)];
        const distPool = allVocabs.map((v) => v.vietnamese);
        const distractors = getDistractors(target.vietnamese, distPool, 3);
        const options = shuffle([target.vietnamese, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 1,
          typeName: 'Tiếng Hàn → Chọn nghĩa tiếng Việt',
          question: target.korean,
          instruction: 'Chọn nghĩa tiếng Việt chính xác của từ tiếng Hàn trên:',
          options,
          correctAnswer: target.vietnamese,
          explanation: `"${target.korean}" (${target.partOfSpeech}) nghĩa là "${target.vietnamese}". ${target.exampleKorean ? `Ví dụ: ${target.exampleKorean} (${target.exampleVietnamese})` : ''}`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 2 && allVocabs.length > 0) {
        // 2. Tiếng Việt -> Chọn từ tiếng Hàn
        const target = allVocabs[Math.floor(Math.random() * allVocabs.length)];
        const distPool = allVocabs.map((v) => v.korean);
        const distractors = getDistractors(target.korean, distPool, 3);
        const options = shuffle([target.korean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 2,
          typeName: 'Tiếng Việt → Chọn từ tiếng Hàn',
          question: target.vietnamese,
          instruction: 'Chọn từ tiếng Hàn tương ứng với nghĩa trên:',
          options,
          correctAnswer: target.korean,
          explanation: `Nghĩa "${target.vietnamese}" trong tiếng Hàn là "${target.korean}". ${target.hanja ? `Phiên âm/Hán: ${target.hanja}.` : ''}`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 3 && allVocabs.filter((v) => v.exampleKorean).length > 0) {
        // 3. Điền từ còn thiếu vào câu
        const candidates = allVocabs.filter((v) => v.exampleKorean && v.exampleKorean.includes(v.korean));
        const target = (candidates.length > 0 ? candidates : allVocabs)[Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : allVocabs.length))];
        
        let maskedSentence = target.exampleKorean || `${target.korean}을/를 공부합니다.`;
        if (target.exampleKorean && target.exampleKorean.includes(target.korean)) {
          maskedSentence = target.exampleKorean.replace(target.korean, '[ _____ ]');
        } else {
          maskedSentence = `[ _____ ] (Dịch: ${target.vietnamese})`;
        }

        const distPool = allVocabs.map((v) => v.korean);
        const distractors = getDistractors(target.korean, distPool, 3);
        const options = shuffle([target.korean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 3,
          typeName: 'Điền từ còn thiếu vào câu',
          question: maskedSentence,
          instruction: `Nghĩa câu: "${target.exampleVietnamese || target.vietnamese}". Điền từ thích hợp vào chỗ trống:`,
          options,
          correctAnswer: target.korean,
          explanation: `Từ cần điền là "${target.korean}". Câu hoàn chỉnh: ${target.exampleKorean || target.korean} (${target.exampleVietnamese || target.vietnamese})`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 4 && allVocabs.length > 0) {
        // 4. Viết nghĩa tiếng Việt (tự gõ)
        const target = allVocabs[Math.floor(Math.random() * allVocabs.length)];
        questions.push({
          id: `q_${i + 1}`,
          type: 4,
          typeName: 'Viết nghĩa tiếng Việt',
          question: target.korean,
          instruction: `Hãy tự gõ nghĩa tiếng Việt của từ "${target.korean}" (${target.partOfSpeech}):`,
          correctAnswer: target.vietnamese,
          explanation: `Từ "${target.korean}" có nghĩa là: "${target.vietnamese}". ${target.notes ? `Ghi chú: ${target.notes}` : ''}`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 5 && allVocabs.length > 0) {
        // 5. Nhìn nghĩa tiếng Việt và tự gõ tiếng Hàn
        const target = allVocabs[Math.floor(Math.random() * allVocabs.length)];
        questions.push({
          id: `q_${i + 1}`,
          type: 5,
          typeName: 'Nhìn nghĩa tiếng Việt & Gõ từ tiếng Hàn',
          question: target.vietnamese,
          instruction: `Hãy gõ từ tiếng Hàn tương ứng với nghĩa "${target.vietnamese}" (${target.partOfSpeech}):`,
          correctAnswer: target.korean,
          explanation: `Đáp án chính xác là: "${target.korean}". ${target.hanja ? `Phiên âm: ${target.hanja}.` : ''}`,
          relatedVocabOrGrammar: target.korean,
        });
      } else if (qType === 6 && allGrammars.length > 0) {
        // 6. Trắc nghiệm nhận biết ngữ pháp
        const target = allGrammars[Math.floor(Math.random() * allGrammars.length)];
        const distPool = allGrammars.map((g) => g.meaning);
        const distractors = getDistractors(target.meaning, distPool, 3);
        const options = shuffle([target.meaning, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 6,
          typeName: 'Trắc nghiệm nhận biết ngữ pháp',
          question: target.structure,
          instruction: 'Chọn ý nghĩa và công dụng đúng của cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: target.meaning,
          explanation: `Ngữ pháp "${target.structure}": ${target.meaning}. Cách dùng: ${target.usage}. Công thức: ${target.formation}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 7 && allGrammars.length > 0) {
        // 7. Điền cấu trúc ngữ pháp vào câu
        const target = allGrammars[Math.floor(Math.random() * allGrammars.length)];
        const distPool = allGrammars.map((g) => g.structure);
        const distractors = getDistractors(target.structure, distPool, 3);
        const options = shuffle([target.structure, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 7,
          typeName: 'Điền cấu trúc ngữ pháp vào câu',
          question: `Ví dụ: ${target.exampleKorean}`,
          instruction: `Câu trên biểu đạt ý nghĩa: "${target.exampleVietnamese}". Ngữ pháp trọng tâm là:`,
          options,
          correctAnswer: target.structure,
          explanation: `Cấu trúc được sử dụng trong câu là "${target.structure}". Công thức: ${target.formation}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (qType === 8 && allGrammars.length > 0) {
        // 8. Chọn câu sử dụng ngữ pháp đúng
        const target = allGrammars[Math.floor(Math.random() * allGrammars.length)];
        const otherGrammarExamples = allGrammars
          .filter((g) => g.id !== target.id)
          .map((g) => g.exampleKorean);
        const distractors = getDistractors(target.exampleKorean, otherGrammarExamples, 3);
        const options = shuffle([target.exampleKorean, ...distractors]);

        questions.push({
          id: `q_${i + 1}`,
          type: 8,
          typeName: 'Chọn câu sử dụng ngữ pháp đúng',
          question: `Cấu trúc: ${target.structure} (${target.meaning})`,
          instruction: 'Chọn câu tiếng Hàn sử dụng chuẩn xác cấu trúc ngữ pháp trên:',
          options,
          correctAnswer: target.exampleKorean,
          explanation: `Câu đúng là: "${target.exampleKorean}" (Nghĩa: ${target.exampleVietnamese}). Cấu trúc "${target.structure}" có cách kết hợp: ${target.formation}.`,
          relatedVocabOrGrammar: target.structure,
        });
      } else if (allVocabs.length > 0) {
        // Fallback to Type 1
        const target = allVocabs[Math.floor(Math.random() * allVocabs.length)];
        const distPool = allVocabs.map((v) => v.vietnamese);
        const distractors = getDistractors(target.vietnamese, distPool, 3);
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
      title: typeParam === 'all' ? 'Bài kiểm tra tổng hợp' : `Bài kiểm tra dạng ${typeParam}`,
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

      // Check correctness:
      // Exact match or clean match for free typing
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
