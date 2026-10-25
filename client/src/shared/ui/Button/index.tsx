import './Button.scss';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

type Variant = 'primary' | 'light-danger' | 'text' | 'ghost' | 'icon';
// `primary` is a green pill, `light-danger` a white pill with red text, `text` a plain uppercase label on the green bar of a dialog, `ghost` the same label on a white page.
// `icon` is a round surface button; its caller supplies an accessible label.

const classes = (variant: Variant, className: string) =>
  `button button--${variant} ${className}`.trim();

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={classes(variant, className)} {...props} />;
}

/** A link that looks like a button. */
export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={classes(variant, className)} {...props} />;
}
