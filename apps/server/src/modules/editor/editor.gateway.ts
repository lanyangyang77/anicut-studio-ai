import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/editor',
})
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EditorGateway.name);

  handleConnection(client: Socket) {
    this.logger.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Client disconnected: ' + client.id);
  }

  @SubscribeMessage('join-project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.join('project:' + projectId);
    this.logger.log('Client ' + client.id + ' joined project ' + projectId);
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() projectId: string,
  ) {
    client.leave('project:' + projectId);
  }

  @SubscribeMessage('scene-update')
  handleSceneUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; sceneId: string; changes: any },
  ) {
    client.to('project:' + data.projectId).emit('scene-changed', data);
  }

  // Notify render progress
  notifyRenderProgress(renderTaskId: string, progress: number, status: string) {
    this.server.emit('render:progress', { renderTaskId, progress, status });
  }

  notifyRenderComplete(renderTaskId: string, outputPath: string) {
    this.server.emit('render:complete', { renderTaskId, outputPath });
  }
}