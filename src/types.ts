export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  folderId: string;
  dataUrl: string;
  name: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  equipmentName: string;
  createdAt: number;
  updatedAt: number;
}

export interface ICCache {
  icNumber: string;
  description: string;
  manufacturer?: string;
  cachedAt: number;
}

export interface AppSettings {
  id: string;
  fontSize: number;
  themeColor: string;
}

export type AppTab = 'images' | 'notes' | 'ic' | 'settings';
