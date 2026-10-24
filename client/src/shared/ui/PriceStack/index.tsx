import './PriceStack.scss';

import { currencySign, formatAmount, type Price } from '@/shared/lib/money';

/** Prices in several currencies: the secondary ones small on top, the default one large below. */
export function PriceStack({ prices }: { prices: readonly Price[] }) {
  const secondary = prices.filter((price) => !price.isDefault);
  const main = prices.find((price) => price.isDefault);

  return (
    <div className="price-stack">
      {secondary.map(({ value, symbol }) => (
        <span key={symbol} className="price-stack__secondary">
          {formatAmount(value)} {currencySign(symbol)}
        </span>
      ))}
      {main && (
        <span className="price-stack__main">
          {formatAmount(main.value)}{' '}
          <span className="price-stack__symbol">{currencySign(main.symbol)}</span>
        </span>
      )}
    </div>
  );
}
