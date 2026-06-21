import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-message-compose-page',
  imports: [ReactiveFormsModule],
  templateUrl: './message-compose.html',
  styleUrl: './message-compose.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposePage {
  protected readonly form = new FormGroup({
    receiver: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}
