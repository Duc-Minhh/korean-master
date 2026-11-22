import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Bắt đầu xóa toàn bộ dữ liệu mẫu...');

  // 1. Xóa lịch sử ôn tập & kiểm tra
  await prisma.reviewHistory.deleteMany();
  await prisma.quizHistory.deleteMany();
  await prisma.favorite.deleteMany();

  // 2. Xóa toàn bộ từ vựng & ngữ pháp
  await prisma.vocabulary.deleteMany();
  await prisma.grammar.deleteMany();

  // 3. Xóa bài học, chương và giáo trình mẫu
  await prisma.lesson.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.textbook.deleteMany();

  // 4. Xóa nhật ký học tập mẫu
  await prisma.studyLog.deleteMany();

  // 5. Đặt lại cài đặt người dùng về trạng thái ban đầu sạch sẽ
  await prisma.userSetting.upsert({
    where: { id: 'default-user' },
    update: {
      name: 'Người học tiếng Hàn',
      targetWordsPerDay: 10,
      targetReviewPerDay: 15,
      streakCount: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
    },
    create: {
      id: 'default-user',
      name: 'Người học tiếng Hàn',
      targetWordsPerDay: 10,
      targetReviewPerDay: 15,
      streakCount: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
    },
  });

  console.log('✨ Đã xóa toàn bộ dữ liệu mẫu thành công! Kho dữ liệu hiện đã sẵn sàng để bạn tự nhập.');
}

main()
  .catch((e) => {
    console.error('Lỗi khi xóa dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
