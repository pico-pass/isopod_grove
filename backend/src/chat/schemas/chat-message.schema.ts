import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

export const CHAT_CHANNELS = ['free', 'question', 'inquiry'] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];
export const DEFAULT_CHAT_CHANNEL: ChatChannel = 'free';

@Schema({ collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, default: DEFAULT_CHAT_CHANNEL })
  channel: string;

  @Prop({ required: true, maxlength: 300 })
  text: string;

  @Prop({ required: true })
  createdAt: number;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ channel: 1, createdAt: 1 });
