import { Actor } from "../../common/types";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { authorizeSources } from "../../infrastructure/integrations/document.client";
import { startChatRequest } from "./chat-request";
import { BadRequestException, Injectable } from "@nestjs/common";
import { SourcesService } from "../sources/sources.service";
import { selectSources } from "../../common/evidence-policy";

@Injectable()
export class ChatAdmissionService {
  constructor(private readonly sources: SourcesService) {}
  async selectedSources(notebookId: string, sourceIds: string[]) {
    try {
      return selectSources(sourceIds, await this.sources.sources(notebookId));
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async prepare(
    actor: Actor,
    notebookId: string,
    sourceIds: string[],
    requestId: string,
    signal: AbortSignal,
  ) {
    await ownedNotebook(actor, notebookId);
    const sources = await this.selectedSources(notebookId, sourceIds);
    await authorizeSources(actor, sources, false, signal);
    signal.throwIfAborted();
    await startChatRequest(actor.id, notebookId, requestId);
    return sources;
  }
}
