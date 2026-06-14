'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  EmptyState,
  ErrorState,
  RestrictedState,
} from '@/components/ui/StatePanels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { BreadcrumbItem } from '@/components/ui/Breadcrumbs';

interface FilterOption {
  value: string;
  label: string;
}

interface ResourceListPageProps<T> {
  title: string;
  description: string;
  endpoint: string;
  emptyTitle: string;
  emptyDescription: string;
  breadcrumbs?: BreadcrumbItem[];
  permission?: string;
  searchPlaceholder?: string;
  filterLabel?: string;
  filterOptions?: FilterOption[];
  filterField?: keyof T | ((item: T) => string);
  createLabel?: string;
  onCreateClick?: () => void;
  layout?: 'list' | 'grid';
  hideHeader?: boolean;
  refreshKey?: number;
  getSearchValue?: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  renderGridItem?: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
}

export function ResourceListPage<T>({
  title,
  description,
  endpoint,
  emptyTitle,
  emptyDescription,
  breadcrumbs,
  permission,
  searchPlaceholder = 'Search...',
  filterLabel = 'All statuses',
  filterOptions,
  filterField,
  createLabel,
  onCreateClick,
  layout = 'list',
  hideHeader = false,
  refreshKey = 0,
  getSearchValue,
  renderItem,
  renderGridItem,
  getItemKey,
}: ResourceListPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const resolvedFilterOptions = filterOptions ?? [{ value: 'all', label: filterLabel }];

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRestricted(false);

    apiRequest<ApiResponse<T[]>>(endpoint)
      .then((response) => {
        setItems(response.data);
      })
      .catch((error: Error) => {
        if (error.message.toLowerCase().includes('permission')) {
          setIsRestricted(true);
          return;
        }

        setErrorMessage(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [endpoint, permission, refreshKey]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.toLowerCase();
      const searchValue = getSearchValue?.(item) ?? '';
      const matchesSearch = searchValue.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (activeFilter === 'all' || !filterField) return true;

      const itemValue =
        typeof filterField === 'function'
          ? filterField(item)
          : String(item[filterField] ?? '');

      return itemValue === activeFilter;
    });
  }, [items, searchQuery, activeFilter, filterField, getSearchValue]);

  const currentFilterLabel =
    resolvedFilterOptions.find((option) => option.value === activeFilter)?.label ??
    filterLabel;

  return (
    <div>
      {!hideHeader ? (
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          action={
            createLabel && onCreateClick ? (
              <Button onClick={onCreateClick}>
                <Plus className="h-4 w-4" />
                {createLabel}
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <Card padding="sm" className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            containerClassName="flex-1"
          />

          <div className="relative w-full lg:w-auto">
            <Button
              variant="secondary"
              size="md"
              className="w-full lg:w-auto"
              onClick={() => setFilterOpen((value) => !value)}
            >
              <Filter className="h-4 w-4" />
              {currentFilterLabel}
            </Button>
            {filterOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close filter menu"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-40 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]">
                  {resolvedFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setActiveFilter(option.value);
                        setFilterOpen(false);
                      }}
                      className="block w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {isLoading ? <ListSkeleton rows={layout === 'grid' ? 6 : 5} /> : null}

      {!isLoading && isRestricted ? (
        <RestrictedState
          title="Access restricted"
          description="Your role does not allow viewing this section."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load data" description={errorMessage} />
      ) : null}

      {!isLoading &&
      !isRestricted &&
      !errorMessage &&
      filteredItems.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {!isLoading &&
      !isRestricted &&
      !errorMessage &&
      filteredItems.length > 0 &&
      layout === 'list' ? (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-[var(--border)]">
            {filteredItems.map((item) => (
              <li
                key={getItemKey(item)}
                className="px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]"
              >
                {renderItem(item)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!isLoading &&
      !isRestricted &&
      !errorMessage &&
      filteredItems.length > 0 &&
      layout === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={getItemKey(item)}>
              {renderGridItem ? renderGridItem(item) : renderItem(item)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
