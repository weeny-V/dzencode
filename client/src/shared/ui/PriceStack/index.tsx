import './PriceStack.scss';

import { getLocale } from 'next-intl/server';

import { resolveLocale } from '@/shared/i18n/config';
import { currencySign, formatAmount, type Price } from '@/shared/lib/money';

/** Prices in several currencies: the secondary ones small on top, the default one large below. */
export async function PriceStack({ prices }: { prices: readonly Price[] }) {
  const locale = resolveLocale(await getLocale());
  const secondary = prices.filter((price) => !price.isDefault);
  const main = prices.find((price) => price.isDefault);

  return (
    <div className="price-stack">
      {secondary.map(({ value, symbol }) => (
        <span key={symbol} className="price-stack__secondary">
          {formatAmount(value, locale)} {currencySign(symbol)}
        </span>
      ))}
      {main && (
        <span className="price-stack__main">
          {formatAmount(main.value, locale)}{' '}
          <span className="price-stack__symbol">{currencySign(main.symbol)}</span>
        </span>
      )}
    </div>
  );
}
