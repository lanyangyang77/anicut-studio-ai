import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Film, Image, Clock, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';

export function DashboardPage() {
  const [stats, setStats] = useState({ projects: 0, media: 0, renders: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/projects'),
      apiClient.get('/media'),
      apiClient.get('/render/tasks'),
    ])
      .then(([projRes, mediaRes, renderRes]) => {
        const p = projRes.data.data || [];
        const m = mediaRes.data.data || [];
        const r = renderRes.data.data || [];
        setProjects(p);
        setStats({ projects: p.length, media: m.length, renders: r.length });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { label: '新建项目', icon: Plus, to: '/projects/new', color: 'text-neon-cyan' },
    { label: '上传素材', icon: Image, to: '/media', color: 'text-neon-purple' },
    { label: '浏览模板', icon: Film, to: '/templates', color: 'text-neon-green' },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '项目', value: stats.projects, icon: Film, color: 'text-neon-cyan' },
          { label: '素材', value: stats.media, icon: Image, color: 'text-neon-purple' },
          { label: '渲染任务', value: stats.renders, icon: Clock, color: 'text-neon-green' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <stat.icon className={'w-8 h-8 ' + stat.color} />
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-white mb-3">快速开始</h2>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="card flex items-center gap-3 hover:border-gray-500 cursor-pointer"
          >
            <action.icon className={'w-5 h-5 ' + action.color} />
            <span className="text-sm font-medium text-gray-200">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <h2 className="text-lg font-semibold text-white mb-3">最近项目</h2>
      {loading ? (
        <div className="text-gray-500 text-sm">加载中...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">还没有项目</p>
          <p className="text-sm text-gray-600 mt-1">创建一个新项目开始剪辑</p>
          <Link to="/projects/new" className="btn-primary inline-block mt-4">
            新建项目
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.slice(0, 6).map((project: any) => (
            <Link
              key={project.id}
              to={'/projects/' + project.id}
              className="card hover:border-gray-500 cursor-pointer"
            >
              <h3 className="font-medium text-white mb-1 truncate">{project.name}</h3>
              <p className="text-xs text-gray-500">
                {project.scenes?.length || 0} 镜头 ·{' '}
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}