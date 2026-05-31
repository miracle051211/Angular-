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

interface ConfettiPiece {
  readonly style: string;
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
  private readonly timers: number[] = [];

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
  protected readonly isOrangeBlinking = signal(false);
  protected readonly isYellowBlinking = signal(false);
  protected readonly isPurplePeeking = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoginFailed = signal(false);
  protected readonly isLoginSuccess = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly modalMessage = signal<string | null>(null);
  protected readonly passwordLength = signal(0);

  protected readonly confettiPieces: ConfettiPiece[] = Array.from({ length: 72 }, (_, index) => {
    const colors = ['#ec5212', '#ffd37d', '#3658d3', '#77c6b3', '#ff8fa3', '#70a2e1'];
    const left = (index * 37) % 100;
    const delay = ((index * 13) % 80) / 100;
    const duration = 4.2 + ((index * 7) % 22) / 10;
    const width = 5 + (index % 4);
    const height = 9 + (index % 5);
    const rotate = (index * 31) % 360;

    return {
      style: `left:${left}%;background:${colors[index % colors.length]};width:${width}px;height:${height}px;animation-delay:${delay}s;animation-duration:${duration}s;transform:rotate(${rotate}deg);`,
    };
  });

  protected readonly hasPassword = computed(() => this.passwordLength() > 0);
  protected readonly isPasswordVisible = computed(() => this.hasPassword() && this.showPassword());
  protected readonly isTypingOrPasswordHidden = computed(
    () => this.isEmailFocused() || (this.hasPassword() && !this.showPassword()),
  );

  constructor() {
    const passwordSubscription = this.form.controls.password.valueChanges.subscribe((value) => {
      this.passwordLength.set(value.length);
    });

    this.destroyRef.onDestroy(() => {
      passwordSubscription.unsubscribe();
      for (const timer of this.timers) {
        window.clearTimeout(timer);
      }
    });

    this.scheduleBlink(this.isPurpleBlinking, 3000, 7000);
    this.scheduleBlink(this.isBlackBlinking, 3200, 7600);
    this.scheduleBlink(this.isOrangeBlinking, 3600, 8200);
    this.scheduleBlink(this.isYellowBlinking, 3300, 7900);

    const peekingTimer = window.setInterval(() => {
      if (!this.isPasswordVisible()) {
        return;
      }

      this.isPurplePeeking.set(true);
      this.addTimer(window.setTimeout(() => this.isPurplePeeking.set(false), 800));
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
    this.addTimer(window.setTimeout(() => this.isLookingAtEachOther.set(false), 900));
  }

  protected blurEmail(): void {
    this.isEmailFocused.set(false);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected openFeatureModal(): void {
    this.modalMessage.set(
      '学习小洞天保留课程作业所需的用户登录入口，后续可接入 Flask 后端完成真实身份校验、发帖权限和个人内容管理。',
    );
  }

  protected closeFeatureModal(): void {
    this.modalMessage.set(null);
  }

  protected submit(): void {
    this.notice.set(null);
    this.isLoginFailed.set(false);
    this.isLoginSuccess.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notice.set('请先填写正确的邮箱和不少于 6 位的密码。');
      this.flashFailure();
      return;
    }

    this.isSubmitting.set(true);
    this.addTimer(
      window.setTimeout(() => {
        this.isSubmitting.set(false);
        this.isLoginSuccess.set(true);
        this.notice.set('表单校验已通过，后续可在这里接入后端登录 API。');
        this.addTimer(window.setTimeout(() => this.isLoginSuccess.set(false), 5200));
      }, 650),
    );
  }

  protected purpleHeight(): number {
    return this.isTypingOrPasswordHidden() ? 440 : 400;
  }

  protected purpleTransform(): string {
    if (this.isPasswordVisible() || this.isLoginSuccess()) {
      return 'skewX(0deg)';
    }

    if (this.isTypingOrPasswordHidden()) {
      return `skewX(${this.bodySkew() - 12}deg) translateX(40px)`;
    }

    return `skewX(${this.bodySkew()}deg)`;
  }

  protected purpleFaceLeft(): number {
    if (this.isPasswordVisible()) {
      return 50;
    }

    if (this.isLookingAtEachOther()) {
      return 85;
    }

    return 75 + this.pointer().x * 15;
  }

  protected purpleFaceTop(): number {
    if (this.isPasswordVisible()) {
      return 20;
    }

    if (this.isLookingAtEachOther()) {
      return 50;
    }

    return 25 + this.pointer().y * 10;
  }

  protected purpleMouthLeft(): number {
    if (this.isPasswordVisible()) {
      return 72;
    }

    if (this.isLookingAtEachOther()) {
      return 106;
    }

    return 97 + this.pointer().x * 15;
  }

  protected purpleMouthTop(): number {
    if (this.isPasswordVisible()) {
      return 57;
    }

    if (this.isLookingAtEachOther()) {
      return 82;
    }

    return 57 + this.pointer().y * 10;
  }

  protected purpleMouthCounterSkew(): string {
    return this.isTypingOrPasswordHidden()
      ? `skewX(${-1 * (this.bodySkew() - 12)}deg)`
      : 'skewX(0deg)';
  }

  protected blackTransform(): string {
    if (this.isPasswordVisible() || this.isLoginSuccess()) {
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
    return this.isPasswordVisible() || this.isLoginSuccess()
      ? 'skewX(0deg)'
      : `skewX(${this.bodySkew()}deg)`;
  }

  protected orangeFaceLeft(): number {
    return this.isPasswordVisible() ? 80 : 112 + this.pointer().x * 15;
  }

  protected orangeFaceTop(): number {
    return this.isPasswordVisible() ? 55 : 60 + this.pointer().y * 10;
  }

  protected orangeMouthLeft(): number {
    return this.isPasswordVisible() ? 94 : 126 + this.pointer().x * 15;
  }

  protected orangeMouthTop(): number {
    return this.isPasswordVisible() ? 87 : 92 + this.pointer().y * 10;
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
    if (this.isLoginSuccess()) {
      return 'translate(0, 4px)';
    }

    if (this.isPasswordVisible()) {
      return this.isPurplePeeking() ? 'translate(4px, 5px)' : 'translate(-4px, -4px)';
    }

    if (this.isLookingAtEachOther()) {
      return 'translate(3px, 4px)';
    }

    return this.pupilTransform(5);
  }

  protected blackPupilTransform(): string {
    if (this.isLoginSuccess()) {
      return 'translate(0, 4px)';
    }

    if (this.isPasswordVisible()) {
      return 'translate(-4px, -4px)';
    }

    if (this.isLookingAtEachOther()) {
      return 'translate(0, -4px)';
    }

    return this.pupilTransform(4);
  }

  protected frontPupilTransform(): string {
    if (this.isLoginSuccess()) {
      return 'translate(0, 4px)';
    }

    return this.isPasswordVisible() ? 'translate(-5px, -4px)' : this.pupilTransform(5);
  }

  private flashFailure(): void {
    this.isLoginFailed.set(true);
    this.addTimer(window.setTimeout(() => this.isLoginFailed.set(false), 1800));
  }

  private scheduleBlink(target: { set(value: boolean): void }, minMs: number, maxMs: number): void {
    const timer = window.setTimeout(() => {
      target.set(true);
      this.addTimer(
        window.setTimeout(() => {
          target.set(false);
          this.scheduleBlink(target, minMs, maxMs);
        }, 150),
      );
    }, Math.random() * (maxMs - minMs) + minMs);

    this.addTimer(timer);
  }

  private addTimer(timer: number): void {
    this.timers.push(timer);
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
