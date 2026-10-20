/**
 * Comprehensive Telugu Transliteration and Sacred Gothra Dictionary
 * Converts English phonetic input into authentic Telugu script for tickets,
 * sankalpam slips, and poojari chanting rosters.
 */

export const GOTHRA_MAP: Record<string, string> = {
  // Common spellings & variants to sacred Telugu script
  'kashyapa': 'కాశ్యప',
  'kashyap': 'కాశ్యప',
  'bharadwaja': 'భరద్వాజ',
  'bharadwaj': 'భరద్వాజ',
  'harithasa': 'హరితస',
  'haritha': 'హరితస',
  'kaundinya': 'కౌండిన్య',
  'kondinya': 'కౌండిన్య',
  'vasishta': 'వసిష్ఠ',
  'vasistha': 'వసిష్ఠ',
  'vishwamitra': 'విశ్వామిత్ర',
  'viswamitra': 'విశ్వామిత్ర',
  'gautama': 'గౌతమ',
  'gouthama': 'గౌతమ',
  'gautam': 'గౌతమ',
  'atri': 'అత్రి',
  'athri': 'అత్రి',
  'jamadagni': 'జమదగ్ని',
  'agastya': 'అగస్త్య',
  'agasthya': 'అగస్త్య',
  'sandilya': 'శాండిల్య',
  'shandilya': 'శాండిల్య',
  'srivatsa': 'శ్రీవత్స',
  'srivatsasa': 'శ్రీవత్సస',
  'mudgala': 'ముద్గల',
  'moudgalya': 'మౌద్గల్య',
  'angirasa': 'ఆంగీరస',
  'parashara': 'పరాశర',
  'parasara': 'పరాశర',
  'kaushika': 'కౌశిక',
  'koushika': 'కౌశిక',
  'gargya': 'గార్గ్య',
  'garga': 'గార్గ్య',
  'shunaka': 'శౌనక',
  'saunaka': 'శౌనక',
  'badarayana': 'బాదరాయణ',
  'kutsa': 'కుత్స',
  'vadhula': 'వాధూల',
  'naidhruva': 'నైధ్రువ',
  'kapila': 'కపిల',
  'dhananjaya': 'ధనంజయ',
  'upamanyu': 'ఉపమన్యు',
  'kanva': 'కణ్వ',
  'maitraya': 'మైత్రేయ',
  'maitreya': 'మైత్రేయ',
  'pulaha': 'పులహ',
  'pulastya': 'పులస్త్య',
  'kratu': 'క్రతు',
  'marichi': 'మరీచి',
  'daksha': 'దక్ష',
  'bhrigu': 'భృగు',
  'chikitasa': 'చికిత్సస',
  'shatamarshana': 'శతమర్షణ',
  'sankrithi': 'సాంకృతి',
  'kapi': 'కపి',
  'vishnuvardhana': 'విష్ణువర్ధన',
  'mandavya': 'మాండవ్య',
  'ratheetara': 'రథీతర',
  'shounaka': 'శౌనక',
  'alambayana': 'ఆలంబాయన',
  'goutama': 'గౌతమ',
  'harita': 'హరితస'
};

/**
 * Phonetic transliterator: English syllables to Telugu
 */
const CONSONANTS: [string, string][] = [
  ['bh', 'భ'], ['kh', 'ఖ'], ['gh', 'ఘ'], ['ch', 'చ'], ['jh', 'ఝ'],
  ['th', 'థ'], ['dh', 'ధ'], ['ph', 'ఫ'], ['sh', 'శ'], ['ss', 'ష'],
  ['k', 'క'], ['g', 'గ'], ['c', 'క'], ['j', 'జ'], ['t', 'త'],
  ['d', 'ద'], ['n', 'న'], ['p', 'ప'], ['b', 'బ'], ['m', 'మ'],
  ['y', 'య'], ['r', 'ర'], ['l', 'ల'], ['v', 'వ'], ['w', 'వ'],
  ['s', 'స'], ['h', 'హ'], ['f', 'ఫ'], ['z', 'జ'], ['x', 'క్ష'], ['q', 'క']
];

const MATRAS: [string, string][] = [
  ['aa', 'ా'], ['ee', 'ీ'], ['oo', 'ూ'], ['ai', 'ై'], ['au', 'ౌ'],
  ['a', ''], ['i', 'ి'], ['u', 'ు'], ['e', 'ె'], ['o', 'ొ']
];

const VOWELS: [string, string][] = [
  ['aa', 'ఆ'], ['ee', 'ఈ'], ['oo', 'ఊ'], ['ai', 'ఐ'], ['au', 'ఔ'],
  ['a', 'అ'], ['i', 'ఇ'], ['u', 'ఉ'], ['e', 'ఎ'], ['o', 'ఒ']
];

export function transliterateWord(word: string): string {
  if (!word || !word.trim()) return '';
  const clean = word.trim().toLowerCase();

  // If already Telugu / Non-ASCII, return as is
  if (/[\u0C00-\u0C7F]/.test(clean)) {
    return word;
  }

  // Check Gothra dictionary
  if (GOTHRA_MAP[clean]) {
    return GOTHRA_MAP[clean];
  }

  let result = '';
  let i = 0;
  const len = clean.length;

  while (i < len) {
    // Check if start of word or vowel
    if (i === 0 || result.endsWith(' ') || result.endsWith(',')) {
      let matchedVowel = false;
      for (const [vStr, vTel] of VOWELS) {
        if (clean.substring(i, i + vStr.length) === vStr) {
          result += vTel;
          i += vStr.length;
          matchedVowel = true;
          break;
        }
      }
      if (matchedVowel) continue;
    }

    // Match Consonant
    let matchedConsonant: string | null = null;
    let consLen = 0;
    for (const [cStr, cTel] of CONSONANTS) {
      if (clean.substring(i, i + cStr.length) === cStr) {
        matchedConsonant = cTel;
        consLen = cStr.length;
        break;
      }
    }

    if (matchedConsonant) {
      i += consLen;
      // Match Matra following consonant
      let matchedMatra: string | null = null;
      for (const [mStr, mTel] of MATRAS) {
        if (clean.substring(i, i + mStr.length) === mStr) {
          matchedMatra = mTel;
          i += mStr.length;
          break;
        }
      }

      if (matchedMatra !== null) {
        result += matchedConsonant + matchedMatra;
      } else {
        // Virama (halant) if consonant without vowel at the end
        if (i >= len || clean[i] === ' ' || clean[i] === ',') {
          result += matchedConsonant + '్';
        } else {
          result += matchedConsonant;
        }
      }
    } else {
      // Non-alphabet character (e.g. comma, number, space)
      result += clean[i];
      i++;
    }
  }

  return result || word;
}

/**
 * Ensures any devotee name, gothram, or family string renders in authentic Telugu
 */
export function toTeluguText(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // If already contains Telugu script, return directly
  if (/[\u0C00-\u0C7F]/.test(trimmed)) {
    return trimmed;
  }

  // Check direct gothra match
  const lower = trimmed.toLowerCase();
  if (GOTHRA_MAP[lower]) {
    return GOTHRA_MAP[lower];
  }

  // Split by words, comma, or whitespace and transliterate each
  const parts = trimmed.split(/([\s,;&+/]+)/);
  const converted = parts.map((part) => {
    if (/^[\s,;&+/]+$/.test(part)) return part;
    const l = part.toLowerCase();
    if (GOTHRA_MAP[l]) return GOTHRA_MAP[l];
    return transliterateWord(part);
  }).join('');

  return converted || trimmed;
}

/**
 * Specifically format Gothram with sacred prefix/suffix
 */
export function formatTeluguGothram(gothra: string | null | undefined): string {
  if (!gothra) return '—';
  const telugu = toTeluguText(gothra);
  if (telugu.endsWith('స') || telugu.endsWith('సస') || telugu.endsWith('గోత్రం')) {
    return telugu;
  }
  return `${telugu}స`;
}

