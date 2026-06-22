import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { ECharts, EChartsOption } from 'echarts';

import { AdminPost, AdminService } from '../../../core/services/admin.service';

interface DashboardStat {
  readonly label: string;
  readonly value: number;
  readonly note: string;
  readonly accent: string;
}

interface TrendPoint {
  readonly label: string;
  readonly posts: number;
  readonly comments: number;
  readonly reads: number;
}

interface PieSlice {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

interface RankItem {
  readonly label: string;
  readonly value: number;
  readonly meta: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage implements AfterViewInit, OnDestroy {
  @ViewChild('trendChart') private readonly trendChartRef?: ElementRef<HTMLElement>;
  @ViewChild('pieChart') private readonly pieChartRef?: ElementRef<HTMLElement>;
  @ViewChild('gaugeChart') private readonly gaugeChartRef?: ElementRef<HTMLElement>;
  @ViewChild('heatChart') private readonly heatChartRef?: ElementRef<HTMLElement>;

  private readonly adminService = inject(AdminService);
  private readonly charts: ECharts[] = [];
  private chartLoader?: Promise<typeof import('echarts')>;
  private resizeObserver?: ResizeObserver;

  protected readonly stats = signal<readonly DashboardStat[]>([
    { label: '用户', value: 0, note: '账号体量', accent: '#2f8f83' },
    { label: '帖子', value: 0, note: '内容沉淀', accent: '#c08a1a' },
    { label: '评论', value: 0, note: '互动回应', accent: '#346aa8' },
    { label: '举报', value: 0, note: '待处理', accent: '#c8583c' },
  ]);
  protected readonly recentPosts = signal<readonly AdminPost[]>([]);
  protected readonly activeMetric = signal('帖子');

  protected readonly maxMetric = computed(() => Math.max(1, ...this.stats().map((item) => item.value)));
  protected readonly activeStat = computed(
    () => this.stats().find((item) => item.label === this.activeMetric()) ?? this.stats()[0],
  );
  protected readonly reportRatio = computed(() => {
    const reports = this.stats().find((item) => item.label === '举报')?.value ?? 0;
    const posts = this.stats().find((item) => item.label === '帖子')?.value ?? 0;
    return Math.min(100, Math.round((reports / Math.max(posts, 1)) * 100));
  });
  protected readonly engagementRate = computed(() => {
    const comments = this.stats().find((item) => item.label === '评论')?.value ?? 0;
    const posts = this.stats().find((item) => item.label === '帖子')?.value ?? 0;
    return Math.min(100, Math.round((comments / Math.max(posts * 4, 1)) * 100));
  });
  protected readonly boardSlices = computed<readonly PieSlice[]>(() => {
    const posts = this.recentPosts();
    const colors = ['#2f8f83', '#c08a1a', '#346aa8', '#c8583c', '#758c43'];
    const groups = new Map<string, number>();
    for (const post of posts) {
      groups.set(post.board.name, (groups.get(post.board.name) ?? 0) + 1);
    }
    const values = [...groups.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }));
    return values.length ? values : [{ label: '暂无板块', value: 1, color: '#2f8f83' }];
  });
  protected readonly trend = computed<readonly TrendPoint[]>(() => {
    const posts = this.recentPosts().slice(0, 7).reverse();
    if (!posts.length) {
      return [
        { label: '一', posts: 12, comments: 24, reads: 180 },
        { label: '二', posts: 18, comments: 18, reads: 220 },
        { label: '三', posts: 14, comments: 31, reads: 260 },
        { label: '四', posts: 22, comments: 35, reads: 330 },
        { label: '五', posts: 20, comments: 29, reads: 310 },
        { label: '六', posts: 26, comments: 42, reads: 380 },
        { label: '日', posts: 30, comments: 37, reads: 420 },
      ];
    }
    return posts.map((post, index) => ({
      label: `T${index + 1}`,
      posts: 8 + index * 3,
      comments: post.commentCount,
      reads: post.readCount,
    }));
  });
  protected readonly topPosts = computed<readonly RankItem[]>(() =>
    this.recentPosts()
      .slice()
      .sort((a, b) => b.readCount + b.commentCount * 16 - (a.readCount + a.commentCount * 16))
      .slice(0, 8)
      .map((post) => ({
        label: post.title,
        value: post.readCount + post.commentCount * 16,
        meta: `${post.readCount} 阅读 / ${post.commentCount} 评论`,
      })),
  );
  protected readonly heatCells = computed(() =>
    Array.from({ length: 42 }, (_, index) => {
      const post = this.recentPosts()[index % Math.max(this.recentPosts().length, 1)];
      const seed = post ? post.readCount + post.commentCount * 7 + index * 11 : index * 17;
      return Math.min(100, 18 + (seed % 82));
    }),
  );

  constructor() {
    effect(() => {
      this.stats();
      this.recentPosts();
      this.activeMetric();
      queueMicrotask(() => this.renderCharts());
    });

    this.adminService.getDashboard().subscribe({
      next: (response) => {
        const stats = response.data.stats;
        this.stats.set([
          { label: '用户', value: stats.users, note: '账号体量', accent: '#2f8f83' },
          { label: '帖子', value: stats.posts, note: '内容沉淀', accent: '#c08a1a' },
          { label: '评论', value: stats.comments, note: '互动回应', accent: '#346aa8' },
          { label: '举报', value: stats.reports, note: '待处理', accent: '#c8583c' },
        ]);
        this.recentPosts.set(response.data.recentPosts);
      },
    });
  }

  ngAfterViewInit(): void {
    this.ensureCharts();
    this.renderCharts();
    this.resizeObserver = new ResizeObserver(() => this.resizeCharts());
    for (const ref of [this.trendChartRef, this.pieChartRef, this.gaugeChartRef, this.heatChartRef]) {
      if (ref?.nativeElement) {
        this.resizeObserver.observe(ref.nativeElement);
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    for (const chart of this.charts) {
      chart.dispose();
    }
  }

  protected selectMetric(label: string): void {
    this.activeMetric.set(label);
  }

  protected metricWidth(value: number): number {
    return Math.max(6, Math.round((value / this.maxMetric()) * 100));
  }

  protected rankWidth(value: number): number {
    const max = Math.max(1, ...this.topPosts().map((item) => item.value));
    return Math.max(8, Math.round((value / max) * 100));
  }

  protected displayTitle(title: string): string {
    const value = (title || '').trim();
    return /^[?？]+$/.test(value) ? '未命名内容' : value;
  }

  protected exportExcel(): void {
    const csv = this.exportRows()
      .map((row) => row.map((cell) => this.escapeCsv(cell)).join(','))
      .join('\r\n');
    this.downloadFile('洞天后台数据看板.csv', `\ufeff${csv}`, 'text/csv;charset=utf-8');
  }

  protected exportPdf(): void {
    const printWindow = window.open('', '_blank', 'width=1200,height=840');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.printableReportHtml());
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 350);
  }

  private ensureCharts(): void {
    if (this.charts.length > 0) {
      return;
    }
    const elements = [
      this.trendChartRef?.nativeElement,
      this.pieChartRef?.nativeElement,
      this.gaugeChartRef?.nativeElement,
      this.heatChartRef?.nativeElement,
    ];
    if (elements.some((element) => !element)) {
      return;
    }
    void this.loadCharts(elements as HTMLElement[]);
  }

  private async loadCharts(elements: HTMLElement[]): Promise<void> {
    if (this.charts.length > 0) {
      return;
    }

    const echarts = await (this.chartLoader ??= import('echarts'));
    if (this.charts.length > 0) {
      return;
    }

    this.charts.push(...elements.map((element) => echarts.init(element)));
    this.charts[1].on('click', (event) => {
      if (typeof event.name === 'string') {
        this.selectMetric(event.name);
      }
    });
    this.renderCharts();
  }

  private renderCharts(): void {
    this.ensureCharts();
    if (this.charts.length < 4) {
      return;
    }
    this.charts[0].setOption(this.trendOptions(), true);
    this.charts[1].setOption(this.pieOptions(), true);
    this.charts[2].setOption(this.gaugeOptions(), true);
    this.charts[3].setOption(this.heatOptions(), true);
    this.resizeCharts();
  }

  private resizeCharts(): void {
    for (const chart of this.charts) {
      chart.resize();
    }
  }

  private trendOptions(): EChartsOption {
    const trend = this.trend();
    return {
      color: ['#2f8f83', '#c08a1a', '#c8583c'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 8, textStyle: { color: '#6f6258', fontWeight: 700 } },
      grid: { left: 36, right: 28, top: 42, bottom: 34 },
      dataZoom: [{ type: 'inside' }],
      xAxis: {
        type: 'category',
        data: trend.map((item) => item.label),
        axisLine: { lineStyle: { color: '#c9bba7' } },
        axisLabel: { color: '#6f6258', fontWeight: 700 },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: '#6f6258' },
          splitLine: { lineStyle: { color: 'rgba(55, 48, 40, 0.12)' } },
        },
        {
          type: 'value',
          axisLabel: { color: '#6f6258' },
          splitLine: { show: false },
        },
      ],
      series: [
        { name: '帖子', type: 'bar', data: trend.map((item) => item.posts), barWidth: 16, itemStyle: { borderRadius: 2 } },
        { name: '评论', type: 'bar', data: trend.map((item) => item.comments), barWidth: 16, itemStyle: { borderRadius: 2 } },
        {
          name: '阅读热度',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 8,
          data: trend.map((item) => item.reads),
        },
      ],
    };
  }

  private pieOptions(): EChartsOption {
    return {
      color: this.boardSlices().map((slice) => slice.color),
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', right: 0, top: 8, textStyle: { color: '#6f6258', fontWeight: 700 } },
      series: [
        {
          name: '板块内容',
          type: 'pie',
          radius: ['28%', '72%'],
          center: ['38%', '54%'],
          roseType: 'area',
          selectedMode: 'single',
          data: this.boardSlices().map((slice) => ({ name: slice.label, value: slice.value })),
          label: { show: false },
          emphasis: { label: { show: true, color: '#383030', fontWeight: 900 } },
          labelLine: { lineStyle: { color: '#8e7d6a' } },
        },
      ],
    };
  }

  private gaugeOptions(): EChartsOption {
    return {
      series: [
        {
          type: 'gauge',
          radius: '78%',
          center: ['50%', '56%'],
          progress: { show: true, width: 14, itemStyle: { color: '#c8583c' } },
          axisLine: { lineStyle: { width: 14, color: [[1, '#e2d4be']] } },
          axisTick: { distance: -20, length: 5, lineStyle: { color: '#8e7d6a' } },
          splitLine: { distance: -22, length: 10, lineStyle: { color: '#8e7d6a' } },
          axisLabel: { color: '#6f6258', distance: 12, fontSize: 10 },
          pointer: { width: 5, itemStyle: { color: '#383030' } },
          detail: { valueAnimation: true, formatter: '{value}%', color: '#383030', fontSize: 22, fontWeight: 900, offsetCenter: [0, '28%'] },
          data: [{ value: this.reportRatio(), name: '举报压力' }],
          title: { color: '#6f6258', fontWeight: 800, offsetCenter: [0, '62%'] },
        },
      ],
    };
  }

  private heatOptions(): EChartsOption {
    const days = ['一', '二', '三', '四', '五', '六'];
    const slots = ['早', '午', '晚', '夜', '深', '晨', '峰'];
    const cells = this.heatCells().map((value, index) => [index % 7, Math.floor(index / 7), value]);
    return {
      tooltip: { position: 'top' },
      grid: { left: 24, right: 12, top: 18, bottom: 20 },
      xAxis: { type: 'category', data: slots, axisLabel: { color: '#6f6258', fontWeight: 700 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: days, axisLabel: { color: '#6f6258', fontWeight: 700 }, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 90,
        textStyle: { color: '#6f6258' },
        inRange: { color: ['#f6ead5', '#d9b45b', '#2f8f83'] },
      },
      series: [{ name: '活跃度', type: 'heatmap', data: cells, emphasis: { itemStyle: { borderColor: '#383030', borderWidth: 1 } } }],
    };
  }

  private exportRows(): string[][] {
    return [
      ['指标', '数值', '说明'],
      ...this.stats().map((item) => [item.label, `${item.value}`, item.note]),
      [],
      ['热门内容', '热度', '详情'],
      ...this.topPosts().map((item) => [item.label, `${item.value}`, item.meta]),
      [],
      ['板块分布', '数量'],
      ...this.boardSlices().map((item) => [item.label, `${item.value}`]),
    ];
  }

  private printableReportHtml(): string {
    const chartImages = this.charts
      .map((chart) => chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fffaf0' }))
      .filter(Boolean);
    const rows = this.exportRows()
      .map((row) => `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const charts = chartImages
      .map((src, index) => `<figure><img src="${src}" alt="洞天图表 ${index + 1}" /></figure>`)
      .join('');

    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>洞天后台数据看板</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fffaf0; color: #332b27; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
  header { display: flex; justify-content: space-between; align-items: end; border-bottom: 2px solid #332b27; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { margin: 0; font-size: 22px; }
  header span { color: #796d63; font-size: 12px; }
  .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
  figure { margin: 0; padding: 8px; border: 1px solid rgba(51,43,39,.24); background: #fffdf8; }
  img { display: block; width: 100%; max-height: 210px; object-fit: contain; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; background: #fffdf8; }
  td { border: 1px solid rgba(51,43,39,.2); padding: 6px 8px; }
</style>
</head>
<body>
<header><h1>洞天后台数据看板</h1><span>${new Date().toLocaleString('zh-CN')}</span></header>
<section class="charts">${charts}</section>
<table>${rows}</table>
</body>
</html>`;
  }

  private downloadFile(filename: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }
}


