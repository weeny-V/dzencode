const LOCK = 'inventory:auth:cookie';

/** Hold the lock until the browser has applied the action response's Set-Cookie headers. */
export async function serializeAuthMutation<T>(operation: () => Promise<T>): Promise<T> {
  if (navigator.locks) return await navigator.locks.request(LOCK, operation);
  return await withDatabaseLock(operation);
}

/** Ordinary HTTP lacks Web Locks. An empty IndexedDB store supplies the same cross-tab mutex. */
async function withDatabaseLock<T>(operation: () => Promise<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LOCK, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mutex');
    request.onerror = () =>
      reject(request.error ?? new Error('Authentication coordination failed'));
    request.onsuccess = () => resolve(request.result);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('mutex', 'readwrite');
      const store = transaction.objectStore('mutex');
      let started = false;
      let finished = false;
      let result: T;
      let failure: Error | undefined;
      const run = async () => {
        try {
          result = await operation();
        } catch (error) {
          failure = error instanceof Error ? error : new Error('Authentication mutation failed');
        } finally {
          finished = true;
        }
      };
      const keepAlive = () => {
        // Each request keeps this exclusive transaction alive across the network await.
        // No identity, credentials, or lock owner is persisted.
        const request = store.get('lock');
        request.onsuccess = () => {
          if (!started) {
            started = true;
            void run();
          }
          if (!finished) keepAlive();
        };
      };
      transaction.oncomplete = () => {
        if (failure) reject(failure);
        else resolve(result);
      };
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Authentication coordination failed'));
      keepAlive();
    });
  } finally {
    database.close();
  }
}
