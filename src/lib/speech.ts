/**
 * Web Speech API Helper for Korean Pronunciation
 */

export function speakKorean(text: string, rate: number = 0.9): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Trình duyệt không hỗ trợ Web Speech API.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/[\(\)\[\]\{\}\<\>\/\-\+\=\~]/g, ' ').trim();
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ko-KR';
  utterance.rate = rate; // 0.85 - 1.0 is natural for language learning
  utterance.pitch = 1.0;

  // Try to find native Korean voice if available
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find((v) => v.lang.startsWith('ko') || v.lang.includes('KR'));
  if (koVoice) {
    utterance.voice = koVoice;
  }

  window.speechSynthesis.speak(utterance);
}
