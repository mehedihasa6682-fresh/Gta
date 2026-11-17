import type { ChatEmotion, ChatRole } from './roleChats';

export type GeminiVoiceName = 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Puck';

export type ToneMood =
  | 'question'
  | 'laugh'
  | 'cry'
  | 'urgent'
  | 'angry'
  | 'warm'
  | 'tough'
  | 'normal';

export interface SpeechClause {
  text: string;
  mood: ToneMood;
  pitchOffset: number;
  rateFactor: number;
  volume: number;
  pauseMs: number;
}

export interface BangladeshiSpeechPlan {
  cleanText: string;
  scriptedText: string;
  detectedEmotion: ChatEmotion;
  mood: ToneMood;
  preferredGeminiVoice: GeminiVoiceName;
  bangladeshiStylePrompt: string;
  useFlashExpressiveModel: boolean;
  clauses: SpeechClause[];
}

const QUESTION_WORDS_RE =
  /(কী|কি|কেমন|কোথায়|কোথায়|কত|কেন|কবে|কোন|নাকি|পাবো|পারবো|করবো|বলো তো|জানোস|কই|\?)/i;
const LAUGH_WORDS_RE =
  /(হাহা|হা হা|হাসি|হাসো|হাসুন|মজা|কমেডি|ফানি|খুশি|আনন্দ|haha|laugh|funny|joke)/i;
const CRY_WORDS_RE =
  /(কান্না|কাঁদ|উহু|হুহু|কষ্ট|ভয়|ভয়|ব্যথা|ব্যাথা|দুঃখ|প্লিজ|ছেড়ে|ছেড়ে|চোখে পানি|অসুস্থ|রক্ত|আঘাত|মরে|বাঁচাও|দোহাই|cry|sad|pain|hurt)/i;
const URGENT_WORDS_RE =
  /(তাড়াতাড়ি|তাড়াতাড়ি|ভাগ|পুলিশ|গুলি|অ্যালার্ম|সাবধান|ধরো|ধর|জরুরি|অ্যাক্সিডেন্ট|অ্যাম্বুলেন্স|ফায়ার|ফায়ার|আগুন|ডাকাত|রবার|ইউনিট|কোড|১০-৯৯|৯৯৯|হ্যালো পুলিশ|পালাও|সন্দেহভাজন|!)/i;
const ANGRY_TOUGH_RE =
  /(বেটা|থাপ্পড়|থাপ্পড়|টার্ফ|ডাকাতি|ভল্ট|মার্কেট|হাত তোল|চশমাটা|গালি|মুড অফ|বস|টাকা দে|সরে যা|চোখ কই|দালালি|মারবো|অস্ত্র নামাও|সারেন্ডার)/i;
const WARM_POLITE_RE =
  /(সালাম|আসসালামু|ওয়ালাইকুম|স্বাগতম|ভালো|সুস্থ|চিন্তা|ওষুধ|ব্যান্ডেজ|স্যালাইন|চা|বিস্কুট|দোয়া|যত্ন|ধন্যবাদ|আপু|ভাইয়া|ভাইয়া|মামা|খুশি|রিভাইভ)/i;

function detectClauseMood(clause: string, fallbackEmotion: ChatEmotion): ToneMood {
  if (fallbackEmotion === 'laugh' || LAUGH_WORDS_RE.test(clause)) return 'laugh';
  if (fallbackEmotion === 'cry' || CRY_WORDS_RE.test(clause)) return 'cry';
  if (clause.includes('?') || QUESTION_WORDS_RE.test(clause)) return 'question';
  if (ANGRY_TOUGH_RE.test(clause) || fallbackEmotion === 'angry') return 'angry';
  if (URGENT_WORDS_RE.test(clause)) return 'urgent';
  if (WARM_POLITE_RE.test(clause) || fallbackEmotion === 'happy') return 'warm';
  return 'normal';
}

function splitIntoBangladeshiClauses(text: string): string[] {
  const rawParts = text
    .split(/(?<=[।?!—,;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawParts.length === 0) return [text.trim()];

  // Merge very short trailing fragments (under 5 chars) with previous clause for natural rhythm
  const merged: string[] = [];
  for (const part of rawParts) {
    if (merged.length > 0 && part.length < 5) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

function getRolePersonaDescription(role: ChatRole | undefined, isFemale: boolean): string {
  const genderLabel = isFemale
    ? 'adult Bangladeshi woman with a sweet, clear, natural feminine Dhaka Bengali voice'
    : 'adult Bangladeshi man with a clear, rich, natural masculine Dhaka Bengali voice';

  switch (role) {
    case 'doctor':
      return `${genderLabel}, calm, reassuring Dhaka Medical College physician`;
    case 'nurse':
      return `${genderLabel}, gentle, caring Dhaka Medical nurse`;
    case 'shopkeeper':
      return `${genderLabel}, warm, witty Dhaka roadside tea-stall (Tong) shopkeeper`;
    case 'dealer':
      return `${genderLabel}, street-smart, confident Gulshan underground arms dealer`;
    case 'police':
      return `${genderLabel}, firm, authoritative Dhaka Metropolitan Police (DMP) dispatch & sergeant over tactical radio`;
    case 'gang':
      return `${genderLabel}, bold, charismatic Dhaka gang leader`;
    case 'hostage':
      return `${genderLabel}, dramatic, expressive Dhaka local citizen in a tense hostage moment`;
    case 'civilian':
    default:
      return `${genderLabel}, expressive everyday Dhaka city resident reacting naturally`;
  }
}

export function pickGeminiVoice(isFemale: boolean, role?: ChatRole): GeminiVoiceName {
  if (isFemale) {
    return role === 'hostage' ? 'Zephyr' : 'Kore';
  }
  if (role === 'dealer' || role === 'gang') return 'Fenrir';
  if (role === 'shopkeeper') return 'Puck';
  return 'Charon';
}

export function analyzeBangladeshiTone(
  rawText: string,
  isFemale: boolean,
  emotion: ChatEmotion = 'neutral',
  role?: ChatRole
): BangladeshiSpeechPlan {
  const cleanText = rawText.replace(/^\[[^\]]+\]\s*/, '').trim();
  const overallMood = detectClauseMood(cleanText, emotion);

  const detectedEmotion: ChatEmotion =
    overallMood === 'laugh'
      ? 'laugh'
      : overallMood === 'cry'
      ? 'cry'
      : overallMood === 'angry'
      ? 'angry'
      : overallMood === 'warm'
      ? 'happy'
      : emotion;

  const rawClauses = splitIntoBangladeshiClauses(cleanText);
  const clauses: SpeechClause[] = rawClauses.map((clauseText, idx) => {
    const mood = detectClauseMood(clauseText, emotion);
    const isLast = idx === rawClauses.length - 1;

    let pitchOffset = 0;
    let rateFactor = 1.0;
    let volume = 1.0;
    let pauseMs = 95;

    switch (mood) {
      case 'question':
        // Bengali questions naturally lift pitch slightly at the end of the clause
        pitchOffset = isLast ? 0.14 : 0.09;
        rateFactor = 0.98;
        pauseMs = 120;
        break;
      case 'laugh':
        pitchOffset = 0.13;
        rateFactor = 1.06;
        pauseMs = 80;
        break;
      case 'cry':
        pitchOffset = -0.07;
        rateFactor = 0.83;
        volume = 0.92;
        pauseMs = 170;
        break;
      case 'urgent':
        pitchOffset = 0.07;
        rateFactor = 1.12;
        pauseMs = 70;
        break;
      case 'angry':
        pitchOffset = -0.08;
        rateFactor = 1.03;
        pauseMs = 85;
        break;
      case 'warm':
        pitchOffset = 0.04;
        rateFactor = 0.94;
        pauseMs = 110;
        break;
      case 'normal':
      default:
        pitchOffset = isLast ? -0.03 : 0.01;
        rateFactor = 0.97;
        pauseMs = 100;
        break;
    }

    // Strip written "হাহাহা" / "উহুহু" for browser TTS when real formant laugh/cry plays alongside
    const spokenClause = clauseText
      .replace(/^(হাহাহা[!।,\s]*|হাহা[!।,\s]*|হা হা[!।,\s]*|উহুহু[!।,\s]*|হুহু[!।,\s]*)/i, '')
      .trim();

    return {
      text: spokenClause || clauseText,
      mood,
      pitchOffset,
      rateFactor,
      volume,
      pauseMs,
    };
  });

  const moodDirectionMap: Record<ToneMood, string> = {
    question:
      'inquisitive conversational tone with natural rising Bengali questioning intonation on question words and at the end',
    laugh:
      'joyful, smiling, amused tone with natural light laughter and playful Bangladeshi inflection',
    cry:
      'trembling, tearful, emotional pleading tone with shaky breath and heartfelt Bangladeshi sadness',
    urgent:
      'urgent, high-energy, alert street pace with strong emphasis on action words',
    angry:
      'firm, intense, street-tough Dhaka attitude with strong consonant emphasis',
    warm:
      'warm, polite, affectionate Bangladeshi hospitality tone, soft and clear',
    tough:
      'bold, confident Dhaka street tone',
    normal:
      'natural everyday conversational Dhaka Bangladeshi tone with clear word-by-word expression',
  };

  const personaDesc = getRolePersonaDescription(role, isFemale);
  const bangladeshiStylePrompt =
    `Speak in authentic Bangladeshi Bengali (bn-BD, Dhaka pronunciation, NOT Kolkata accent). ` +
    `Voice persona: ${personaDesc}. ` +
    `Emotional delivery: ${moodDirectionMap[overallMood]}. ` +
    `Vary pitch and word stress naturally according to each Bengali word, question, or exclamation.`;

  let scriptedText = cleanText;
  if (overallMood === 'laugh' && !scriptedText.includes('<laugh>')) {
    scriptedText = `<laugh> ${scriptedText}`;
  } else if (overallMood === 'cry' && !scriptedText.includes('<gasp>')) {
    scriptedText = `<breath> ${scriptedText}`;
  } else if (overallMood === 'urgent' && !scriptedText.includes('<gasp>')) {
    scriptedText = `<gasp> ${scriptedText}`;
  }

  return {
    cleanText,
    scriptedText,
    detectedEmotion,
    mood: overallMood,
    preferredGeminiVoice: pickGeminiVoice(isFemale, role),
    bangladeshiStylePrompt,
    useFlashExpressiveModel: overallMood === 'laugh' || overallMood === 'cry' || overallMood === 'urgent',
    clauses,
  };
}
