import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentFilterService {
  // Common profanity and objectionable words list
  // In production, you might want to use a more comprehensive library or API
  private readonly blockedWords: Set<string> = new Set([
    // Explicit profanity
    'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'hell',
    // Hate speech indicators
    'hate', 'kill', 'die', 'murder',
    // Explicit variations (using simple pattern matching)
    'f*ck', 'f**k', 'sh*t', 's***',
  ]);

  // Suspicious patterns that might indicate objectionable content
  private readonly suspiciousPatterns: RegExp[] = [
    /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaa")
    /([A-Za-z])\1{3,}/g, // Repeated letters (e.g., "hhhhh")
    /\b(\w+)\s+\1\s+\1\b/gi, // Repeated words
    /(.)\1{10,}/g, // Excessive repetition
  ];

  /**
   * Check if content contains objectionable material
   * Returns true if content should be blocked
   */
  containsObjectionableContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const normalizedContent = content.toLowerCase().trim();

    // Check for blocked words
    const words = normalizedContent.split(/\s+/);
    for (const word of words) {
      // Remove punctuation for checking
      const cleanWord = word.replace(/[^\w]/g, '');
      if (this.blockedWords.has(cleanWord)) {
        return true;
      }

      // Check for variations with symbols (e.g., f*ck, sh*t)
      const wordWithoutVowels = cleanWord.replace(/[aeiou]/gi, '*');
      if (this.blockedWords.has(wordWithoutVowels.toLowerCase())) {
        return true;
      }
    }

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(normalizedContent)) {
        // If pattern matches excessively, it might be spam
        const matches = normalizedContent.match(pattern);
        if (matches && matches.length > 3) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Filter objectionable content from a string
   * Replaces objectionable words with asterisks
   */
  filterContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let filtered = content;
    const words = content.split(/\s+/);

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (this.blockedWords.has(cleanWord)) {
        const replacement = '*'.repeat(Math.min(cleanWord.length, 4));
        filtered = filtered.replace(
          new RegExp(cleanWord, 'gi'),
          replacement,
        );
      }
    }

    return filtered;
  }

  /**
   * Check if content should be flagged for manual review
   * Returns true if content might be objectionable but needs human review
   */
  needsManualReview(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const normalizedContent = content.toLowerCase();

    // Check for suspicious phrases that need human review
    const reviewPhrases = [
      'meet me',
      'send money',
      'click here',
      'free money',
      'limited time',
      'act now',
    ];

    for (const phrase of reviewPhrases) {
      if (normalizedContent.includes(phrase)) {
        return true;
      }
    }

    // Check for excessive links
    const linkPattern = /https?:\/\/[^\s]+/g;
    const links = content.match(linkPattern);
    if (links && links.length > 3) {
      return true;
    }

    // Check for excessive capitalization (potential spam)
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const totalLetters = (content.match(/[A-Za-z]/g) || []).length;
    if (totalLetters > 0 && capsCount / totalLetters > 0.7) {
      return true;
    }

    return false;
  }

  /**
   * Validate and sanitize content
   * Returns sanitized content and whether it was modified
   */
  sanitizeContent(content: string): { content: string; wasModified: boolean } {
    if (!content || typeof content !== 'string') {
      return { content: content || '', wasModified: false };
    }

    let sanitized = content.trim();

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Remove leading/trailing whitespace from each line
    sanitized = sanitized
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Check if content contains objectionable material
    if (this.containsObjectionableContent(sanitized)) {
      return {
        content: this.filterContent(sanitized),
        wasModified: true,
      };
    }

    return {
      content: sanitized,
      wasModified: sanitized !== content,
    };
  }
}
