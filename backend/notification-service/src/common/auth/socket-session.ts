import { SOCKET_SESSION } from "./socket-session.constants";
import type { Server, Socket } from "socket.io";
import { verifyAccessClaims } from "./access-token";
import {
  assertActiveSession,
  type SessionIdentity,
} from "./session-authorization";

export function installSocketSessions(server: Server): void {
  server.use((client, next) => {
    void (async () => {
      const token: unknown =
        (client.handshake.auth as Record<string, unknown>)?.token ||
        client.handshake.query?.token ||
        client.handshake.headers.authorization?.match(
          /^Bearer\s+([^\s]+)$/i,
        )?.[1];
      const identity = verifyAccessClaims(token);
      await assertActiveSession(identity);
      (client.data as { sessionIdentity?: SessionIdentity }).sessionIdentity = identity;
      (client.data as { userId?: string }).userId = identity.sub;
      next();
    })().catch(() => next(new Error("A valid active session is required")));
  });
  server.on("connection", (client: Socket) => {
    const identity = (client.data as { sessionIdentity: SessionIdentity }).sessionIdentity;
    if (!identity) {
      client.disconnect(true);
      return;
    }
    void client.join([
      SOCKET_SESSION.sessionRoom(identity.sid),
      SOCKET_SESSION.userRoom(identity.sub),
    ]);
    const expiration = setTimeout(
      () => client.disconnect(true),
      Math.min(identity.exp * 1000 - Date.now(), 2147483647),
    );
    let checking = false;
    const check = async () => {
      if (checking || !client.connected) return;
      checking = true;
      try {
        await assertActiveSession(identity);
      } catch {
        client.disconnect(true);
      } finally {
        checking = false;
      }
    };
    const poll = setInterval(() => {
      void check();
    }, SOCKET_SESSION.pollMilliseconds);
    poll.unref();
    expiration.unref();
    client.use((_packet, next) => {
      void assertActiveSession(identity)
        .then(() => next())
        .catch(() => {
          client.disconnect(true);
          next(new Error("Session expired"));
        });
    });
    client.once("disconnect", () => {
      clearTimeout(expiration);
      clearInterval(poll);
    });
  });
}

export async function emitWithActiveSessions(
  server: Server | undefined,
  rooms: string | string[],
  event: string,
  payload: unknown,
  authorize?: (userId: string) => Promise<void>,
): Promise<void> {
  if (!server) return;
  const sockets = await server.in(rooms).fetchSockets();
  await Promise.all(
    sockets.map(async (socket) => {
      const identity = (socket.data as { sessionIdentity?: SessionIdentity }).sessionIdentity;
      if (!identity) {
        socket.disconnect(true);
        return;
      }
      try {
        await assertActiveSession(identity);
      } catch {
        socket.disconnect(true);
        return;
      }
      try {
        if (authorize) await authorize(identity.sub);
      } catch {
        return;
      }
      socket.emit(event, payload);
    }),
  );
}
