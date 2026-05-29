import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HeroVisualComponent } from './hero-visual/hero-visual';

@Component({
  selector: 'app-home-page',
  imports: [HeroVisualComponent, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly stats = signal([
    { label: '社区帖子', value: '128' },
    { label: '活跃板块', value: '4' },
    { label: '学习成员', value: '32' },
  ]);

  protected readonly features = signal([
    {
      title: '讨论从板块开始',
      description: '按课程、项目、问答和日常主题组织内容，让用户快速进入对应场景。',
    },
    {
      title: '前后端分离改造',
      description: 'Angular 负责路由、状态和交互，Flask 后端逐步收敛为 REST API。',
    },
    {
      title: '清晰的权限边界',
      description: '普通用户参与内容，管理员处理板块、帖子、举报和用户管理。',
    },
  ]);

  protected readonly workflow = signal([
    '注册登录',
    '浏览与筛选',
    '查看详情',
    '发布编辑',
    '评论互动',
  ]);

  protected readonly highlights = signal([
    { title: 'Flask 单体如何改造成 REST API？', meta: '项目分享 · 12 条评论' },
    { title: 'Angular Service 封装接口的最佳写法', meta: 'Web开发 · 8 条评论' },
    { title: '课程报告里 API 设计怎么写更清楚？', meta: '有问有答 · 6 条评论' },
  ]);
}
