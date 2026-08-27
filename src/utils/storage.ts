/**
 * Robust IndexedDB & Storage Manager for Large Academic Datasets
 * Replaces restrictive 5MB localStorage with unlimited IndexedDB persistence,
 * preventing QuotaExceededError when uploading large PDF databases, catalogs, or registries.
 */

const DB_NAME = 'academic_journal_finder_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('IndexedDB open error:', request.error);
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  return dbPromise;
}

/**
 * Save an item to IndexedDB (asynchronously with unlimited quota)
 */
export async function setDbItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn(`IndexedDB put error for key ${key}:`, request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    // If IndexedDB fails, attempt safe localStorage as fallback
    try {
      const serialized = JSON.stringify(value);
      // Only write to localStorage if under 2MB to prevent quota crash
      if (serialized.length < 2 * 1024 * 1024) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // Ignore quota error in fallback
    }
  }
}

/**
 * Retrieve an item from IndexedDB, falling back to localStorage or default value
 */
export async function getDbItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result !== undefined && request.result !== null) {
          resolve(request.result as T);
        } else {
          // Check localStorage as secondary fallback
          try {
            const saved = localStorage.getItem(key);
            if (saved) {
              resolve(JSON.parse(saved) as T);
              return;
            }
          } catch {}
          resolve(defaultValue);
        }
      };

      request.onerror = () => {
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            resolve(JSON.parse(saved) as T);
            return;
          }
        } catch {}
        resolve(defaultValue);
      };
    });
  } catch {
    // IndexedDB failed, try localStorage
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch {}
    return defaultValue;
  }
}

/**
 * Safe Synchronous localStorage reader (used for initial fast hydration)
 */
export function getInitialStorageValue<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved) as T;
    }
  } catch (e) {
    console.warn(`Safe read for ${key} from storage:`, e);
  }
  return defaultValue;
}

/**
 * Safe localStorage writer that catches and suppresses quota errors
 */
export function safeSetLocalStorage<T>(key: string, value: T): void {
  try {
    const str = JSON.stringify(value);
    // Don't attempt localStorage for very large data
    if (str.length < 2 * 1024 * 1024) {
      localStorage.setItem(key, str);
    }
  } catch (e) {
    // Quota exceeded: safely clear legacy large keys from localStorage
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
