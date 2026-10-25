'use client';
import { useGlobalError } from './useGlobalError';
export function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const content = useGlobalError();
  return (
    <html lang={content?.locale ?? 'en'}>
      <body
        style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}
      >
        {content && (
          <>
            <h1>{content.messages.title}</h1>
            <p>{content.messages.text}</p>
            <button type="button" onClick={retry}>
              {content.messages.retry}
            </button>
          </>
        )}
      </body>
    </html>
  );
}
