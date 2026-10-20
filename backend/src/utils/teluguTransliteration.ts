/**
 * Comprehensive Hindu Temple Seva English-to-Telugu Transliteration & Translation Utility
 */

const templeDictionary: Record<string, string> = {
  // Common Sevas & Rituals
  archana: 'అర్చన',
  nitya: 'నిత్య',
  abhishekam: 'అభిషేకం',
  abhishek: 'అభిషేకం',
  rudrabhishekam: 'రుద్రాభిషేకం',
  kalashabhishekam: 'కలశాభిషేకం',
  panchamrutha: 'పంచామృతాభిషేకం',
  panchamrita: 'పంచామృత',
  sri: 'శ్రీ',
  shree: 'శ్రీ',
  lalitha: 'లలితా',
  lalita: 'లలితా',
  sahasranama: 'సహస్రనామ',
  sahasra: 'సహస్ర',
  ashtothara: 'అష్టోత్తర',
  ashtottara: 'అష్టోత్తర',
  shatanama: 'శతనామ',
  trishati: 'త్రిశతి',
  homam: 'హోమం',
  homa: 'హోమం',
  havan: 'హవనం',
  havanam: 'హవనం',
  yagnyam: 'యజ్ఞం',
  yajna: 'యజ్ఞం',
  ganapathi: 'గణపతి',
  ganapati: 'గణపతి',
  ganesha: 'గణేశ',
  maha: 'మహా',
  chandi: 'చండీ',
  durga: 'దుర్గా',
  kanaka: 'కనక',
  navagraha: 'నవగ్రహ',
  shanti: 'శాంతి',
  suvasini: 'సువాసిని',
  pooja: 'పూజ',
  puja: 'పూజ',
  kumkuma: 'కుంకుమ',
  kumkum: 'కుంకుమ',
  kumkumarchana: 'కుంకుమార్చన',
  karpura: 'కర్పూర',
  karpoora: 'కర్పూర',
  camphor: 'కర్పూర',
  harathi: 'హారతి',
  aarathi: 'హారతి',
  aarthi: 'హారతి',
  arati: 'హారతి',
  aarti: 'హారతి',
  deeparadhana: 'దీపారాధన',
  deepam: 'దీపం',
  deepalankarana: 'దీపాలంకరణ',
  deepalankara: 'దీపాలంకరణ',
  prasadam: 'ప్రసాదం',
  prasada: 'ప్రసాద',
  seva: 'సేవ',
  kalyanam: 'కల్యాణం',
  kalyanotsavam: 'కల్యాణోత్సవం',
  sudarshana: 'సుదర్శన',
  mrityunjaya: 'మృత్యుంజయ',
  mahaa: 'మహా',
  ayushya: 'ఆయుష్య',
  bilvarchana: 'బిల్వార్చన',
  bilva: 'బిల్వ',
  tulasi: 'తులసి',
  pushparchana: 'పుష్పార్చన',
  pushpa: 'పుష్ప',
  vahana: 'వాహన',
  pallaki: 'పల్లకీ',
  oonjal: 'ఊంజల్',
  annadanam: 'అన్నదానం',
  vastram: 'వస్త్రం',
  vastra: 'వస్త్ర',
  samarpanam: 'సమర్పణ',
  sarva: 'సర్వ',
  pournami: 'పౌర్ణమి',
  ekadashi: 'ఏకాదశి',
  pradosham: 'ప్రదోషం',
  sankashtahara: 'సంకష్టహర',
  chavithi: 'చవితి',
  shashti: 'షష్ఠి',
  special: 'ప్రత్యేక',
  upcoming: 'రాబోయే',
  scheduled: 'నిర్ణీత',
  today: 'నేడు',
  pratyaksha: 'ప్రత్యక్షం',
  paroksha: 'పరోక్షం',
  swamy: 'స్వామి',
  swami: 'స్వామి',
  amma: 'అమ్మ',
  amman: 'అమ్మవారి',
  ammavari: 'అమ్మవారి',
  sharada: 'శారదా',
  sharadamba: 'శారదాంబ',
  peetham: 'పీఠం',
  chandramouleeswara: 'చంద్రమౌళీశ్వర',
  satyanarayana: 'సత్యనారాయణ',
  vratham: 'వ్రతం',
  vrata: 'వ్రతం',
  lakshmi: 'లక్ష్మీ',
  narayana: 'నారాయణ',
  venkateswara: 'వేంకటేశ్వర',
  sitarama: 'సీతారామ',
  rama: 'రామ',
  sita: 'సీతా',
  shiva: 'శివ',
  lingam: 'లింగం',
  anjaneya: 'ఆంజనేయ',
  hanuman: 'హనుమాన్',
  subrahmanya: 'సుబ్రహ్మణ్య',
  subramanya: 'సుబ్రహ్మణ్య',
  dhanvantari: 'ధన్వంతరి',
  dakshinamurthy: 'దక్షిణామూర్తి',
  dakshinamurti: 'దక్షిణామూర్తి',
  varalakshmi: 'వరలక్ష్మి',
  saraswathi: 'సరస్వతి',
  saraswati: 'సరస్వతి',
  shankara: 'శంకర',
  adi: 'ఆది',
  jayanti: 'జయంతి',
  aradhana: 'ఆరాధన',
  utsavam: 'ఉత్సవం',
  utsav: 'ఉత్సవం',
  teertha: 'తీర్థ',
  prasad: 'ప్రసాద్',
  laddu: 'లడ్డూ',
  vada: 'వడ',
  dosa: 'దోశ',
  appam: 'అప్పం',
  sankalpam: 'సంకల్పం',
  gotram: 'గోత్రం',
  gothram: 'గోత్రం',
  nakshatram: 'నక్షత్రం',
  raasi: 'రాశి',
  rasi: 'రాశి',
  daily: 'నిత్య',
  morning: 'ఉదయం',
  evening: 'సాయంత్రం',
  night: 'రాత్రి'
};

/**
 * Phonetic conversion for arbitrary Indian words not in dictionary
 */
function phoneticIndicToTelugu(word: string): string {
  if (!word) return '';

  const w = word.toLowerCase();

  // Basic syllable replacement rules
  return w
    .replace(/ksh/g, 'క్ష')
    .replace(/sh/g, 'శ')
    .replace(/ch/g, 'చ')
    .replace(/th/g, 'థ')
    .replace(/dh/g, 'ధ')
    .replace(/bh/g, 'భ')
    .replace(/ph/g, 'ఫ')
    .replace(/gh/g, 'ఘ')
    .replace(/jh/g, 'ఝ')
    .replace(/kh/g, 'ఖ')
    .replace(/gn/g, 'జ్ఞ')
    .replace(/ny/g, 'న్య')
    .replace(/aa|ee|ii|oo|uu|ou|au|ai/g, m => {
      if (m === 'aa') return 'ా';
      if (m === 'ee' || m === 'ii') return 'ీ';
      if (m === 'oo' || m === 'uu') return 'ూ';
      if (m === 'ai') return 'ై';
      if (m === 'au' || m === 'ou') return 'ౌ';
      return '';
    })
    .replace(/k/g, 'క')
    .replace(/g/g, 'గ')
    .replace(/j/g, 'జ')
    .replace(/t/g, 'త')
    .replace(/d/g, 'ద')
    .replace(/n/g, 'న')
    .replace(/p/g, 'ప')
    .replace(/b/g, 'బ')
    .replace(/m/g, 'మ')
    .replace(/y/g, 'య')
    .replace(/r/g, 'ర')
    .replace(/l/g, 'ల')
    .replace(/v|w/g, 'వ')
    .replace(/s/g, 'స')
    .replace(/h/g, 'హ');
}

/**
 * Translates an English Seva token or phrase into natural Telugu script
 */
function transliterateToken(token: string): string {
  if (!token) return '';

  // Extract surrounding punctuation e.g. "(Pratyaksha)" -> prefix="(", word="Pratyaksha", suffix=")"
  const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
  if (!match) return token;

  const [, prefix, word, suffix] = match;
  const lower = word.toLowerCase();

  // 1. Direct dictionary match
  if (templeDictionary[lower]) {
    return prefix + templeDictionary[lower] + suffix;
  }

  // 2. Check compound words e.g. "maha+pooja" or "rudra+abhishekam"
  for (const key of Object.keys(templeDictionary)) {
    if (lower.startsWith(key) && lower.length > key.length) {
      const rest = lower.slice(key.length);
      if (templeDictionary[rest]) {
        return prefix + templeDictionary[key] + ' ' + templeDictionary[rest] + suffix;
      }
    }
  }

  // 3. Fallback to phonetic Indic transliteration if all letters are English
  if (/^[a-zA-Z]+$/.test(word)) {
    const phonetic = phoneticIndicToTelugu(word);
    if (phonetic && /[\u0C00-\u0C7F]/.test(phonetic)) {
      return prefix + phonetic + suffix;
    }
  }

  return token;
}

/**
 * Main function: converts an English Seva name into authentic Telugu script
 */
export function toTeluguSevaName(englishName?: string | null): string {
  if (!englishName || !englishName.trim()) return '';

  // If already contains Telugu characters, return as is
  if (/[\u0C00-\u0C7F]/.test(englishName)) {
    return englishName.trim();
  }

  return englishName
    .trim()
    .split(/(\s+)/)
    .map(part => transliterateToken(part))
    .join('');
}
