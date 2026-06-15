// src/get-data/get-data.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GetDataService {
  async fetchDataFromAPI(endpoint: string, params?: any) {
    try {
      const response = await axios.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data from API: ${error.message}`);
    }
  }
}