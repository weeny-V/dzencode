'use client';

import './TypeFilter.scss';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useId, useOptimistic } from 'react';

import { withParam } from '@/shared/lib/searchParams';

interface TypeFilterProps {
  /** Type names for the options; `undefined` while they load (the select is disabled meanwhile). */
  types?: readonly string[];
  /** Loading the names failed: the select stays disabled and a button offers to try again. */
  failed?: boolean;
  onRetry?: () => void;
  /** The type currently applied; empty means all. */
  selected: string;
}

/**
 * The "Тип" select. The choice lives in the address (`/products?type=Monitors`), so it survives a reload and
 * works with the back button; the search (`q`) stays in the address. A navigation is a transition, so the list
 * change is animated like a page change. The select shows the new choice at once (optimistically) and does not
 * wait for the server round trip.
 */
export function TypeFilter({ types, failed = false, onRetry, selected }: TypeFilterProps) {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useOptimistic(selected);

  return (
    <div className="type-filter">
      <label className="type-filter__label" htmlFor={id}>
        Тип:
      </label>
      <select
        id={id}
        className="type-filter__select"
        value={value}
        disabled={!types}
        onChange={(event) => {
          const type = event.target.value;
          startTransition(() => {
            setValue(type);
            router.replace(`${pathname}${withParam(searchParams, 'type', type)}`, {
              scroll: false,
            });
          });
        }}
      >
        <option value="">Все</option>
        {/* While the names load, the chosen type from the address still has to be an option to show it. */}
        {(types ?? (selected ? [selected] : [])).map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      {failed && !types && (
        <button type="button" className="type-filter__retry" onClick={onRetry}>
          Не удалось загрузить типы. Повторить
        </button>
      )}
    </div>
  );
}
