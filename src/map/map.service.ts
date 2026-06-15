// src/map/map.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MapService {
  async loadTiles(lat: number, lng: number, zoom: number) {
    // Example OpenStreetMap tile server
    const tileUrl = `https://tile.openstreetmap.org/${zoom}/${lat}/${lng}.png`;
    
    try {
      const response = await axios.get(tileUrl, { responseType: 'arraybuffer' });
      return {
        tile: Buffer.from(response.data, 'binary').toString('base64'),
        coordinates: { lat, lng, zoom }
      };
    } catch (error) {
      throw new Error(`Failed to load map tile: ${error.message}`);
    }
  }
}