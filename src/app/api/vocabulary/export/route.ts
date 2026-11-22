import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx'; // 'xlsx' or 'csv'

    const vocabs = await prisma.vocabulary.findMany({
      include: { topic: true, lesson: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = vocabs.map((v) => ({
      'Từ tiếng Hàn': v.korean,
      'Phiên âm / Hán Hàn': v.hanja || '',
      'Nghĩa tiếng Việt': v.vietnamese,
      'Từ loại': v.partOfSpeech,
      'Ví dụ tiếng Hàn': v.exampleKorean || '',
      'Dịch nghĩa ví dụ': v.exampleVietnamese || '',
      'Chủ đề': v.topic?.name || '',
      'Bài học': v.lesson?.title || '',
      'Trạng thái': v.status === 'MASTERED' ? 'Đã thuộc' : v.status === 'LEARNING' ? 'Đang học' : 'Chưa học',
      'Ghi chú': v.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Từ vựng tiếng Hàn');

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return new Response('\uFEFF' + csvOutput, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="korean_vocabulary_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="korean_vocabulary_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Lỗi xuất dữ liệu Excel/CSV:', error);
    return NextResponse.json({ error: 'Không thể xuất file' }, { status: 500 });
  }
}
