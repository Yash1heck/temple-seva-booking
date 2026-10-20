/**
 * Comprehensive Hindu Temple Seva English-to-Telugu Transliteration & Translation Utility
 */

export const TEMPLE_SEVA_DICTIONARY: Record<string, string> = {
  // Sacred Deities & Avatars
  sri: 'శ్రీ',
  shree: 'శ్రీ',
  sharada: 'శారదా',
  sharadamba: 'శారదాంబ',
  peetham: 'పీఠం',
  rudra: 'రుద్ర',
  rudram: 'రుద్రం',
  shiva: 'శివ',
  siva: 'శివ',
  chandramouleeswara: 'చంద్రమౌళీశ్వర',
  ganapathi: 'గణపతి',
  ganapati: 'గణపతి',
  ganesha: 'గణేశ',
  chandi: 'చండీ',
  durga: 'దుర్గా',
  kanaka: 'కనక',
  bhavani: 'భవాని',
  kamakshi: 'కామాక్షి',
  meenakshi: 'మీనాక్షి',
  visalakshi: 'విశాలాక్షి',
  annapurna: 'అన్నపూర్ణ',
  gayatri: 'గాయత్రి',
  saraswathi: 'సరస్వతి',
  saraswati: 'సరస్వతి',
  lakshmi: 'లక్ష్మీ',
  laxmi: 'లక్ష్మీ',
  varalakshmi: 'వరలక్ష్మి',
  narayana: 'నారాయణ',
  venkateswara: 'వేంకటేశ్వర',
  venkataramana: 'వేంకటరమణ',
  govinda: 'గోవింద',
  krishna: 'కృష్ణ',
  balaji: 'బాలాజీ',
  satyanarayana: 'సత్యనారాయణ',
  sitarama: 'సీతారామ',
  rama: 'రామ',
  sita: 'సీతా',
  seetha: 'సీతా',
  lakshmana: 'లక్ష్మణ',
  hanuman: 'హనుమాన్',
  anjaneya: 'ఆంజనేయ',
  subrahmanya: 'సుబ్రహ్మణ్య',
  subramanya: 'సుబ్రహ్మణ్య',
  shanmukha: 'షణ్ముఖ',
  kumaraswamy: 'కుమారస్వామి',
  murugan: 'మురుగన్',
  ayyappa: 'అయ్యప్ప',
  manikanta: 'మణికంఠ',
  dhanvantari: 'ధన్వంతరి',
  dakshinamurthy: 'దక్షిణామూర్తి',
  dakshinamurti: 'దక్షిణామూర్తి',
  shankara: 'శంకర',
  adi: 'ఆది',
  swamy: 'స్వామి',
  swami: 'స్వామి',
  amma: 'అమ్మ',
  amman: 'అమ్మవారి',
  ammavari: 'అమ్మవారి',
  lingam: 'లింగం',

  // Sevas, Poojas, & Rituals
  archana: 'అర్చన',
  archanam: 'అర్చన',
  abhishekam: 'అభిషేకం',
  abhishek: 'అభిషేకం',
  abhisheka: 'అభిషేక',
  rudrabhishekam: 'రుద్రాభిషేకం',
  kalashabhishekam: 'కలశాభిషేకం',
  kalasha: 'కలశ',
  kalasham: 'కలశం',
  panchamrutha: 'పంచామృతాభిషేకం',
  panchamrita: 'పంచామృత',
  panchamrutham: 'పంచామృతం',
  panchamritam: 'పంచామృతం',
  ksheerabhishekam: 'క్షీరాభిషేకం',
  ksheera: 'క్షీర',
  homam: 'హోమం',
  homa: 'హోమం',
  havan: 'హవనం',
  havanam: 'హవనం',
  yagnyam: 'యజ్ఞం',
  yajna: 'యజ్ఞం',
  pooja: 'పూజ',
  puja: 'పూజ',
  pooje: 'పూజ',
  vratham: 'వ్రతం',
  vrata: 'వ్రతం',
  kalyanam: 'కల్యాణం',
  kalyanotsavam: 'కల్యాణోత్సవం',
  utsavam: 'ఉత్సవం',
  utsav: 'ఉత్సవం',
  brahmotsavam: 'బ్రహ్మోత్సవం',
  rathotsavam: 'రథోత్సవం',
  harathi: 'హారతి',
  aarathi: 'హారతి',
  aarthi: 'హారతి',
  arati: 'హారతి',
  aarti: 'హారతి',
  karpura: 'కర్పూర',
  karpoora: 'కర్పూర',
  camphor: 'కర్పూర',
  deeparadhana: 'దీపారాధన',
  deepam: 'దీపం',
  deepalankarana: 'దీపాలంకరణ',
  deepalankara: 'దీపాలంకరణ',
  kumkuma: 'కుంకుమ',
  kumkum: 'కుంకుమ',
  kumkumarchana: 'కుంకుమార్చన',
  suvasini: 'సువాసిని',
  damapathi: 'దంపతి',
  dampathi: 'దంపతి',
  dampathula: 'దంపతుల',
  vastram: 'వస్త్రం',
  vastra: 'వస్త్ర',
  samarpanam: 'సమర్పణ',
  vahana: 'వాహన',
  pallaki: 'పల్లకీ',
  oonjal: 'ఊంజల్',
  prasadam: 'ప్రసాదం',
  prasada: 'ప్రసాద',
  annadanam: 'అన్నదానం',

  // Stotrams, Chanting & Vedic Recitation
  sahasranama: 'సహస్రనామ',
  sahasra: 'సహస్ర',
  ashtothara: 'అష్టోత్తర',
  ashtottara: 'అష్టోత్తర',
  shatanama: 'శతనామ',
  trishati: 'త్రిశతి',
  lalitha: 'లలితా',
  lalita: 'లలితా',
  namavali: 'నామావళి',
  stotram: 'స్తోత్రం',
  parayanam: 'పారాయణం',
  vedaparayanam: 'వేదపారాయణం',
  japam: 'జపం',
  tarpanam: 'తర్పణం',
  sankalpam: 'సంకల్పం',

  // Sacred Offerings & Materials
  bilvarchana: 'బిల్వార్చన',
  bilva: 'బిల్వ',
  tulasi: 'తులసి',
  pushparchana: 'పుష్పార్చన',
  pushpa: 'పుష్ప',
  pushpam: 'పుష్పం',
  patri: 'పత్రి',
  chandanam: 'చందనం',
  gandham: 'గంధం',
  vibhooti: 'విభూతి',
  vibhuti: 'విభూతి',
  teertham: 'తీర్థం',
  teertha: 'తీర్థ',
  laddu: 'లడ్డూ',
  vada: 'వడ',
  pongal: 'పొంగలి',
  pulihara: 'పులిహోర',
  pulihora: 'పులిహోర',
  daddojanam: 'దద్దోజనం',

  // Homams & Dosha Nivarana
  navagraha: 'నవగ్రహ',
  shanti: 'శాంతి',
  sudarshana: 'సుదర్శన',
  mrityunjaya: 'మృత్యుంజయ',
  ayushya: 'ఆయుష్య',
  arogya: 'ఆరోగ్య',
  santhana: 'సంతాన',
  santana: 'సంతాన',
  dosha: 'దోష',
  nivarana: 'నివారణ',
  karya: 'కార్య',
  siddhi: 'సిద్ధి',
  vijaya: 'విజయ',
  sarva: 'సర్వ',
  gopooja: 'గోపూజ',

  // Auspicious Dates, Timings & Statuses
  nitya: 'నిత్య',
  maha: 'మహా',
  mahaa: 'మహా',
  pournami: 'పౌర్ణమి',
  ekadashi: 'ఏకాదశి',
  pradosham: 'ప్రదోషం',
  sankashtahara: 'సంకష్టహర',
  chavithi: 'చవితి',
  shashti: 'షష్ఠి',
  amavasya: 'అమావాస్య',
  vishesha: 'విశేష',
  special: 'ప్రత్యేక',
  upcoming: 'రాబోయే',
  scheduled: 'నిర్ణీత',
  today: 'నేడు',
  pratyaksha: 'ప్రత్యక్షం',
  paroksha: 'పరోక్షం',
  direct: 'ప్రత్యక్ష',
  online: 'ఆన్‌లైన్',
  seva: 'సేవ',
  sevalu: 'సేవలు',
  daily: 'నిత్య',
  morning: 'ఉదయం',
  evening: 'సాయంత్రం',
  night: 'రాత్రి',
  all: 'అన్ని'
};

const CONSONANTS: [string, string][] = [
  ['ksh', 'క్ష'], ['sh', 'శ'], ['ss', 'ష'], ['ch', 'చ'], ['jh', 'ఝ'],
  ['th', 'థ'], ['dh', 'ధ'], ['ph', 'ఫ'], ['bh', 'భ'], ['kh', 'ఖ'], ['gh', 'ఘ'],
  ['gn', 'జ్ఞ'], ['ny', 'న్య'], ['k', 'క'], ['g', 'గ'], ['c', 'క'], ['j', 'జ'],
  ['t', 'త'], ['d', 'ద'], ['n', 'న'], ['p', 'ప'], ['b', 'బ'], ['m', 'మ'],
  ['y', 'య'], ['r', 'ర'], ['l', 'ల'], ['v', 'వ'], ['w', 'వ'], ['s', 'స'],
  ['h', 'హ'], ['f', 'ఫ'], ['z', 'జ'], ['x', 'క్ష'], ['q', 'క']
];

const MATRAS: [string, string][] = [
  ['aa', 'ా'], ['ee', 'ీ'], ['oo', 'ూ'], ['ai', 'ై'], ['au', 'ౌ'],
  ['a', ''], ['i', 'ి'], ['u', 'ు'], ['e', 'ె'], ['o', 'ొ']
];

const VOWELS: [string, string][] = [
  ['aa', 'ఆ'], ['ee', 'ఈ'], ['oo', 'ఊ'], ['ai', 'ఐ'], ['au', 'ఔ'],
  ['a', 'అ'], ['i', 'ఇ'], ['u', 'ఉ'], ['e', 'ఎ'], ['o', 'ఒ']
];

/**
 * Phonetic Indic syllable transliterator for arbitrary words not in dictionary
 */
function phoneticIndicToTelugu(word: string): string {
  if (!word || !word.trim()) return '';
  const clean = word.trim().toLowerCase();
  let result = '';
  let i = 0;
  const len = clean.length;

  while (i < len) {
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
        if (i >= len || clean[i] === ' ' || clean[i] === ',') {
          result += matchedConsonant + '్';
        } else {
          result += matchedConsonant;
        }
      }
    } else {
      result += clean[i];
      i++;
    }
  }

  return result || word;
}

/**
 * Translates a single word or token with punctuation awareness
 */
function transliterateToken(token: string): string {
  if (!token) return '';

  const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
  if (!match) return token;

  const [, prefix, word, suffix] = match;
  const lower = word.toLowerCase();

  // 1. Direct dictionary match
  if (TEMPLE_SEVA_DICTIONARY[lower]) {
    return prefix + TEMPLE_SEVA_DICTIONARY[lower] + suffix;
  }

  // 2. Compound words check (e.g. "rudrabhishekam" -> "rudra" + "abhishekam")
  for (const key of Object.keys(TEMPLE_SEVA_DICTIONARY)) {
    if (lower.startsWith(key) && lower.length > key.length) {
      const rest = lower.slice(key.length);
      if (TEMPLE_SEVA_DICTIONARY[rest]) {
        return prefix + TEMPLE_SEVA_DICTIONARY[key] + ' ' + TEMPLE_SEVA_DICTIONARY[rest] + suffix;
      }
    }
  }

  // 3. High quality phonetic transliteration
  const phonetic = phoneticIndicToTelugu(word);
  return prefix + phonetic + suffix;
}

/**
 * Main entry point: converts English seva names into authentic Telugu script
 */
export function toTeluguSevaName(englishName?: string | null): string {
  if (!englishName || !englishName.trim()) return '';

  // If already contains Telugu script, preserve it as is
  if (/[\u0C00-\u0C7F]/.test(englishName)) {
    return englishName.trim();
  }

  return englishName
    .trim()
    .split(/(\s+)/)
    .map(part => transliterateToken(part))
    .join('');
}
