import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BiomedDB extends DBSchema {
  folders: {
    key: string;
    value: {
      id: string;
      name: string;
      createdAt: number;
    };
  };
  images: {
    key: string;
    value: {
      id: string;
      folderId: string;
      dataUrl: string;
      name: string;
      createdAt: number;
    };
    indexes: { 'by-folder': string };
  };
  notes: {
    key: string;
    value: {
      id: string;
      title: string;
      content: string;
      equipmentName: string;
      createdAt: number;
      updatedAt: number;
    };
  };
  ic_cache: {
    key: string;
    value: {
      icNumber: string;
      description: string;
      manufacturer?: string;
      cachedAt: number;
    };
  };
  settings: {
    key: string;
    value: {
      id: string;
      fontSize: number;
      themeColor: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BiomedDB>>;

export const initDB = () => {
  dbPromise = openDB<BiomedDB>('biomed-serve-db', 1, {
    upgrade(db) {
      db.createObjectStore('folders', { keyPath: 'id' });
      const imageStore = db.createObjectStore('images', { keyPath: 'id' });
      imageStore.createIndex('by-folder', 'folderId');
      db.createObjectStore('notes', { keyPath: 'id' });
      db.createObjectStore('ic_cache', { keyPath: 'icNumber' });
      db.createObjectStore('settings', { keyPath: 'id' });
    },
  });
};

export const getDB = () => {
  if (!dbPromise) initDB();
  return dbPromise;
};

// Folders
export const addFolder = async (name: string) => {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('folders', { id, name, createdAt: Date.now() });
  return id;
};

export const getFolders = async () => {
  const db = await getDB();
  return db.getAll('folders');
};

// Images
export const addImage = async (folderId: string, dataUrl: string, name: string) => {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('images', { id, folderId, dataUrl, name, createdAt: Date.now() });
  return id;
};

export const getImagesByFolder = async (folderId: string) => {
  const db = await getDB();
  return db.getAllFromIndex('images', 'by-folder', folderId);
};

export const getAllImages = async () => {
  const db = await getDB();
  return db.getAll('images');
};

// Notes
export const addNote = async (note: Omit<BiomedDB['notes']['value'], 'id' | 'createdAt' | 'updatedAt'>) => {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.add('notes', { ...note, id, createdAt: now, updatedAt: now });
  return id;
};

export const updateNote = async (id: string, note: Partial<BiomedDB['notes']['value']>) => {
  const db = await getDB();
  const existing = await db.get('notes', id);
  if (!existing) return;
  await db.put('notes', { ...existing, ...note, updatedAt: Date.now() });
};

export const deleteNote = async (id: string) => {
  const db = await getDB();
  await db.delete('notes', id);
};

export const getNotes = async () => {
  const db = await getDB();
  return db.getAll('notes');
};

// IC Cache
export const cacheIC = async (ic: BiomedDB['ic_cache']['value']) => {
  const db = await getDB();
  await db.put('ic_cache', ic);
};

export const getCachedIC = async (icNumber: string) => {
  const db = await getDB();
  return db.get('ic_cache', icNumber);
};

// Settings
export const saveSettings = async (settings: BiomedDB['settings']['value']) => {
  const db = await getDB();
  await db.put('settings', settings);
};

export const getSettings = async () => {
  const db = await getDB();
  return db.get('settings', 'main');
};
