import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Film, Clock } from 'lucide-react';
import apiClient from '../api/client';

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [script, setScript] = useState('');
  const [clipStyle, setClipStyle] = useState("fast_paced");
  const [templateId, setTemplateId] = useState('');
  const [targetDuration, setTargetDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('请输入项目名称'); return; }
    if (!script.trim()) { setError('请输入解说文案'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: res } = await apiClient.post('/projects', {
        name: name.trim(),
        script: script.trim(),
        clipStyle,
        templateId: templateId || undefined,
        targetDuration: targetDuration || undefined,
      });
      navigate('/projects/' + res.id);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const styles = [
    { value: "fast_paced", label: "快节奏", desc: "快速切换，高能量感" },
    { value: "slow", label: "舒缓", desc: "慢节奏，叙事感" },
    { value: "beat_sync", label: "卡点", desc: "跟随 BGM 节拍切换" },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>
      <h1 className="text-2xl font-bold text-white mb-6">新建剪辑项目</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">项目名称</label>
          <input type="text" className="input-field" placeholder="我的第一个视频"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">剪辑风格</label>
          <div className="grid grid-cols-3 gap-3">
            {styles.map((s) => (
              <button type="button" key={s.value} onClick={() => setClipStyle(s.value)}
                className={"p-4 rounded-xl border-2 text-left transition-all " +
                  (clipStyle === s.value
                    ? 'border-neon-cyan bg-surface-700 neon-glow'
                    : 'border-gray-700 bg-surface-800 hover:border-gray-600')}>
                <Sparkles className="w-5 h-5 text-neon-cyan mb-2" />
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">解说文案</label>
          <textarea className="input-field" rows={8}
            placeholder="输入解说文案，每行一句，AI 会自动匹配镜头..."
            value={script} onChange={(e) => setScript(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">每行一句，AI 逐句匹配合适镜头</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">目标时长 (秒)</label>
            <input type="number" className="input-field" placeholder="留空由AI决定"
              value={targetDuration} onChange={(e) => setTargetDuration(parseInt(e.target.value) || 0)} min={0} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">参考模板</label>
            <select className="input-field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">不使用模板</option>
              <option value="intro-body-climax-outro">解说开场-主体-高潮-结尾</option>
              <option value="fast-paced-commentary">快节奏解说</option>
              <option value="cinematic-slow">电影感舒缓</option>
              <option value="beat-sync-montage">卡点混剪</option>
            </select>
          </div>
        </div>
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2 text-base px-6 py-3"
            disabled={loading}>
            <Sparkles className="w-5 h-5" />
            {loading ? 'AI 正在分析...' : 'AI 自动生成'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary px-6">取消</button>
        </div>
      </form>
    </div>
  );
}