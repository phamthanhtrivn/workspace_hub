"""Serialize mutations of the same document without serializing separate uploads."""
import threading
from contextlib import contextmanager
from weakref import WeakValueDictionary

_guard = threading.Lock()
_locks = WeakValueDictionary()
_scopes = WeakValueDictionary()
_deleted = set()


class ScopeLock:
    def __init__(self):
        self.condition = threading.Condition()
        self.readers = 0
        self.holders = {}
        self.deleting = False


@contextmanager
def scope_lock(scope, namespace='route', deleting=False, cleanup=False):
    """Allow parallel uploads, but drain them before permanently deleting a scope.

    Tombstones live for this process; after restart, SQL prevents deleted notebooks
    from producing new jobs. RAG runs one process per deployment.
    """
    key = (scope, namespace)
    thread = threading.get_ident()
    with _guard:
        state = _scopes.get(key)
        if state is None:
            state = ScopeLock()
            _scopes[key] = state
    with state.condition:
        if deleting:
            state.condition.wait_for(lambda: not state.deleting)
            state.deleting = True
            _deleted.add(key)
            state.condition.wait_for(lambda: state.readers == 0)
        else:
            if state.holders.get(thread):
                pass  # An admitted mutation may finish nested cleanup/conversion.
            elif cleanup:
                state.condition.wait_for(lambda: not state.deleting)
            elif key in _deleted:
                raise ValueError('Notebook has been deleted')
            state.readers += 1
            state.holders[thread] = state.holders.get(thread, 0) + 1
    try:
        yield
    finally:
        with state.condition:
            if deleting:
                state.deleting = False
            else:
                state.readers -= 1
                state.holders[thread] -= 1
                if not state.holders[thread]:
                    del state.holders[thread]
            state.condition.notify_all()


def document_lock(scope, source, namespace='route'):
    with _guard:
        key = (scope, source, namespace)
        lock = _locks.get(key)
        if lock is None:
            lock = threading.RLock()
            _locks[key] = lock
        return lock
