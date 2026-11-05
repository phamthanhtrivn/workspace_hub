import { Module } from "@nestjs/common";
import { ConversationController } from "./conversation.controller";

@Module({ controllers: [ConversationController] })
export class ConversationModule {}
