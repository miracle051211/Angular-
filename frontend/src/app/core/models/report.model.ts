export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ReportItem {
  readonly id: number;
  readonly targetType: 'post' | 'comment';
  readonly targetTitle: string;
  readonly reason: string;
  readonly reporter: string;
  readonly createdAt: string;
  readonly status: ReportStatus;
}
