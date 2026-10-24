import './ProductThumb.scss';

/** Placeholder for a product photo (the `photo` paths in the seed data point to files that do not exist). */
export function ProductThumb({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`product-thumb ${className}`.trim()}
      viewBox="0 0 48 40"
      width="48"
      height="40"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="product-thumb__screen" x="3" y="2" width="42" height="26" rx="2" />
      <rect className="product-thumb__display" x="6" y="5" width="36" height="20" rx="1" />
      <path className="product-thumb__chart" d="M9 21l7-6 6 3 7-8 6 5 5-3" />
      <path className="product-thumb__stand" d="M20 28h8l2 7H18l2-7zM14 36h20v2H14z" />
    </svg>
  );
}
