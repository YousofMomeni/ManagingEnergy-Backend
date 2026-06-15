// src/usage/schemas/usage.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Usage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Station', required: true })
  stationId: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  value: number;

  @Prop()
  unit: string;
}

export const UsageSchema = SchemaFactory.createForClass(Usage);