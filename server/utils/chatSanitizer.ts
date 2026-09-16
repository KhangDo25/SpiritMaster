// Task 12.1 - Room Chat Sanitizer & Profanity Filter

const BANNED_WORDS = [
  'dm', 'đm', 'dcm', 'đcm', 'cl', 'clgt', 'vcl', 'vl', 'loz', 'lồn', 'buồi', 'cặc',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'đụ', 'đụ má'
];

// Simple in-memory rate limiting: max 5 messages per 5 seconds per user
const userMessageTimes = new Map<string, number[]>();

export class ChatSanitizer {
  static sanitizeText(text: string): string {
    if (!text) return '';
    // Strip HTML tags to prevent XSS
    let clean = text.replace(/<[^>]*>?/gm, '').trim();
    // Enforce max length of 150 chars
    if (clean.length > 150) {
      clean = clean.substring(0, 150);
    }
    return clean;
  }

  static filterProfanity(text: string): string {
    let filtered = text;
    for (const bad of BANNED_WORDS) {
      const regex = new RegExp(`\\b${bad}\\b`, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }

  static checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const timestamps = userMessageTimes.get(userId) || [];
    const recent = timestamps.filter(t => now - t < 5000);

    if (recent.length >= 6) {
      return false; // rate limited
    }

    recent.push(now);
    userMessageTimes.set(userId, recent);
    return true;
  }
}
