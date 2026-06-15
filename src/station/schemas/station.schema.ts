// src/station/schemas/station.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Station extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: { lat: Number, lng: Number }, required: true })
  location: { lat: number; lng: number };

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, unique: true })
  serialNo: string;

  @Prop({ required: true })
  ip: string;

  @Prop({ required: true })
  port: number;
}

export const StationSchema = SchemaFactory.createForClass(Station);