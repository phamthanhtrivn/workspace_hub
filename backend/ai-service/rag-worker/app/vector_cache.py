"""Persistent, bounded passage-vector cache. Stores hashes/vectors, never text or credentials."""
import hashlib
import math
import sqlite3
import threading
import time
from array import array
from pathlib import Path


class VectorCache:
    def __init__(self, path: str = '/models/embedding-cache.sqlite3', max_entries: int = 20000):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path, timeout=10, check_same_thread=False)
        self.lock = threading.Lock()
        self.flights_lock = threading.Lock()
        self.flights = {}
        self.max_entries = max_entries
        self.connection.execute('PRAGMA journal_mode=WAL')
        self.connection.execute('PRAGMA busy_timeout=10000')
        self.connection.execute('''CREATE TABLE IF NOT EXISTS vectors (
            scope TEXT NOT NULL, namespace TEXT NOT NULL, digest TEXT NOT NULL,
            vector BLOB NOT NULL, touched REAL NOT NULL,
            PRIMARY KEY(scope,namespace,digest))''')
        self.connection.execute('''CREATE TABLE IF NOT EXISTS routes (
            scope TEXT NOT NULL, source TEXT NOT NULL, collection TEXT NOT NULL,
            PRIMARY KEY(scope,source))''')
        self.connection.commit()

    @staticmethod
    def digest(text):
        return hashlib.sha256(text.encode()).hexdigest()

    @staticmethod
    def valid(vector):
        return isinstance(vector, (list, array)) and 0 < len(vector) <= 16384 and any(vector) and all(
            type(value) in (int, float) and math.isfinite(value) for value in vector)

    def get(self, scope, namespace, digests):
        if not digests:
            return {}
        placeholders = ','.join('?' for _ in digests)
        now = time.time()
        with self.lock, self.connection:
            rows = self.connection.execute(
                f'SELECT digest,vector FROM vectors WHERE scope=? AND namespace=? AND digest IN ({placeholders}) AND touched>?',
                [scope, namespace, *digests, now - 30 * 86400],
            ).fetchall()
            self.connection.executemany('UPDATE vectors SET touched=? WHERE scope=? AND namespace=? AND digest=?',
                                        [(now, scope, namespace, key) for key, _ in rows])
        result = {}
        for key, blob in rows:
            values = array('f')
            try:
                values.frombytes(blob)
            except ValueError:
                continue
            if self.valid(values):
                result[key] = list(values)
        return result

    def put(self, scope, namespace, entries):
        values = []
        for text, vector in entries:
            if not self.valid(vector):
                raise ValueError('Invalid cached embedding vector')
            values.append((scope, namespace, self.digest(text), array('f', vector).tobytes(), time.time()))
        if not values:
            return
        with self.lock, self.connection:
            self.connection.executemany('INSERT OR REPLACE INTO vectors VALUES(?,?,?,?,?)', values)
            self.connection.execute('DELETE FROM vectors WHERE touched<?', [time.time() - 30 * 86400])
            count = self.connection.execute('SELECT count(*) FROM vectors').fetchone()[0]
            if count > self.max_entries:
                self.connection.execute('DELETE FROM vectors WHERE rowid IN (SELECT rowid FROM vectors ORDER BY touched LIMIT ?)',
                                        [count - self.max_entries])

    def embed(self, scope, namespace, texts, generate):
        unique = {self.digest(text): text for text in texts}
        cached = self.get(scope, namespace, list(unique))
        missing = sorted(set(unique) - set(cached))
        locks = []
        try:
            with self.flights_lock:
                for key in missing:
                    identity = (scope, namespace, key)
                    lock, count = self.flights.get(identity, (threading.Lock(), 0))
                    self.flights[identity] = (lock, count + 1)
                    locks.append((identity, lock))
            for _, lock in locks:
                lock.acquire()
            cached.update(self.get(scope, namespace, missing))
            missing = [key for key in missing if key not in cached]
            if missing:
                vectors = generate([unique[key] for key in missing])
                if len(vectors) != len(missing):
                    raise ValueError('Incomplete cached embeddings')
                self.put(scope, namespace, [(unique[key], vector) for key, vector in zip(missing, vectors, strict=True)])
                cached.update(zip(missing, vectors, strict=True))
            return [list(cached[self.digest(text)]) for text in texts], len(texts) - len(missing), len(missing)
        finally:
            for _, lock in reversed(locks):
                lock.release()
            with self.flights_lock:
                for identity, lock in locks:
                    count = self.flights[identity][1] - 1
                    if count:
                        self.flights[identity] = (lock, count)
                    else:
                        del self.flights[identity]

    def clear_scope(self, scope):
        with self.lock, self.connection:
            self.connection.execute('DELETE FROM vectors WHERE scope=?', [scope])

    def route(self, scope, source):
        with self.lock:
            row = self.connection.execute('SELECT collection FROM routes WHERE scope=? AND source=?',
                                          [scope, source]).fetchone()
        return row[0] if row else None

    def set_route(self, scope, source, collection):
        with self.lock, self.connection:
            self.connection.execute('INSERT OR REPLACE INTO routes VALUES(?,?,?)', [scope, source, collection])

    def delete_routes(self, scope, source=None):
        with self.lock, self.connection:
            if source is None:
                self.connection.execute('DELETE FROM routes WHERE scope=?', [scope])
            else:
                self.connection.execute('DELETE FROM routes WHERE scope=? AND source=?', [scope, source])

    def close(self):
        with self.lock:
            self.connection.close()
