'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Flag,
  Leaf,
  Lightbulb,
  Plane,
  Search,
  Smile,
  Trophy,
  UtensilsCrossed,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  EMOJI_CATEGORY_META,
  HANDY_REACTIONS,
  QUICK_REACTIONS,
  WORK_EMOJI_IDS,
  type EmojiCatalogEntry,
  type EmojiCategoryId,
  type EmojiSkinTone,
  getCategoryEmojiIds,
  loadFrequentEmojiIds,
  loadSkinTone,
  nativeForEmoji,
  rememberFrequentEmojiId,
  resolveEmojiIds,
  saveSkinTone,
  searchEmojis,
  skinTonePreviewNative,
} from '@/lib/emoji-catalog';

export { QUICK_REACTIONS, HANDY_REACTIONS };
export const COMMON_EMOJIS = [
  '😀',
  '😂',
  '🙂',
  '😉',
  '😍',
  '👍',
  '🙏',
  '🎉',
  '🔥',
  '✅',
  '❤️',
  '👀',
  '💯',
  '🚀',
  '👏',
  '🤝',
  '💡',
  '📎',
  '📣',
  '⏰',
];

type NavId = 'search' | EmojiCategoryId;

const CATEGORY_ICONS: Record<EmojiCategoryId, ReactNode> = {
  people: <Smile className="h-4 w-4" />,
  nature: <Leaf className="h-4 w-4" />,
  foods: <UtensilsCrossed className="h-4 w-4" />,
  activity: <Trophy className="h-4 w-4" />,
  places: <Plane className="h-4 w-4" />,
  objects: <Lightbulb className="h-4 w-4" />,
  symbols: <Hash className="h-4 w-4" />,
  flags: <Flag className="h-4 w-4" />,
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
  /** @deprecated Kept for callers; full picker uses a fixed Slack-like grid. */
  columns?: 4 | 5 | 6 | 8 | 9;
}

function EmojiButton({
  emoji,
  label,
  onSelect,
}: {
  emoji: string;
  label: string;
  onSelect: (emoji: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-[1.25rem] leading-none transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
      onClick={() => onSelect(emoji)}
    >
      <span className="pointer-events-none select-none" aria-hidden>
        {emoji}
      </span>
    </button>
  );
}

function Section({
  id,
  title,
  children,
  sectionRef,
}: {
  id: string;
  title: string;
  children: ReactNode;
  sectionRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <section
      id={id}
      ref={sectionRef}
      className="scroll-mt-2"
      aria-label={title}
    >
      <h3 className="sticky top-0 z-[1] bg-[var(--surface)]/95 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] backdrop-blur-sm">
        {title}
      </h3>
      <div className="grid grid-cols-9 gap-0.5 pb-2">{children}</div>
    </section>
  );
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const [activeNav, setActiveNav] = useState<NavId>('people');
  const [skinTone, setSkinTone] = useState<EmojiSkinTone>(1);
  const [skinOpen, setSkinOpen] = useState(false);
  const [frequentIds, setFrequentIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    native: string;
    name: string;
    id: string;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<EmojiCategoryId, HTMLElement | null>>>(
    {},
  );

  useEffect(() => {
    setSkinTone(loadSkinTone());
    setFrequentIds(loadFrequentEmojiIds());
  }, []);

  const frequentEntries = useMemo(
    () => resolveEmojiIds(frequentIds),
    [frequentIds],
  );
  const workEntries = useMemo(() => resolveEmojiIds(WORK_EMOJI_IDS), []);
  const searchResults = useMemo(
    () => (query.trim() ? searchEmojis(query) : []),
    [query],
  );

  const categoryEntries = useMemo(() => {
    const map = {} as Record<EmojiCategoryId, EmojiCatalogEntry[]>;
    for (const meta of EMOJI_CATEGORY_META) {
      map[meta.id] = resolveEmojiIds(getCategoryEmojiIds(meta.id));
    }
    return map;
  }, []);

  function selectNative(native: string, id?: string) {
    if (id) {
      setFrequentIds(rememberFrequentEmojiId(id));
    }
    onSelect(native);
  }

  function selectEntry(entry: EmojiCatalogEntry) {
    selectNative(nativeForEmoji(entry, skinTone), entry.id);
  }

  function focusSearch() {
    setActiveNav('search');
    setSkinOpen(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function jumpToCategory(categoryId: EmojiCategoryId) {
    setActiveNav(categoryId);
    setQuery('');
    setSkinOpen(false);
    const node = sectionRefs.current[categoryId];
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderEntry(entry: EmojiCatalogEntry) {
    const native = nativeForEmoji(entry, skinTone);
    const label = `${entry.name} :${entry.id}:`;
    return (
      <button
        key={entry.id}
        type="button"
        role="option"
        title={label}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[1.25rem] leading-none transition-transform hover:scale-110 hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
        onMouseEnter={() =>
          setPreview({ native, name: entry.name, id: entry.id })
        }
        onFocus={() => setPreview({ native, name: entry.name, id: entry.id })}
        onClick={() => selectEntry(entry)}
      >
        <span className="pointer-events-none select-none" aria-hidden>
          {native}
        </span>
      </button>
    );
  }

  const showSearchResults = query.trim().length > 0 || activeNav === 'search';

  return (
    <div
      data-message-action-menu="true"
      className={cn(
        'flex h-[26rem] w-[22rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]',
        className,
      )}
      role="listbox"
      aria-label="Emoji picker"
    >
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] px-1.5 py-1">
        <button
          type="button"
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
            activeNav === 'search' &&
              'bg-[var(--surface-muted)] text-[var(--foreground)]',
          )}
          aria-label="Search emoji"
          aria-pressed={activeNav === 'search'}
          onClick={focusSearch}
        >
          <Search className="h-4 w-4" />
        </button>
        {EMOJI_CATEGORY_META.map((category) => (
          <button
            key={category.id}
            type="button"
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
              activeNav === category.id &&
                'bg-[var(--surface-muted)] text-[var(--foreground)]',
            )}
            aria-label={category.label}
            aria-pressed={activeNav === category.id}
            onClick={() => jumpToCategory(category.id)}
          >
            {CATEGORY_ICONS[category.id]}
          </button>
        ))}
      </div>

      <div className="border-b border-[var(--border)] px-2 py-2">
        <label className="sr-only" htmlFor="emoji-picker-search">
          Search all emoji
        </label>
        <input
          id="emoji-picker-search"
          ref={searchRef}
          type="search"
          value={query}
          placeholder="Search all emoji"
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveNav('search');
          }}
          onFocus={() => setActiveNav('search')}
        />
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1"
      >
        {showSearchResults ? (
          <Section id="emoji-search-results" title="Search results">
            {searchResults.length > 0 ? (
              searchResults.map(renderEntry)
            ) : (
              <p className="col-span-9 px-1 py-6 text-center text-sm text-[var(--muted)]">
                {query.trim()
                  ? 'No emoji match that search.'
                  : 'Type to search all emoji.'}
              </p>
            )}
          </Section>
        ) : (
          <>
            {frequentEntries.length > 0 ? (
              <Section id="emoji-frequent" title="Frequently Used">
                {frequentEntries.map(renderEntry)}
              </Section>
            ) : null}

            <Section id="emoji-work" title="Getting Work Done">
              {workEntries.map(renderEntry)}
            </Section>

            {EMOJI_CATEGORY_META.map((category) => (
              <Section
                key={category.id}
                id={`emoji-cat-${category.id}`}
                title={category.label}
                sectionRef={(node) => {
                  sectionRefs.current[category.id] = node;
                }}
              >
                {categoryEntries[category.id].map(renderEntry)}
              </Section>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-2 py-1.5">
        <div className="mb-1.5 flex items-center gap-1">
          {HANDY_REACTIONS.map((emoji) => (
            <EmojiButton
              key={emoji}
              emoji={emoji}
              label={`React with ${emoji}`}
              onSelect={(value) => selectNative(value)}
            />
          ))}
          <div className="relative ml-auto">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[1.1rem] hover:bg-[var(--surface-muted)]"
              aria-label="Choose skin tone"
              aria-expanded={skinOpen}
              onClick={() => setSkinOpen((open) => !open)}
            >
              <span aria-hidden>{skinTonePreviewNative(skinTone)}</span>
            </button>
            {skinOpen ? (
              <div className="absolute bottom-full right-0 z-10 mb-1 flex gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]">
                {([1, 2, 3, 4, 5, 6] as EmojiSkinTone[]).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-[1.1rem] hover:bg-[var(--surface-muted)]',
                      skinTone === tone && 'bg-[var(--surface-muted)]',
                    )}
                    aria-label={`Skin tone ${tone}`}
                    onClick={() => {
                      setSkinTone(tone);
                      saveSkinTone(tone);
                      setSkinOpen(false);
                    }}
                  >
                    <span aria-hidden>{skinTonePreviewNative(tone)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-8 items-center gap-2 px-1 text-xs text-[var(--muted)]">
          {preview ? (
            <>
              <span className="text-base leading-none" aria-hidden>
                {preview.native}
              </span>
              <span className="truncate text-[var(--foreground)]">
                {preview.name}
              </span>
              <span className="truncate">:{preview.id}:</span>
            </>
          ) : (
            <span>Pick an emoji…</span>
          )}
        </div>
      </div>
    </div>
  );
}
