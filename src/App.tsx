import React, { useState, useEffect } from 'react';
import { Camera, FileText, Cpu, Settings as SettingsIcon, Plus, ChevronLeft, Search, Image as ImageIcon, Trash2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import * as db from './services/db';
import * as ai from './services/ai';
import { AppTab, Folder, ImageRecord, Note, ICCache, AppSettings } from './types';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Icons Mapping ---
const TABS = [
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'ic', label: 'IC Pins', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

// --- Sub-Components ---

// 1. Settings Section
const SettingsSection = ({ settings, setSettings }: { settings: AppSettings, setSettings: (s: AppSettings) => void }) => {
  const THEME_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
  ];

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    db.saveSettings(newSettings);
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="bento-card bg-primary/10 border-primary/20">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
          <SettingsIcon className="text-primary" /> Settings
        </h2>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Preferences & Display</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bento-card">
          <label className="block text-sm font-medium text-gray-400 mb-4 uppercase tracking-tighter">Note Font Size: {settings.fontSize}px</label>
          <input 
            type="range" 
            min="12" 
            max="32" 
            value={settings.fontSize} 
            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
            className="w-full h-2 bg-canvas rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="bento-card">
          <label className="block text-sm font-medium text-gray-400 mb-4 uppercase tracking-tighter">Theme Colors</label>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updateSettings({ themeColor: color.value })}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 transition-all",
                  settings.themeColor === color.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border-card">
        <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-bold">BiomedServe Engineering Suite v1.1.0 (Bento Edition)</p>
      </div>
    </div>
  );
};

// 2. IC Section
const ICSection = ({ settings }: { settings: AppSettings }) => {
  const [icNumber, setIcNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ICCache | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ICCache[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const dbInstance = await db.getDB();
    const all = await dbInstance.getAll('ic_cache');
    setHistory(all.sort((a, b) => b.cachedAt - a.cachedAt));
  };

  const handleSearch = async (num: string) => {
    if (!num) return;
    setLoading(true);
    setResult(null);
    try {
      const cached = await db.getCachedIC(num.toUpperCase());
      if (cached) {
        setResult(cached);
      } else {
        const description = await ai.fetchICDescription(num);
        const data = {
          icNumber: num.toUpperCase(),
          description: description || 'No description found.',
          cachedAt: Date.now()
        };
        await db.cacheIC(data);
        setResult(data);
        loadHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    h.icNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="sticky top-0 z-10 bg-canvas/80 backdrop-blur-md pt-2 pb-6 border-b border-border-card">
        <div className="relative">
          <input
            type="text"
            placeholder="Enter IC # (e.g. SN74LS00, LM358)"
            value={icNumber}
            onChange={(e) => setIcNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(icNumber)}
            className="w-full bg-surface border border-border-card rounded-2xl py-4 px-4 pl-12 focus:border-primary outline-none transition-all shadow-xl"
            style={{ borderBottomWidth: '4px', borderBottomColor: settings.themeColor } as any}
          />
          <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <button 
            onClick={() => handleSearch(icNumber)}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tight text-white"
            style={{ backgroundColor: settings.themeColor }}
          >
            SEARCH
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col items-center justify-center py-24 space-y-6"
          >
            <div className="w-12 h-12 border-4 border-surface border-t-primary rounded-full animate-spin" style={{ borderTopColor: settings.themeColor } as any} />
            <div className="text-center">
              <p className="text-gray-200 font-bold">Scanning Datasheets...</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Accessing Global IC Registry</p>
            </div>
          </motion.div>
        ) : result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <button 
              onClick={() => setResult(null)}
              className="px-4 py-2 bg-surface border border-border-card rounded-xl text-xs font-bold text-gray-400 hover:text-white flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back to History
            </button>
            <div className="bento-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border-card">
                <div>
                  <h3 className="text-5xl font-black italic tracking-tighter" style={{ color: settings.themeColor }}>{result.icNumber}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase" style={{ color: settings.themeColor, backgroundColor: settings.themeColor + '33' } as any}>Active Component</span>
                    <span className="text-[10px] text-gray-500 font-mono">OFFLINE SYNCED {new Date(result.cachedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="p-4 bg-canvas rounded-xl flex items-center gap-4 border border-border-card">
                  <div className="w-16 h-10 bg-surface border-x-4 border-gray-600 relative">
                    <div className="absolute -left-1 top-1 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -left-1 top-3 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -left-1 top-5 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -left-1 top-7 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -right-1 top-1 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -right-1 top-3 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -right-1 top-5 w-1 h-0.5 bg-gray-500"></div>
                    <div className="absolute -right-1 top-7 w-1 h-0.5 bg-gray-500"></div>
                  </div>
                  <span className="text-xs font-bold text-gray-400">DIP PACKAGE</span>
                </div>
              </div>
              <div className="prose prose-invert max-w-none prose-sm overflow-x-auto no-scrollbar" style={{ fontSize: settings.fontSize }}>
                <ReactMarkdown>{result.description}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <div className="relative">
              <input
                placeholder="Filter previously searched parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-border-card py-3 pl-10 text-sm outline-none focus:border-primary transition-all"
              />
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHistory.map(h => (
                <button 
                  key={h.icNumber}
                  onClick={() => setResult(h)}
                  className="bento-card group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-canvas rounded-xl flex items-center justify-center border border-border-card group-hover:scale-110 transition-transform">
                      <Cpu className="w-6 h-6 text-gray-500 group-hover:text-primary" style={{ color: settings.themeColor } as any} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-lg group-hover:text-primary transition-colors tracking-tight">{h.icNumber}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Component Cache</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 text-gray-700 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
              
              {filteredHistory.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-700 bg-surface/30 rounded-3xl border border-dashed border-border-card">
                  <div className="relative mb-4">
                    <Cpu className="w-16 h-16 opacity-10" />
                    <Search className="absolute -bottom-2 -right-2 w-8 h-8 opacity-20 text-primary" />
                  </div>
                  <p className="font-bold text-gray-500">No cached documents found</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1">Search above to download to offline DB</p>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 3. Notes Section
const NotesSection = ({ settings }: { settings: AppSettings }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const all = await db.getNotes();
    setNotes(all.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleSave = async () => {
    if (!editingNote || !editingNote.title) return;
    if (editingNote.id) {
      await db.updateNote(editingNote.id, editingNote);
    } else {
      await db.addNote({
        title: editingNote.title || 'Untitled',
        content: editingNote.content || '',
        equipmentName: editingNote.equipmentName || 'General',
      });
    }
    setEditingNote(null);
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this note?')) {
      await db.deleteNote(id);
      loadNotes();
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.equipmentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {editingNote ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card min-h-[calc(100vh-10rem)] flex flex-col space-y-6"
        >
          <div className="flex justify-between items-center border-b border-border-card pb-4">
            <button onClick={() => setEditingNote(null)} className="p-3 bg-canvas hover:bg-canvas/50 rounded-2xl transition-colors">
              <ChevronLeft />
            </button>
            <div className="flex gap-3">
              <button 
                onClick={handleSave} 
                className="px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-tight text-white flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: settings.themeColor }}
              >
                <Save className="w-4 h-4" /> Save Record
              </button>
            </div>
          </div>
          <div className="space-y-4 flex flex-col flex-1">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Equipment Name</label>
              <input
                autoFocus
                placeholder="e.g. Philips IntelliVue MX800"
                value={editingNote.equipmentName || ''}
                onChange={(e) => setEditingNote({...editingNote, equipmentName: e.target.value})}
                className="bg-canvas border border-border-card rounded-xl px-4 py-3 text-xl font-black italic tracking-tighter outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Log Title</label>
              <input
                placeholder="e.g. PSU Maintenance / Calibration"
                value={editingNote.title || ''}
                onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                className="bg-canvas border border-border-card rounded-xl px-4 py-3 text-lg font-bold outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Detailed Findings</label>
              <textarea
                placeholder="Document your service actions here..."
                value={editingNote.content || ''}
                onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                className="flex-1 bg-canvas border border-border-card rounded-2xl px-4 py-4 outline-none focus:border-primary transition-all resize-none leading-relaxed"
                style={{ fontSize: settings.fontSize }}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-surface p-6 rounded-3xl border border-border-card shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <FileText className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Service Records</h2>
              <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">{notes.length} Documents in Archive</p>
            </div>
            <button 
              onClick={() => setEditingNote({ title: '', content: '', equipmentName: '' })}
              className="relative z-10 p-5 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all text-white"
              style={{ backgroundColor: settings.themeColor }}
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>
          
          <div className="relative max-w-md">
            <input
              placeholder="Search records by part or machine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border-card rounded-2xl py-4 px-12 outline-none focus:border-primary shadow-lg transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map(note => (
              <div 
                key={note.id} 
                className="bento-card flex flex-col justify-between group cursor-pointer hover:shadow-2xl relative overflow-hidden active:scale-[0.98] transition-all"
                onClick={() => setEditingNote(note)}
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: settings.themeColor }} />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-black">{note.equipmentName}</span>
                    <span className="text-[9px] text-gray-600 font-mono italic">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-black text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">{note.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-3 mt-3 leading-relaxed">{note.content}</p>
                </div>
                <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.themeColor }} />
                    <span className="text-[10px] font-black uppercase text-gray-500">Service Record</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="col-span-full py-32 bento-card border-dashed flex flex-col items-center justify-center text-gray-700 bg-surface/30">
                <FileText className="w-16 h-16 opacity-10 mb-4" />
                <p className="font-bold text-gray-500">No matching service records</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Refine search or add a new record</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Images Section
const ImagesSection = ({ settings }: { settings: AppSettings }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    loadFolders();
    if (viewAll) loadAllImages();
  }, [viewAll]);

  useEffect(() => {
    if (activeFolder) loadImages(activeFolder.id);
  }, [activeFolder]);

  const loadFolders = async () => {
    const all = await db.getFolders();
    setFolders(all.sort((a, b) => b.createdAt - a.createdAt));
  };

  const loadImages = async (folderId: string) => {
    const imgs = await db.getImagesByFolder(folderId);
    setImages(imgs.sort((a, b) => b.createdAt - a.createdAt));
  };

  const loadAllImages = async () => {
    const imgs = await db.getAllImages();
    setImages(imgs.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleAddFolder = async () => {
    if (!newFolderName) return;
    await db.addFolder(newFolderName);
    setNewFolderName('');
    setShowAddFolder(false);
    loadFolders();
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolder || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await db.addImage(activeFolder.id, dataUrl, file.name);
      loadImages(activeFolder.id);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 space-y-8 max-w-7xl mx-auto">
      {viewAll ? (
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <button onClick={() => setViewAll(false)} className="p-4 bg-surface rounded-2xl shadow-xl hover:bg-canvas transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Engineering Archive</h2>
              <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Global Scan View</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map(img => (
              <div key={img.id} className="aspect-square bg-canvas rounded-2xl overflow-hidden border border-border-card relative group shadow-lg hover:shadow-primary/20 transition-all">
                <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-canvas/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-3 text-center">
                   <button 
                    onClick={() => {
                      if (confirm('Erase this record?')) {
                        db.getDB().then(async d => {
                          await d.delete('images', img.id);
                          loadAllImages();
                        });
                      }
                    }}
                    className="p-3 bg-red-500 rounded-2xl text-white shadow-2xl mb-2 hover:scale-110 transition-transform"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <p className="text-[8px] font-black uppercase tracking-tighter line-clamp-2">{img.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeFolder ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-surface p-6 rounded-3xl border border-border-card shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-6 relative z-10">
              <button onClick={() => setActiveFolder(null)} className="p-4 bg-canvas rounded-2xl hover:bg-canvas/50 transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{activeFolder.name}</h2>
                <p className="text-xs text-gray-500 mt-1 font-bold uppercase tracking-widest">{images.length} Service Logs Detected</p>
              </div>
            </div>
            <label className="relative z-10 p-5 rounded-2xl cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all text-white" style={{ backgroundColor: settings.themeColor }}>
              <Camera className="w-8 h-8" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="aspect-square bg-canvas rounded-2xl overflow-hidden border border-border-card relative group shadow-lg">
                <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <button 
                    onClick={() => {
                      if (confirm('Delete this record?')) {
                        db.getDB().then(async d => {
                          await d.delete('images', img.id);
                          loadImages(activeFolder.id);
                        });
                      }
                    }}
                    className="p-3 bg-red-500 rounded-2xl text-white shadow-2xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-canvas/80 p-2 text-[8px] font-black uppercase tracking-tighter truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.name}
                </div>
              </div>
            ))}
            {images.length === 0 && (
              <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-700 bento-card border-dashed">
                <ImageIcon className="w-16 h-16 opacity-10 mb-4" />
                <p className="font-bold">No captures found for this equipment</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Activate camera to document service</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="flex-1">
              <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.8] mb-2">Visual<br/>Vault</h1>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-[0.2em] ml-1">Engineering Image Management</p>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setViewAll(true)}
                className="flex-1 sm:flex-initial px-8 py-3 bg-surface border border-border-card rounded-2xl text-xs font-black uppercase tracking-tight shadow-xl hover:bg-canvas transition-all"
              >
                Scan Archive
              </button>
              <button 
                onClick={() => setShowAddFolder(true)}
                className="flex-none p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all text-white"
                style={{ backgroundColor: settings.themeColor }}
              >
                <Plus className="w-8 h-8" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder)}
                className="bento-card group flex flex-col items-start gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-125 transition-transform">
                  <ImageIcon className="w-24 h-24" />
                </div>
                <div className="w-16 h-16 bg-canvas rounded-2xl flex items-center justify-center border border-border-card group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-primary" style={{ color: settings.themeColor } as any} />
                </div>
                <div className="text-left w-full">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-black text-2xl tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">{folder.name}</h4>
                    <span className="text-[10px] items-center gap-1 flex border border-border-card bg-canvas px-2 py-0.5 rounded-full text-gray-500 font-mono">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> SYNCED
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-2">Equipment Log • {new Date(folder.createdAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-700 bento-card border-dashed">
                <Plus className="w-16 h-16 opacity-10 mb-4" />
                <p className="font-bold">Infrastructure empty</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Initiate a new machine record</p>
              </div>
            )}
          </div>

          {showAddFolder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-canvas/90 backdrop-blur-2xl">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bento-card w-full max-w-md shadow-2xl space-y-8"
              >
                <div>
                  <h3 className="text-4xl font-black italic tracking-tighter uppercase border-b border-border-card pb-4">New Machine</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-4 font-bold">Register Equipment Profile</p>
                </div>
                <input
                  autoFocus
                  placeholder="e.g. SIEMENS MAGNETOM"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-canvas border border-border-card rounded-2xl py-5 px-6 text-xl outline-none focus:border-primary transition-all font-black uppercase tracking-tight"
                />
                <div className="flex gap-4">
                  <button onClick={() => setShowAddFolder(false)} className="flex-1 py-4 font-black uppercase text-xs text-gray-500 hover:text-white transition-colors">Abort</button>
                  <button 
                    onClick={handleAddFolder} 
                    className="flex-1 py-4 rounded-2xl font-black uppercase text-xs text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                    style={{ backgroundColor: settings.themeColor }}
                  >
                    Establish Profile
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- App Entry ---
export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('images');
  const [settings, setSettings] = useState<AppSettings>({
    id: 'main',
    fontSize: 16,
    themeColor: '#3b82f6'
  });

  useEffect(() => {
    db.initDB();
    const loadSettings = async () => {
      const s = await db.getSettings();
      if (s) setSettings(s);
    };
    loadSettings();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-gray-100 font-sans select-none flex flex-col pb-24">
      <header className="px-8 py-8 flex justify-between items-center bg-canvas/50 backdrop-blur-3xl sticky top-0 z-40 border-b border-border-card">
        <div className="flex items-center gap-6 group">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: settings.themeColor }}>
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">BiomedServe</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-1 font-bold">Service Hub v1.1.0</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-3 py-1 bg-surface border border-border-card rounded-lg text-[10px] text-gray-400 uppercase font-black tracking-widest shadow-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-2 pr-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[8px] font-black uppercase text-emerald-500 tracking-tighter">System Online</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'images' && <ImagesSection settings={settings} />}
            {activeTab === 'notes' && <NotesSection settings={settings} />}
            {activeTab === 'ic' && <ICSection settings={settings} />}
            {activeTab === 'settings' && <SettingsSection settings={settings} setSettings={setSettings} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 inset-x-6 h-20 bg-surface/80 backdrop-blur-3xl border border-border-card rounded-[2.5rem] flex items-center justify-around px-4 z-40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AppTab)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-[80%] transition-all gap-1.5 relative rounded-3xl",
                isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabNav" 
                  className="absolute inset-0 bg-canvas/50 border border-border-card rounded-3xl -z-10 shadow-inner"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn("w-6 h-6 transition-all duration-500", isActive && "scale-110")} style={{ color: isActive ? settings.themeColor : undefined } as any} />
              <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      
      <style>{`
        .text-primary { color: ${settings.themeColor}; }
        .bg-primary { background-color: ${settings.themeColor}; }
        .border-primary { border-color: ${settings.themeColor}; }
        ::selection { background: ${settings.themeColor}44; color: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${settings.themeColor}33; border-radius: 10px; }
      `}</style>
    </div>
  );
}
