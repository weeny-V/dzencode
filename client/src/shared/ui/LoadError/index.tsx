import './LoadError.scss';

import { Button } from '../Button';

interface LoadErrorProps {
  /** What failed, as a sentence: "Не удалось загрузить приходы." */
  title: string;
  /** The reason from the server or the network, shown smaller. */
  message?: string;
  onRetry: () => void;
}

/** The message that replaces a list or panel whose request failed, with a button to try again. */
export function LoadError({ title, message, onRetry }: LoadErrorProps) {
  return (
    <div className="load-error" role="alert">
      <p className="load-error__title">{title}</p>
      {message && <p className="load-error__message">{message}</p>}
      <Button variant="light-danger" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}
