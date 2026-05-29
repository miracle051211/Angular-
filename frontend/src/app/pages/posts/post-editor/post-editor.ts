import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-post-editor-page',
  imports: [ReactiveFormsModule],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostEditorPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly postId = this.route.snapshot.paramMap.get('id');
  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    boardId: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });
}
