import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../../common/access-token";
import { allowSocketRequest, socketCorsOptions } from '../../common/socket-origin';

@WebSocketGateway({
  path: "/notification.io",
  cors: socketCorsOptions,
  allowRequest: allowSocketRequest,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server): void {
    server.use((client, next) => {
      try {
        verifyAccessToken(client.handshake.auth?.token || client.handshake.query?.token);
        next();
      } catch {
        next(new Error('A valid access token is required'));
      }
    });
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const userId = verifyAccessToken(token);

      // Store userId in socket data
      client.data.userId = userId;

      // Join a room specific to the user for direct private notifications
      client.join(userId);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}
}
