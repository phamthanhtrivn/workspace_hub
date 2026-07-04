import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NotificationDocument = Notification & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Notification {
  @Prop({ required: true, index: true })
  recipientId: string; // Recipient User UUID

  @Prop({ index: true })
  senderId?: string; // Sender User UUID (for click-to-profile)

  @Prop()
  senderName?: string; // Display name of the sender

  @Prop()
  senderAvatar?: string; // Avatar URL of the sender

  @Prop({ required: true })
  type: string; // 'CHAT', 'INVITATION', 'TASK', 'SYSTEM', etc.

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  link?: string; // Client navigation URL (e.g. /tasks/123)

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
