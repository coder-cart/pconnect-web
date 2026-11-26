import emojiData from '@emoji-mart/data';

export type EmojiSkinTone = 1 | 2 | 3 | 4 | 5 | 6;

export type EmojiCatalogEntry = {
  id: string;
  name: string;
  keywords: string[];
  skins: { native: string; unified: string }[];
  emoticons?: string[];
};

export type EmojiCategoryId =
  | 'people'
  | 'nature'
  | 'foods'
  | 'activity'
  | 'places'
  | 'objects'
  | 'symbols'
  | 'flags';

type EmojiMartData = {
  categories: { id: string; emojis: string[] }[];
  emojis: Record<string, EmojiCatalogEntry>;
  aliases?: Record<string, string>;
};

const data = emojiData as unknown as EmojiMartData;

export const EMOJI_CATEGORY_META: {
  id: EmojiCategoryId;
  label: string;
}[] = [
  { id: 'people', label: 'Smileys & People' },
  { id: 'nature', label: 'Animals & Nature' },
  { id: 'foods', label: 'Food & Drink' },
  { id: 'activity', label: 'Activities' },
  { id: 'places', label: 'Travel & Places' },
  { id: 'objects', label: 'Objects' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'flags', label: 'Flags' },
];

/** Slack-style “Getting Work Done” curated set. */
export const WORK_EMOJI_IDS = [
  'eyes',
  'white_check_mark',
  'raised_hands',
  '+1',
  '-1',
  'heart',
  'tada',
  'fire',
  '100',
  'pray',
  'clap',
  'wave',
  'thinking_face',
  'sweat_smile',
  'joy',
  'sob',
  'rocket',
  'bulb',
  'memo',
  'calendar',
  'alarm_clock',
  'hourglass_flowing_sand',
  'dart',
  'trophy',
  'handshake',
  'muscle',
  'sparkles',
  'star',
  'warning',
  'x',
] as const;

export const HANDY_REACTIONS = ['🙂', '👍', '✅', '❤️', '👀'] as const;

export const QUICK_REACTIONS = ['✅', '👀', '🙌'] as const;

const FREQUENT_STORAGE_KEY = 'pconnect.emoji.frequent';
const SKIN_STORAGE_KEY = 'pconnect.emoji.skinTone';
const MAX_FREQUENT = 24;

export function getEmojiById(id: string): EmojiCatalogEntry | null {
  const resolved = data.aliases?.[id] ?? id;
  return data.emojis[resolved] ?? null;
}

export function nativeForEmoji(
  entry: EmojiCatalogEntry,
  skinTone: EmojiSkinTone,
): string {
  const index = Math.min(Math.max(skinTone, 1), entry.skins.length) - 1;
  return entry.skins[index]?.native ?? entry.skins[0]?.native ?? '';
}

export function getCategoryEmojiIds(categoryId: EmojiCategoryId): string[] {
  return (
    data.categories.find((category) => category.id === categoryId)?.emojis ??
    []
  );
}

export function resolveEmojiIds(ids: readonly string[]): EmojiCatalogEntry[] {
  const out: EmojiCatalogEntry[] = [];
  for (const id of ids) {
    const entry = getEmojiById(id);
    if (entry) out.push(entry);
  }
  return out;
}

export function searchEmojis(query: string, limit = 120): EmojiCatalogEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const scored: { entry: EmojiCatalogEntry; score: number }[] = [];
  for (const entry of Object.values(data.emojis)) {
    const id = entry.id.toLowerCase();
    const name = entry.name.toLowerCase();
    const keywords = entry.keywords?.map((item) => item.toLowerCase()) ?? [];
    let score = 0;
    if (id === normalized || name === normalized) score = 100;
    else if (id.startsWith(normalized) || name.startsWith(normalized)) score = 80;
    else if (id.includes(normalized) || name.includes(normalized)) score = 50;
    else if (keywords.some((keyword) => keyword.startsWith(normalized)))
      score = 40;
    else if (keywords.some((keyword) => keyword.includes(normalized)))
      score = 20;
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return scored.slice(0, limit).map((item) => item.entry);
}

export function loadFrequentEmojiIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FREQUENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function rememberFrequentEmojiId(id: string): string[] {
  const next = [
    id,
    ...loadFrequentEmojiIds().filter((existing) => existing !== id),
  ].slice(0, MAX_FREQUENT);
  try {
    window.localStorage.setItem(FREQUENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function loadSkinTone(): EmojiSkinTone {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = Number(window.localStorage.getItem(SKIN_STORAGE_KEY) ?? '1');
    if (raw >= 1 && raw <= 6) return raw as EmojiSkinTone;
  } catch {
    /* ignore */
  }
  return 1;
}

export function saveSkinTone(tone: EmojiSkinTone) {
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, String(tone));
  } catch {
    /* ignore */
  }
}

export function skinTonePreviewNative(tone: EmojiSkinTone): string {
  const wave = getEmojiById('wave');
  if (!wave) return '👋';
  return nativeForEmoji(wave, tone);
}

/** Prefer these when emoji-mart maps the same emoticon to multiple faces. */
const PREFERRED_EMOTICONS: Record<string, string> = {
  ':)': '🙂',
  ':-)': '🙂',
  '(:': '🙂',
  ':D': '😀',
  ':-D': '😀',
  ':(': '🙁',
  ':-(': '🙁',
  ';)': '😉',
  ';-)': '😉',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':|': '😐',
  ':-|': '😐',
  ':/': '😕',
  ':-/': '😕',
  ':\\': '😕',
  ':-\\': '😕',
  ':*': '😘',
  ':-*': '😘',
  '<3': '❤️',
  '</3': '💔',
  'xD': '😆',
  XD: '😆',
  ':>': '😆',
  ':->': '😆',
  '8)': '😎',
  '-_-': '😑',
};

let shortcodeNativeMap: Map<string, string> | null = null;
let emoticonNativeEntries: { emoticon: string; native: string }[] | null =
  null;

function ensureTextShortcutMaps() {
  if (shortcodeNativeMap && emoticonNativeEntries) return;

  shortcodeNativeMap = new Map();
  const emoticonMap = new Map<string, string>();

  for (const entry of Object.values(data.emojis)) {
    const native = entry.skins[0]?.native;
    if (!native) continue;
    shortcodeNativeMap.set(entry.id.toLowerCase(), native);
    for (const emoticon of entry.emoticons ?? []) {
      if (!emoticonMap.has(emoticon)) {
        emoticonMap.set(emoticon, native);
      }
    }
  }

  for (const [alias, id] of Object.entries(data.aliases ?? {})) {
    const native = shortcodeNativeMap.get(id.toLowerCase());
    if (native) shortcodeNativeMap.set(alias.toLowerCase(), native);
  }

  for (const [emoticon, native] of Object.entries(PREFERRED_EMOTICONS)) {
    emoticonMap.set(emoticon, native);
  }

  emoticonNativeEntries = Array.from(emoticonMap.entries())
    .map(([emoticon, native]) => ({ emoticon, native }))
    .sort((a, b) => b.emoticon.length - a.emoticon.length);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Expand `:smile:` shortcodes and text emoticons like `:)` in plain chat text.
 * Safe for display/render paths (not code fences — caller must exclude those).
 */
export function expandEmojiShortcutsInText(text: string): string {
  ensureTextShortcutMaps();
  if (!shortcodeNativeMap || !emoticonNativeEntries) return text;

  let result = text.replace(/:([a-z0-9_+-]+):/gi, (match, id: string) => {
    return shortcodeNativeMap!.get(id.toLowerCase()) ?? match;
  });

  for (const { emoticon, native } of emoticonNativeEntries) {
    const pattern = new RegExp(
      `(^|[\\s(])(${escapeRegExp(emoticon)})(?=$|[\\s)\\].,!?…])`,
      'g',
    );
    result = result.replace(pattern, `$1${native}`);
  }

  return result;
}
