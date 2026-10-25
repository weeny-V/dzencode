import './GroupsContent.scss';

import Link from 'next/link';

import { loadOrError } from '@/shared/api/server';
import { requireSession } from '@/shared/api/session.server';
import type { InventoryCurrency, InventoryStatistics } from '@/shared/api/types';
import type { Locale } from '@/shared/i18n/config';
import type { ActionResult } from '@/shared/lib/actionResult';
import { formatAmount } from '@/shared/lib/money';
import { type SearchParams, toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { getInventoryStatistics } from '../../api/statistics';
import { parseCurrency } from '../../searchParams';
import { InventoryChart } from '../InventoryChart';
import type { GroupsMessages } from './messages';
import { dictionary } from './messages.server';

export async function GroupsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const params = await searchParams;
  const currency = parseCurrency(params.currency);
  const result = await loadOrError(() => getInventoryStatistics(currency));
  const { locale, messages } = await dictionary();
  const links = (['UAH', 'USD'] as const).map((code) => ({
    code,
    href: `/groups${toQuery({ currency: code, ...(typeof params.q === 'string' ? { q: params.q } : {}) })}`,
  }));
  return (
    <GroupsContentView
      result={result}
      currency={currency}
      links={links}
      locale={locale}
      messages={messages}
    />
  );
}

function GroupsContentView({
  result,
  currency,
  links,
  locale,
  messages: m,
}: {
  result: ActionResult<InventoryStatistics>;
  currency: InventoryCurrency;
  links: { code: InventoryCurrency; href: string }[];
  locale: Locale;
  messages: GroupsMessages;
}) {
  const chartMessages = { loading: m.chartLoading, error: m.chartError, retry: m.retry };
  return (
    <>
      <PageHeader title={m.title} />
      <div className="groups-content" data-pending-target>
        <nav className="groups-content__currency" aria-label={m.currency}>
          {links.map(({ code, href }) => (
            <Link key={code} href={href} aria-current={currency === code ? 'page' : undefined}>
              {code}
            </Link>
          ))}
        </nav>
        {!result.ok ? (
          <LoadError title={m.error} />
        ) : (
          <>
            <dl className="groups-content__cards">
              <div>
                <dt>{m.orders}</dt>
                <dd>{formatAmount(result.data.ordersCount, locale)}</dd>
              </div>
              <div>
                <dt>{m.products}</dt>
                <dd>{formatAmount(result.data.productsCount, locale)}</dd>
              </div>
              <div>
                <dt>{m.value}</dt>
                <dd>
                  {formatAmount(result.data.value, locale)} {currency}
                </dd>
              </div>
              <div>
                <dt>{m.missing}</dt>
                <dd>{formatAmount(result.data.missingPrices, locale)}</dd>
              </div>
            </dl>
            {result.data.missingPrices > 0 && <p role="status">{m.partial}</p>}
            {result.data.productsCount === 0 && <p>{m.empty}</p>}
            <section className="groups-content__section" aria-labelledby="groups-types">
              <h2 id="groups-types">{m.byType}</h2>
              <InventoryChart
                key={`types-${currency}-${locale}`}
                locale={locale}
                labels={result.data.byType.map((row) => row.type)}
                values={result.data.byType.map((row) => row.productsCount)}
                unit=""
                messages={chartMessages}
              />
              <div className="groups-content__table">
                <table>
                  <caption>{m.byType}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{m.type}</th>
                      <th scope="col">{m.products}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.byType.map((row) => (
                      <tr key={row.type}>
                        <th scope="row">{row.type}</th>
                        <td>{formatAmount(row.productsCount, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="groups-content__section" aria-labelledby="groups-warehouses">
              <h2 id="groups-warehouses">
                {m.byWarehouse} ({currency})
              </h2>
              <InventoryChart
                key={`warehouses-${currency}-${locale}`}
                locale={locale}
                labels={result.data.byWarehouse.map((row) => row.name ?? m.unassigned)}
                values={result.data.byWarehouse.map((row) => row.value)}
                unit={currency}
                messages={chartMessages}
              />
              <div className="groups-content__table">
                <table>
                  <caption>
                    {m.byWarehouse} ({currency})
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{m.warehouse}</th>
                      <th scope="col">{m.products}</th>
                      <th scope="col">
                        {m.value} ({currency})
                      </th>
                      <th scope="col">{m.missing}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.byWarehouse.map((row) => (
                      <tr key={row.warehouseId ?? 'unassigned'}>
                        <th scope="row">{row.name ?? m.unassigned}</th>
                        <td>{formatAmount(row.productsCount, locale)}</td>
                        <td>{formatAmount(row.value, locale)}</td>
                        <td>{formatAmount(row.missingPrices, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

export async function GroupsLoading() {
  const { messages } = await dictionary();
  return <ListSkeleton rows={4} rowHeight="4rem" label={messages.loading} />;
}
