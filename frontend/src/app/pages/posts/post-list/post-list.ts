import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-post-list-page',
  imports: [RouterLink],
  templateUrl: './post-list.html',
  styleUrl: './post-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostListPage {
  protected readonly posts = signal([
    { id: 1, title: 'Angular 前端重构计划', board: '项目分享', comments: 3 },
    { id: 2, title: 'Flask API 接口拆分思路', board: 'Web开发', comments: 5 },
  ]);
}
