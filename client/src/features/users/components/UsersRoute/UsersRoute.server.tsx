import './UsersRoute.scss';

import type { AuthUser, Participant } from '@/shared/api/authTypes';
import { loadOrError } from '@/shared/api/server';
import { requireSession } from '@/shared/api/session.server';
import type { Text } from '@/shared/i18n/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { formatNumericDate } from '@/shared/lib/date';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getParticipants } from '../../api/users';
import { text } from './messages.server';

export async function UsersRoute() {
  const session = await requireSession();
  const [participants, t] = await Promise.all([loadOrError(getParticipants), text()]);
  return <UsersView user={session.user} participants={participants} t={t} />;
}

function UsersView({
  user,
  participants,
  t,
}: {
  user: AuthUser;
  participants: ActionResult<Participant[]>;
  t: Text;
}) {
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="users-route">
        <section className="users-route__card" aria-labelledby="current-user">
          <h2 id="current-user">{t('current')}</h2>
          <p>
            {user.firstName} {user.lastName}
          </p>
          <p>{user.email}</p>
        </section>
        <section className="users-route__card" aria-labelledby="participants">
          <h2 id="participants">{t('participants')}</h2>
          {!participants.ok ? (
            <LoadError title={t('failed')} message={participants.error} />
          ) : (
            <ul className="users-route__list">
              {participants.data.map((participant) => (
                <li key={participant.id} className="users-route__participant">
                  <span>
                    {participant.firstName} {participant.lastName}
                  </span>
                  <span>
                    {t('registered')}:{' '}
                    <time dateTime={participant.registeredAt}>
                      {formatNumericDate(participant.registeredAt)}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
