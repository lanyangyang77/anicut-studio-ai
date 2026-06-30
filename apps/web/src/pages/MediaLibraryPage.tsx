import { useState, useEffect, useRef } from 'react';
import { Upload, Search, X, Tag, Film, Image as ImageIcon, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import { ffmpegService } from '../lib/ffmpeg.service';
import { useFFmpeg } from '../hooks/useFFmpeg';


export function MediaLibraryPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
const { loaded, loading: ffmpegLoading, error: ffmpegError, available: ffmpegAvailable, load: loadFFmpeg } = useFFmpeg();
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    try {
      const { data: res } = await apiClient.get('/media');
      setMedia(res.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMedia(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type.startsWith('video') ? 'video' : 'image');

    try {
      await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadMedia();
    } catch {} finally {
      setUploading(false);
    }
  };


  const handleFFmpegLoad = async () => {
    if (!loaded) await loadFFmpeg();
  };
  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete('/media/' + id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch {}
  };

  const filtered = media.filter(
    (m) =>
      m.originalName?.toLowerCase().includes(filter.toLowerCase()) ||
      m.tags?.some((t: any) => t.name.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">素材库</h1>
        <button onClick={() => fileInputRef.current?.click()} className="btn-primary flex items-center gap-2" disabled={uploading}>
          <Upload className="w-4 h-4" />
          {uploading ? '上传中...' : '上传素材'}
        </button>
        <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={handleUpload} />

      {/* FFmpeg.wasm browser processing */}
      {loading && (
        <div className='bg-surface-700 border border-neon-cyan/30 rounded-lg px-4 py-2 text-sm text-gray-300'>
          <span className='text-neon-cyan animate-pulse'>●</span> Loading FFmpeg.wasm...
        </div>
      )}
      {!loading && !error && !uploading && (
        <button onClick={handleFFmpegLoad} className='btn-secondary text-sm flex items-center gap-1.5'>
          <span className='w-3 h-3 bg-neon-green rounded-full'></span>
          Browser FFmpeg Ready
        </button>
      )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder="搜索素材名称或标签..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-gray-500 text-sm">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">暂无素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filtered.map((item: any) => (
            <div key={item.id} className="card p-3">
              {/* Thumbnail */}
              <div className="aspect-video bg-surface-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {item.type === 'video' ? (
                  <Film className="w-8 h-8 text-gray-600" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {item.originalName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(item.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.slice(0, 3).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="text-xs px-1.5 py-0.5 rounded bg-surface-600 text-gray-300"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}