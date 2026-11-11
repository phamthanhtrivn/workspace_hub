"""Serialize mutations of the same document without serializing separate uploads."""
import threading
from weakref import WeakValueDictionary

_guard = threading.Lock()
_locks = WeakValueDictionary()


def document_lock(scope, source, namespace='route'):
    with _guard:
        key = (scope, source, namespace)
        lock = _locks.get(key)
        if lock is None:
            lock = threading.RLock()
            _locks[key] = lock
        return lock
