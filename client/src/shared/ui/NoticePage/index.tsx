import './NoticePage.scss';

import type { ReactNode } from 'react';

interface NoticePageProps {
  title: string;
  /** Short explanation under the title. */
  text: string;
  /** Optional controls: a retry button, a link home. */
  children?: ReactNode;
}

/** A centered message for pages that have nothing to list: "coming soon", "not found", "something broke". */
export function NoticePage({ title, text, children }: NoticePageProps) {
  return (
    <section className="notice-page">
      <h1 className="notice-page__title">{title}</h1>
      <p className="notice-page__text">{text}</p>
      {children && <div className="notice-page__actions">{children}</div>}
    </section>
  );
}
