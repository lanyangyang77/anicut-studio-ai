import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Settings, Trash2, ArrowLeft, Edit, Sparkles } from 'lucide-react';
import apiClient from '../api/client';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get('/projects/' + id)
      .then((res) => setProject(res.data.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-gray-500 text-sm">加载中...</div>;
  }

  if (!project) return null;

  return (
    <div className="max-w-6xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
        <div className="flex items-center gap-2">
          <Link to={'/projects/' + id + '/edit'} className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" />
            进入编辑
          </Link>
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            设置
          </button>
        </div>
      </div>

      {/* Project info */}
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-gray-400 mb-4">{project.description}</p>
        )}

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <span>风格: {project.clipStyle === 'fast_paced' ? '快节奏' : project.clipStyle === 'slow' ? '舒缓' : '卡点'}</span>
          <span>镜头: {project.scenes?.length || 0}</span>
          <span>状态: {project.status}</span>
          <span>创建: {new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Script */}
      {project.script && (
        <div className="card mb-6">
          <h3 className="font-medium text-white mb-3">解说文案</h3>
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{project.script}</p>
        </div>
      )}

      {/* Timeline preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">时间线 ({project.scenes?.length || 0} 镜头)</h3>
          <button className="btn-secondary text-sm flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI 重新匹配
          </button>
        </div>

        {/* Scene list */}
        <div className="space-y-2">
          {project.scenes?.map((scene: any, i: number) => (
            <div
              key={scene.id}
              className="flex items-center gap-4 p-3 bg-surface-700 rounded-lg"
            >
              <span className="text-xs text-gray-500 w-6">{i + 1}</span>
              <div className="w-20 h-12 bg-surface-600 rounded flex items-center justify-center">
                <Play className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">
                  {scene.caption || scene.sourceText || '镜头 ' + (i + 1)}
                </p>
                <p className="text-xs text-gray-500">
                  {scene.duration?.toFixed(1)}s
                  {scene.matchScore ? ' · 匹配度 ' + (scene.matchScore * 100).toFixed(0) + '%' : ''}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-surface-600 text-gray-400 rounded">
                {scene.transition || 'cut'}
              </span>
            </div>
          ))}
        </div>

        {(!project.scenes || project.scenes.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            暂无镜头，点击"AI 生成"来创建时间线
          </div>
        )}
      </div>
    </div>
  );
}