"""Short-lived, bounded parsed chunks; never authorization or document hits."""
import sys
import threading
import time
from collections import OrderedDict
from collections.abc import Iterable

Chunk = tuple[str, int | None]
CacheKey = tuple[str, str, str, bytes]


class PreparedCache:
    def __init__(self, max_bytes: int = 8 * 1024 * 1024, max_entries: int = 16, ttl: float = 300):
        self.max_bytes = max_bytes
        self.max_entries = max_entries
        self.ttl = ttl
        self.entries: OrderedDict[CacheKey, tuple[float, tuple[Chunk, ...], int]] = OrderedDict()
        self.bytes = 0
        self.lock = threading.Lock()

    def _remove(self, key: CacheKey) -> None:
        _, _, size = self.entries.pop(key)
        self.bytes -= size

    def _expire(self) -> None:
        now = time.monotonic()
        for key, (created, _, _) in list(self.entries.items()):
            if now - created >= self.ttl:
                self._remove(key)

    def get(self, key: CacheKey) -> tuple[Chunk, ...] | None:
        with self.lock:
            self._expire()
            entry = self.entries.get(key)
            if entry is None:
                return None
            self.entries.move_to_end(key)
            return entry[1]

    def put(self, key: CacheKey, chunks: Iterable[Chunk]) -> None:
        chunks = tuple(chunks)
        size = (sys.getsizeof(key) + sum(sys.getsizeof(part) for part in key)
                + sys.getsizeof(chunks)
                + sum(sys.getsizeof(pair) + sys.getsizeof(pair[0]) + sys.getsizeof(pair[1]) for pair in chunks))
        with self.lock:
            self._expire()
            if key in self.entries:
                self._remove(key)
            if size > self.max_bytes:
                return
            while self.entries and (self.bytes + size > self.max_bytes or len(self.entries) >= self.max_entries):
                self._remove(next(iter(self.entries)))
            self.entries[key] = (time.monotonic(), chunks, size)
            self.bytes += size

    def clear_scope(self, scope_id: str) -> None:
        with self.lock:
            for key in list(self.entries):
                if key[0] == scope_id:
                    self._remove(key)
