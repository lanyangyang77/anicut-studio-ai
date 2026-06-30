import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ffmpegService } from '../lib/ffmpeg.service';
import {
  ArrowLeft,
  Play,
  Pause,
  Scissors,
  Wand2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Film,
} from 'lucide-react';
import apiClient from '../api/client';

export function EditorPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [ffLoaded, setFFLoaded] = useState(false);

  const handleExport = async () => {
    if (!ffLoaded) {
      try {
        await ffmpegService.load();
        setFFLoaded(true);
        alert('FFmpeg.wasm loaded! Ready for export.');
      } catch (e: any) {
        alert('Failed to load FFmpeg: ' + e.message);
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    apiClient.get('/projects/' + id)
      .then((res) => setProject(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-gray-500 text-sm">鍔犺浇涓?..</div>;
  }

  if (!project) {
    return <div className="text-gray-500">项目未找到</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={'/projects/' + id} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold text-white">{project.name}</h1>
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-surface-700 rounded">
            编辑模式
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            AI 助手
          </button>
          <button className="btn-primary text-sm">瀵煎嚭娓叉煋</button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Media panel */}
        <div className="w-64 panel p-3 flex flex-col">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">绱犳潗闈㈡澘</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="text-center py-8">
              <Film className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">鍔犺浇绱犳潗涓?..</p>
            </div>
          </div>
        </div>

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Preview */}
          <div className="panel flex-1 flex items-center justify-center bg-black rounded-xl min-h-[300px]">
            <div className="text-center">
              <Play className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">棰勮绐楀彛</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="panel p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">时间线</h3>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1 text-gray-500 hover:text-white"><Play className="w-3.5 h-3.5" /></button>
                <button className="p-1 text-gray-500 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Scene thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {project.scenes?.map((scene: any, i: number) => (
                <div
                  key={scene.id}
                  onClick={() => setSelectedScene(scene.id)}
                  className={
                    'flex-shrink-0 w-24 cursor-pointer rounded-lg border-2 transition-all ' +
                    (selectedScene === scene.id
                      ? 'border-neon-cyan neon-glow'
                      : 'border-transparent hover:border-gray-600')
                  }
                >
                  <div className="aspect-video bg-surface-700 rounded-t-lg flex items-center justify-center">
                    <Film className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="bg-surface-600 px-2 py-1 rounded-b-lg">
                    <p className="text-xs text-gray-300 truncate">
                      {scene.caption || '闀滃ご ' + (i + 1)}
                    </p>
                    <p className="text-xs text-gray-500">{scene.duration?.toFixed(1)}s</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="w-72 panel p-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">属性</h3>
          {selectedScene ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">鏃堕暱 (绉?</label>
                <input type="number" className="input-field text-sm py-1.5" defaultValue="3.0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">杞満</label>
                <select className="input-field text-sm py-1.5">
                  <option>cut</option>
                  <option>fade</option>
                  <option>dissolve</option>
                  <option>slide</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">字幕</label>
                <textarea className="input-field text-sm py-1.5" rows={3} placeholder="杈撳叆字幕鏂囨湰..." />
              </div>
              <button className="btn-secondary text-sm w-full flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                AI 换镜头              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Scissors className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">选择一个镜头编辑属性</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}