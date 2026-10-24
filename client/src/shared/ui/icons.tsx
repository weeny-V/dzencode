import type { ReactNode, SVGProps } from 'react';

// Small inline SVG icons. They are decorative: the button or link that holds an icon carries the label.

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

const Stroke = ({ children, ...props }: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const CloseIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const TrashIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Stroke>
);

export const ListIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="3" />
  </Stroke>
);

export const ClockIcon = (props: IconProps) => (
  <Stroke {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Stroke>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M9 5l7 7-7 7" />
  </Stroke>
);

export const MenuIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Stroke>
);

export const GearIcon = (props: IconProps) => (
  <Stroke {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Stroke>
);

/** The green shield from the top menu. */
export const ShieldLogo = (props: IconProps) => (
  <svg viewBox="0 0 40 46" width="40" height="46" aria-hidden="true" focusable="false" {...props}>
    <path
      d="M20 1.5 3 7v13c0 11 7.2 21 17 24.5C29.8 41 37 31 37 20V7L20 1.5z"
      fill="var(--color-primary)"
    />
    <path d="M20 1.5v43C10.2 41 3 31 3 20V7L20 1.5z" fill="var(--color-primary-dark)" />
    <circle cx="20" cy="17" r="5.5" fill="#fff" />
    <path
      d="M9.5 33c1.6-6 5.8-8.5 10.5-8.5S28.9 27 30.5 33C27.6 36.3 24 38.5 20 40c-4-1.5-7.6-3.7-10.5-7z"
      fill="#fff"
    />
  </svg>
);
