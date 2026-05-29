import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-boards-page',
  templateUrl: './boards.html',
  styleUrl: './boards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardsPage {
  protected readonly boards = signal([
    { id: 1, name: '洞天日常', description: '学习生活与日常交流' },
    { id: 2, name: '有问有答', description: '问题求助与经验解答' },
    { id: 3, name: '项目分享', description: '课程项目与作品展示' },
  ]);
}
