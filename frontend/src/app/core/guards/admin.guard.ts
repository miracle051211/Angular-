import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.currentUser();

  if (currentUser) {
    return currentUser.isStaff ? true : router.createUrlTree(['/home']);
  }

  return authService.me().pipe(
    map((response) => {
      authService.setCurrentUser(response.data);
      return response.data.isStaff ? true : router.createUrlTree(['/home']);
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
