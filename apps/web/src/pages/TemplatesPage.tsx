import { useState, useEffect } from 'react';
import { LayoutTemplate, Clock, Sparkles } from 'lucide-react';
import apiClient from '../api/client';

const builtInTemplates = [
  { id: 'intro-body-climax-outro', name: '解说开场-主体-高潮-结尾', description: '标准解说结构：开场引入、主体展开、高潮推进、结尾收束', pacing: '适中' },
  { id: 'fast-paced-commentary', name: '快节奏解说', description: '快速剪辑配合高强度解说，适合动作场面和竞技游戏', pacing: '快' },
  { id: 'cinematic-slow', name: '电影感舒缓', description: '慢节奏大气的剪辑风格，适合情感向或叙事向内容', pacing: '慢' },
  { id: 'beat-sync-montage', name: '卡点混剪', description: '跟随音乐节拍自动对齐剪切点，适合高光集锦', pacing: '卡点' },
];

export function TemplatesPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <LayoutTemplate className="w-6 h-6 text-neon-cyan" />
        <h1 className="text-2xl font-bold text-white">模板库</h1>
      </div>

      <p className="text-gray-400 mb-6">
        内置基础模板，可上传参考视频让 AI 分析其剪辑风格
      </p>

      {/* Built-in templates */}
      <h2 className="text-lg font-semibold text-white mb-3">系统内置模板</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {builtInTemplates.map((tpl) => (
          <div key={tpl.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-cyan" />
                <h3 className="font-medium text-white">{tpl.name}</h3>
              </div>
              <span className="text-xs px-2 py-0.5 bg-surface-600 text-gray-300 rounded">
                {tpl.pacing}
              </span>
            </div>
            <p className="text-sm text-gray-400">{tpl.description}</p>
          </div>
        ))}
      </div>

      {/* User templates placeholder */}
      <h2 className="text-lg font-semibold text-white mb-3">我的模板</h2>
      <div className="card text-center py-12">
        <LayoutTemplate className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">暂无自定义模板</p>
        <p className="text-sm text-gray-600 mt-1">上传参考视频，让AI分析其剪辑风格</p>
        <button className="btn-secondary mt-4" disabled>
          上传参考视频 (开发中)
        </button>
      </div>
    </div>
  );
}