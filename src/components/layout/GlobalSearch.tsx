'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, MessageSquare, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { cn } from '@/lib/cn';

interface SearchChannelResult {
  id: string;
  name: string;
  type: string;
  displayName: string;
}

interface SearchMessageResult {
  id: string;
  body: string;
  channelId: string;
  channelName: string;
  channelType: string;
}

interface SearchResults {
  projects: Array<{ id: string; name: string; code: string }>;
  tasks: Array<{ id: string; title: string; project?: { name: string } }>;
  clients: Array<{ id: string; name: string }>;
  files: Array<{ id: string; fileName: string }>;
  invoices: Array<{ id: string; invoiceNumber: string }>;
  channels: SearchChannelResult[];
  messages: SearchMessageResult[];
}

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      apiRequest<ApiResponse<SearchResults>>(
        `/search?q=${encodeURIComponent(query.trim())}`,
      )
        .then((response) => {
          setResults(response.data);
          setIsOpen(true);
        })
        .catch(() => setResults(null));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function navigate(path: string) {
    setIsOpen(false);
    setQuery('');
    router.push(path);
  }

  const hasResults =
    results &&
    (results.projects.length > 0 ||
      results.tasks.length > 0 ||
      results.clients.length > 0 ||
      results.files.length > 0 ||
      results.invoices.length > 0 ||
      results.channels.length > 0 ||
      results.messages.length > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (hasResults) setIsOpen(true);
          }}
          placeholder="Search anything..."
          aria-label="Global search"
          className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface-muted)] pl-10 pr-4 text-sm text-[var(--foreground)] transition-all placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
        />
      </div>

      {isOpen && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-96 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]">
          {!hasResults ? (
            <p className="px-3 py-2 text-sm text-[var(--muted)]">No results found.</p>
          ) : (
            <div className="space-y-3">
              {results!.channels.length > 0 ? (
                <SearchGroup title="Channels">
                  {results!.channels.map((channel) => (
                    <SearchItem
                      key={channel.id}
                      icon={
                        channel.type === 'direct' ? (
                          <MessageSquare className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        ) : (
                          <Hash className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        )
                      }
                      label={
                        channel.type === 'direct' || channel.type === 'group'
                          ? channel.displayName
                          : `#${channel.displayName}`
                      }
                      onSelect={() => navigate(`/chat?channel=${channel.id}`)}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.messages.length > 0 ? (
                <SearchGroup title="Messages">
                  {results!.messages.map((message) => (
                    <SearchItem
                      key={message.id}
                      icon={<MessageSquare className="h-4 w-4 shrink-0 text-[var(--muted)]" />}
                      label={`${message.body} · ${message.channelType === 'direct' ? 'DM' : `#${message.channelName}`}`}
                      onSelect={() =>
                        navigate(
                          `/chat?channel=${message.channelId}&message=${message.id}`,
                        )
                      }
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.projects.length > 0 ? (
                <SearchGroup title="Projects">
                  {results!.projects.map((project) => (
                    <SearchItem
                      key={project.id}
                      label={`${project.name} (${project.code})`}
                      onSelect={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.tasks.length > 0 ? (
                <SearchGroup title="Tasks">
                  {results!.tasks.map((task) => (
                    <SearchItem
                      key={task.id}
                      label={`${task.title}${task.project?.name ? ` · ${task.project.name}` : ''}`}
                      onSelect={() => navigate('/tasks')}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.clients.length > 0 ? (
                <SearchGroup title="Clients">
                  {results!.clients.map((client) => (
                    <SearchItem
                      key={client.id}
                      label={client.name}
                      onSelect={() => navigate('/clients')}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.files.length > 0 ? (
                <SearchGroup title="Files">
                  {results!.files.map((file) => (
                    <SearchItem
                      key={file.id}
                      label={file.fileName}
                      onSelect={() => navigate('/files')}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results!.invoices.length > 0 ? (
                <SearchGroup title="Invoices">
                  {results!.invoices.map((invoice) => (
                    <SearchItem
                      key={invoice.id}
                      label={invoice.invoiceNumber}
                      onSelect={() => navigate('/finance')}
                    />
                  ))}
                </SearchGroup>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SearchItem({
  label,
  icon,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
