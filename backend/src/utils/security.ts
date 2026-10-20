/**
 * Temple Seva System - Security Sanitization & Validation Guards
 * Guards against XSS, SQL injection, script tags, and malformed devotee input.
 */

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML / XML / Script tags
    .replace(/[;\"'<>`]/g, '')   // Strip SQL and shell metacharacters
    .trim();
}

export function validateDevoteeName(name: string): { valid: boolean; error?: string } {
  const clean = sanitizeText(name);
  if (clean.length < 2) {
    return { valid: false, error: 'భక్తుని / సంకల్ప కర్త పేరు కనీసం 2 అక్షరాలు ఉండాలి (Beneficiary name must be at least 2 characters).' };
  }
  if (clean.length > 100) {
    return { valid: false, error: 'సంకల్ప కర్త పేరు 100 అక్షరాల లోపు ఉండాలి (Beneficiary name must not exceed 100 characters).' };
  }
  return { valid: true };
}

export function validateGothram(gothra: string): { valid: boolean; error?: string } {
  const clean = sanitizeText(gothra);
  if (clean.length < 2) {
    return { valid: false, error: 'గోత్రం పేరు కనీసం 2 అక్షరాలు ఉండాలి (Gothra must be at least 2 characters).' };
  }
  if (clean.length > 60) {
    return { valid: false, error: 'గోత్రం పేరు 60 అక్షరాల లోపు ఉండాలి (Gothra must not exceed 60 characters).' };
  }
  return { valid: true };
}

export function validateMobile(mobile?: string | null): { valid: boolean; error?: string } {
  if (!mobile || !mobile.trim()) return { valid: true };
  const clean = mobile.trim();
  // Valid Indian 10-digit mobile number starting with 6-9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(clean)) {
    return { valid: false, error: 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి (Please enter a valid 10-digit mobile number starting with 6-9).' };
  }
  return { valid: true };
}

