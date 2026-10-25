import './LoadError.scss';

import { RetryButton } from '../RetryButton';

interface LoadErrorProps {
  /** What failed, as a sentence: "Не удалось загрузить приходы." */
  title: string;
  /** The reason from the server or the network, shown smaller. */
  message?: string;
}

/** The message that replaces a list or panel whose request failed, with a button to try again. */
export function LoadError({ title, message }: LoadErrorProps) {
  return (
    <div className="load-error" role="alert">
      <p className="load-error__title">{title}</p>
      {message && <p className="load-error__message">{message}</p>}
      <RetryButton />
    </div>
  );
}
