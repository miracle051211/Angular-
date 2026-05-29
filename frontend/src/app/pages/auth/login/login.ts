import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface PointerOffset {
  readonly x: number;
  readonly y: number;
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    remember: new FormControl(false, {
      nonNullable: true,
    }),
  });

  protected readonly pointer = signal<PointerOffset>({ x: 0, y: 0 });
  protected readonly showPassword = signal(false);
  protected readonly isEmailFocused = signal(false);
  protected readonly isLookingAtEachOther = signal(false);
  protected readonly isPurpleBlinking = signal(false);
  protected readonly isBlackBlinking = signal(false);
  protected readonly isPurplePeeking = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly modalMessage = signal<string | null>(null);

  protected readonly passwordLength = signal(0);
  protected readonly hasPassword = computed(() => this.passwordLength() > 0);
  protected readonly isPasswordVisible = computed(() => this.hasPassword() && this.showPassword());
  protected readonly isTypingOrPasswordHidden = computed(
    () => this.isEmailFocused() || (this.hasPassword() && !this.showPassword()),
  );

  constructor() {
    const passwordSubscription = this.form.controls.password.valueChanges.subscribe((value) => {
      this.passwordLength.set(value.length);
    });

    this.destroyRef.onDestroy(() => passwordSubscription.unsubscribe());
    this.scheduleBlink(this.isPurpleBlinking, 3000, 7000);
    this.scheduleBlink(this.isBlackBlinking, 3200, 7600);

    const peekingTimer = window.setInterval(() => {
      if (!this.isPasswordVisible()) {
        return;
      }

      this.isPurplePeeking.set(true);
      window.setTimeout(() => this.isPurplePeeking.set(false), 800);
    }, 3500);

    this.destroyRef.onDestroy(() => window.clearInterval(peekingTimer));
  }

  protected trackPointer(event: MouseEvent): void {
    const target = event.currentTarget;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    this.pointer.set({
      x: this.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      y: this.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    });
  }

  protected focusEmail(): void {
    this.isEmailFocused.set(true);
    this.isLookingAtEachOther.set(true);
    window.setTimeout(() => this.isLookingAtEachOther.set(false), 800);
  }

  protected blurEmail(): void {
    this.isEmailFocused.set(false);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected openFeatureModal(): void {
    this.modalMessage.set('学习小洞天会在这里放置登录提示、课程项目说明或测试账号信息。');
  }

  protected closeFeatureModal(): void {
    this.modalMessage.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notice.set('请先填写正确的邮箱和密码。');
      return;
    }

    this.isSubmitting.set(true);
    window.setTimeout(() => {
      this.isSubmitting.set(false);
      this.notice.set('登录接口稍后会接入 Flask 后端 API。');
    }, 450);
  }

  protected purpleHeight(): number {
    return this.isTypingOrPasswordHidden() ? 440 : 400;
  }

  protected purpleTransform(): string {
    if (this.isPasswordVisible()) {
      return 'skewX(0deg)';
    }

    if (this.isTypingOrPasswordHidden()) {
      return `skewX(${this.bodySkew() - 12}deg) translateX(40px)`;
    }

    return `skewX(${this.bodySkew()}deg)`;
  }

  protected purpleFaceLeft(): number {
    if (this.isPasswordVisible()) {
      return 20;
    }

    if (this.isLookingAtEachOther()) {
      return 55;
    }

    return 45 + this.pointer().x * 15;
  }

  protected purpleFaceTop(): number {
    if (this.isPasswordVisible()) {
      return 35;
    }

    if (this.isLookingAtEachOther()) {
      return 65;
    }

    return 40 + this.pointer().y * 10;
  }

  protected blackTransform(): string {
    if (this.isPasswordVisible()) {
      return 'skewX(0deg)';
    }

    if (this.isLookingAtEachOther()) {
      return `skewX(${this.bodySkew(1.5) + 10}deg) translateX(20px)`;
    }

    return `skewX(${this.bodySkew(this.isTypingOrPasswordHidden() ? 1.5 : 1)}deg)`;
  }

  protected blackFaceLeft(): number {
    if (this.isPasswordVisible()) {
      return 10;
    }

    if (this.isLookingAtEachOther()) {
      return 32;
    }

    return 26 + this.pointer().x * 15;
  }

  protected blackFaceTop(): number {
    if (this.isPasswordVisible()) {
      return 28;
    }

    if (this.isLookingAtEachOther()) {
      return 12;
    }

    return 32 + this.pointer().y * 10;
  }

  protected simpleBodyTransform(): string {
    return this.isPasswordVisible() ? 'skewX(0deg)' : `skewX(${this.bodySkew()}deg)`;
  }

  protected orangeFaceLeft(): number {
    return this.isPasswordVisible() ? 50 : 82 + this.pointer().x * 15;
  }

  protected orangeFaceTop(): number {
    return this.isPasswordVisible() ? 85 : 90 + this.pointer().y * 10;
  }

  protected yellowFaceLeft(): number {
    return this.isPasswordVisible() ? 20 : 52 + this.pointer().x * 15;
  }

  protected yellowFaceTop(): number {
    return this.isPasswordVisible() ? 35 : 40 + this.pointer().y * 10;
  }

  protected yellowMouthLeft(): number {
    return this.isPasswordVisible() ? 10 : 40 + this.pointer().x * 15;
  }

  protected yellowMouthTop(): number {
    return this.isPasswordVisible() ? 88 : 88 + this.pointer().y * 10;
  }

  protected purplePupilTransform(): string {
    if (this.isPasswordVisible()) {
      return this.isPurplePeeking() ? 'translate(4px, 5px)' : 'translate(-4px, -4px)';
    }

    if (this.isLookingAtEachOther()) {
      return 'translate(3px, 4px)';
    }

    return this.pupilTransform(5);
  }

  protected blackPupilTransform(): string {
    if (this.isPasswordVisible()) {
      return 'translate(-4px, -4px)';
    }

    if (this.isLookingAtEachOther()) {
      return 'translate(0, -4px)';
    }

    return this.pupilTransform(4);
  }

  protected frontPupilTransform(): string {
    return this.isPasswordVisible() ? 'translate(-5px, -4px)' : this.pupilTransform(5);
  }

  private scheduleBlink(target: { set(value: boolean): void }, minMs: number, maxMs: number): void {
    const timer = window.setTimeout(() => {
      target.set(true);
      window.setTimeout(() => {
        target.set(false);
        this.scheduleBlink(target, minMs, maxMs);
      }, 150);
    }, Math.random() * (maxMs - minMs) + minMs);

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  private bodySkew(multiplier = 1): number {
    return this.clamp(-this.pointer().x * 6 * multiplier, -9, 9);
  }

  private pupilTransform(maxDistance: number): string {
    return `translate(${this.pointer().x * maxDistance}px, ${this.pointer().y * maxDistance}px)`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
