import { Injectable, computed, signal } from '@angular/core';

import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserState = signal<User | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserState() !== null);

  setCurrentUser(user: User | null): void {
    this.currentUserState.set(user);
  }
}
