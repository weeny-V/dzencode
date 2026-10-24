'use client';

// The last resort: replaces the whole document when the root layout itself fails, so it cannot rely on
// the app styles. Plain inline styles keep it readable.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ru">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}
      >
        <h1>Что-то пошло не так</h1>
        <p>Приложение не удалось показать.</p>
        <button type="button" onClick={() => retry()}>
          Повторить
        </button>
      </body>
    </html>
  );
}
