import { Board } from '../models/board.model';
import { CommentThread } from '../models/comment.model';
import { Message } from '../models/message.model';
import { UserNotification } from '../models/notification.model';
import { PostDetail } from '../models/post.model';
import { ReportItem } from '../models/report.model';
import { User } from '../models/user.model';

export const mockUsers: readonly User[] = [
  {
    id: 'u-1',
    username: '林小满',
    email: 'lin@example.com',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=lin',
    isStaff: true,
    roleName: '管理员',
  },
  {
    id: 'u-2',
    username: '陈砚',
    email: 'chen@example.com',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=chen',
    isStaff: false,
    roleName: '社区成员',
  },
  {
    id: 'u-3',
    username: '许知行',
    email: 'xu@example.com',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=xu',
    isStaff: false,
    roleName: '课程作者',
  },
];

export const mockBoards: readonly Board[] = [
  { id: 1, name: '洞天日常', postCount: 38 },
  { id: 2, name: '有问有答', postCount: 24 },
  { id: 3, name: '项目分享', postCount: 17 },
  { id: 4, name: '课程公告', postCount: 9 },
];

export const mockPosts: readonly PostDetail[] = [
  {
    id: 1,
    title: 'Angular 前端重构计划：先把体验跑起来',
    excerpt: '把 Flask 项目的社区流程拆成可浏览、可演示的前端功能壳，再逐步替换成真实接口。',
    content:
      '这次重构先不追求一次性接完所有接口，而是先让用户能在前端看到完整路径：浏览动态、进入帖子、评论互动、查看通知、进入个人中心和后台审核。前端功能壳会保留真实字段和状态，为后续 API 对接留下清晰边界。',
    readCount: 328,
    commentCount: 3,
    createdAt: '2026-06-12 19:24',
    board: mockBoards[2],
    author: mockUsers[0],
  },
  {
    id: 2,
    title: 'Flask API 拆分思路：从模板页过渡到资源接口',
    excerpt: '原项目里的登录、帖子、评论、站内信和后台管理，都可以逐步拆到 REST 风格接口。',
    content:
      '建议先拆帖子列表、详情、评论、登录态四组接口，再处理后台表格和审核动作。这样前端可以先用 mock 数据开发，接口稳定后替换 service 层即可。',
    readCount: 216,
    commentCount: 5,
    createdAt: '2026-06-13 08:40',
    board: mockBoards[1],
    author: mockUsers[2],
  },
  {
    id: 3,
    title: '今天的首页花朵动画终于不僵硬了',
    excerpt: '入场时就开始轻微呼吸，结束后自然接入鼠标掠过的摆动反馈。',
    content:
      '花朵不应该像贴纸一样突然出现。现在它会在遮罩揭开时就轻轻晃动，视觉上更像被风带出来的植物。',
    readCount: 491,
    commentCount: 8,
    createdAt: '2026-06-16 21:18',
    board: mockBoards[0],
    author: mockUsers[1],
  },
];

export const mockComments: readonly CommentThread[] = [
  {
    id: 11,
    postId: 1,
    author: mockUsers[1],
    content: '先做功能壳很适合作业展示，老师点进去能看到完整业务闭环。',
    createdAt: '2026-06-13 10:12',
    likeCount: 12,
    replies: [
      {
        id: 111,
        author: mockUsers[0],
        content: '对，后面只要把 service 接到 Flask API 就能逐步变真。',
        createdAt: '2026-06-13 10:24',
      },
    ],
  },
  {
    id: 12,
    postId: 1,
    author: mockUsers[2],
    content: '后台审核也建议先加入口，不然看起来不像完整社区系统。',
    createdAt: '2026-06-13 11:03',
    likeCount: 7,
    replies: [],
  },
];

export const mockNotifications: readonly UserNotification[] = [
  {
    id: 1,
    kind: 'comment',
    title: '你的帖子有新评论',
    body: '陈砚回复了「Angular 前端重构计划」。',
    createdAt: '10 分钟前',
    isRead: false,
    targetUrl: '/posts/1',
  },
  {
    id: 2,
    kind: 'like',
    title: '有人赞了你的内容',
    body: '许知行觉得你的首页动画说明很有帮助。',
    createdAt: '1 小时前',
    isRead: false,
    targetUrl: '/posts/3',
  },
  {
    id: 3,
    kind: 'system',
    title: '系统维护提示',
    body: '后台管理入口已加入前端壳，接口接入后可启用真实审核。',
    createdAt: '昨天',
    isRead: true,
    targetUrl: '/admin',
  },
];

export const mockMessages: readonly Message[] = [
  {
    id: 1,
    subject: '关于接口拆分的想法',
    body: '我把 Flask 模板里的功能点按前台和后台分了一遍，建议先接帖子和评论。',
    sender: mockUsers[2],
    receiver: mockUsers[0],
    sentAt: '2026-06-15 20:18',
    isRead: false,
  },
  {
    id: 2,
    subject: '首页视觉很好，但功能入口要补齐',
    body: '现在首页很有记忆点，下一步把通知、消息、个人中心和后台都露出来会更完整。',
    sender: mockUsers[1],
    receiver: mockUsers[0],
    sentAt: '2026-06-16 09:35',
    isRead: true,
  },
];

export const mockReports: readonly ReportItem[] = [
  {
    id: 1,
    targetType: 'post',
    targetTitle: '测试帖子：重复发布内容',
    reason: '疑似刷屏',
    reporter: '陈砚',
    createdAt: '2026-06-14 15:20',
    status: 'pending',
  },
  {
    id: 2,
    targetType: 'comment',
    targetTitle: '评论 #42',
    reason: '与主题无关',
    reporter: '林小满',
    createdAt: '2026-06-13 12:08',
    status: 'resolved',
  },
];
