'use client';

import './TypeFilter.scss';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useId, useOptimistic } from 'react';

import { withParam } from '@/shared/lib/searchParams';

interface TypeFilterProps {
  /** Type names for the options. */
  types: readonly string[];
  /** The type currently applied; empty means all. */
  selected: string;
}

/**
 * The "Тип" select. The choice lives in the address (`/products?type=Monitors`), so it survives a reload and
 * works with the back button; the search (`q`) stays in the address. A navigation is a transition, so the list
 * change is animated like a page change. The select shows the new choice at once (optimistically) and does not
 * wait for the server round trip.
 */
export function TypeFilter({ types, selected }: TypeFilterProps) {
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
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
}
