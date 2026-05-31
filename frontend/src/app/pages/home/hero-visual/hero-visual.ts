import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  afterNextRender,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';

@Component({
  selector: 'app-hero-visual',
  templateUrl: './hero-visual.html',
  styleUrl: './hero-visual.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroVisualComponent {
  @ViewChild('stage') private readonly stage?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  constructor() {
    afterNextRender(() => {
      this.setupIntroAssembly();
      this.setupPointerDrift();
      this.setupLetterGsapInteractions();
    });
  }

  private setupIntroAssembly(): void {
    const stage = this.stage?.nativeElement;

    if (!stage) {
      return;
    }

    const word = stage.querySelector<HTMLElement>('.hero-word');
    const renderPath = stage.querySelector<SVGPathElement>('.hero-render-path');
    const renderEdge = stage.querySelector<SVGPathElement>('.hero-render-edge');
    const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant'));
    const stems = Array.from(stage.querySelectorAll<SVGSVGElement>('.plant-stem'));
    const pieces = Array.from(stage.querySelectorAll<SVGGElement>('.letter-piece'));
    const baselineY = 768;
    const hiddenY = 1130;
    const pathPoints = {
      y1: hiddenY,
      y2: hiddenY,
      y3: hiddenY,
    };
    const setRenderPath = () => {
      const edgeD = `M0 ${pathPoints.y1.toFixed(2)} Q 960 ${pathPoints.y2.toFixed(2)} 1920 ${pathPoints.y3.toFixed(2)}`;
      renderEdge?.setAttribute('d', edgeD);
      renderPath?.setAttribute('d', `${edgeD} L1920 1080 L0 1080 Z`);
    };
    const setFinalRenderPath = () => {
      pathPoints.y1 = baselineY;
      pathPoints.y2 = baselineY;
      pathPoints.y3 = baselineY;
      setRenderPath();
    };

    stage.style.setProperty('--intro-motion', '0');
    setRenderPath();

    if (!word || !renderPath || !renderEdge || plants.length === 0) {
      stage.classList.add('is-intro-done');
      stage.style.setProperty('--intro-motion', '1');
      setFinalRenderPath();
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.classList.add('is-intro-done');
      stage.style.setProperty('--intro-motion', '1');
      setFinalRenderPath();
      renderEdge?.style.setProperty('opacity', '0.68');
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      stage.classList.add('is-intro-running');
      stage.classList.remove('is-intro-done');

      const setPieceStart = (selector: string, vars: Record<string, number | string>) => {
        const piece = stage.querySelector<SVGGElement>(selector);

        if (piece) {
          gsap.set(piece, vars);
        }
      };
      const placePiece = (
        timeline: gsap.core.Timeline,
        selector: string,
        at: number,
        duration = 0.72,
        ease = 'elastic.out(1, 0.42)',
      ) => {
        const piece = stage.querySelector<SVGGElement>(selector);

        if (!piece) {
          return;
        }

        timeline.to(
          piece,
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            duration,
            ease,
            overwrite: 'auto',
          },
          at,
        );
      };

      gsap.killTweensOf([word, renderPath, renderEdge, ...plants, ...stems, ...pieces]);
      gsap.set(word, {
        clipPath: 'inset(100% -100vw 0)',
        y: 0,
      });
      gsap.set(plants, {
        opacity: 1,
        rotation: 0,
        scale: 1,
        transformOrigin: '50% 100%',
      });
      gsap.set(stems, {
        opacity: 1,
        xPercent: -50,
        scaleY: 0.03,
        transformOrigin: '50% 100%',
      });
      gsap.set(pieces, {
        opacity: 1,
        x: 0,
        y: 16,
        rotation: 0,
        scale: 0.86,
        transformOrigin: '50% 60%',
      });

      setPieceStart('.piece-m-sun', {
        y: 22,
        scaleX: 0.68,
        scaleY: 0.58,
        transformOrigin: '50% 100%',
      });
      setPieceStart('.piece-m-left', {
        x: -13,
        y: 18,
        rotation: -78,
        scale: 0.95,
        transformOrigin: '78% 100%',
      });
      setPieceStart('.piece-m-right', {
        x: 13,
        y: 18,
        rotation: 78,
        scale: 0.95,
        transformOrigin: '22% 100%',
      });
      setPieceStart('.piece-m-v', {
        y: 14,
        rotation: -18,
        scaleX: 0.72,
        scaleY: 0.86,
        transformOrigin: '50% 86%',
      });
      setPieceStart('.piece-i-body', { y: 28, scaleY: 0.46, transformOrigin: '50% 100%' });
      setPieceStart('.piece-i-cap', {
        y: 12,
        rotation: 8,
        scaleX: 0.72,
        transformOrigin: '50% 50%',
      });
      setPieceStart('.piece-i-glass', { y: 14, scaleX: 0.62, transformOrigin: '50% 50%' });
      setPieceStart('.piece-r-stem', { y: 26, scaleY: 0.48, transformOrigin: '50% 100%' });
      setPieceStart('.piece-r-leg', {
        x: 13,
        y: 9,
        rotation: -54,
        scale: 0.92,
        transformOrigin: '28% 24%',
      });
      setPieceStart('.piece-r-bowl', {
        x: 3,
        y: 12,
        rotation: 5,
        scaleX: 0.86,
        scaleY: 0.9,
        transformOrigin: '0% 62%',
      });
      setPieceStart('.piece-a-triangle', {
        y: 24,
        rotation: -5,
        scaleX: 0.78,
        scaleY: 0.82,
        transformOrigin: '50% 100%',
      });
      setPieceStart('.piece-a-cut', { y: 12, scale: 0.34, transformOrigin: '50% 78%' });
      setPieceStart('.piece-c-core', { y: 10, scale: 0.24, transformOrigin: '50% 50%' });
      setPieceStart('.piece-c-ring', {
        x: -2,
        y: 8,
        rotation: -220,
        scale: 0.82,
        transformOrigin: '50% 50%',
      });
      setPieceStart('.piece-l-stem', {
        x: -8,
        y: 18,
        rotation: -74,
        scaleY: 0.9,
        transformOrigin: '44% 100%',
      });
      setPieceStart('.piece-l-foot', { x: 16, y: 8, scaleX: 0.42, transformOrigin: '10% 50%' });
      setPieceStart('.piece-e-curve', {
        x: -8,
        y: 16,
        rotation: -7,
        scale: 0.86,
        transformOrigin: '54% 54%',
      });
      setPieceStart('.piece-e-top', { x: 18, y: 5, scaleX: 0.16, transformOrigin: '0% 50%' });
      setPieceStart('.piece-e-mid', { x: 16, y: 7, scaleX: 0.16, transformOrigin: '0% 50%' });
      setPieceStart('.piece-e-bottom', { x: 14, y: 9, scaleX: 0.16, transformOrigin: '0% 50%' });

      const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onUpdate: setRenderPath,
        onComplete: () => {
          stage.classList.add('is-intro-done');
          stage.classList.remove('is-intro-running');
          stage.style.setProperty('--intro-motion', '1');
          setFinalRenderPath();
          renderEdge?.style.setProperty('opacity', '0.68');
          gsap.set(word, { clearProps: 'transform,clipPath' });
          gsap.set(plants, { clearProps: 'transform,opacity' });
          gsap.set(stems, { clearProps: 'transform,opacity' });
          gsap.set(pieces, { clearProps: 'transform,opacity' });
          window.dispatchEvent(new Event('resize'));
        },
      });

      timeline.to(renderEdge, { opacity: 0.72, duration: 0.2, ease: 'power2.out' }, 0.08);
      timeline.to(
        pathPoints,
        { y1: baselineY, y3: baselineY, duration: 0.68, ease: 'power3.out' },
        0.04,
      );
      timeline.to(pathPoints, { y2: 608, duration: 0.68, ease: 'power3.out' }, 0.04);
      timeline.to(
        word,
        { clipPath: 'inset(-100vh -100vw 0)', duration: 0.82, ease: 'power3.out' },
        0.12,
      );
      timeline.to(
        pathPoints,
        { y2: baselineY, duration: 1.62, ease: 'elastic.out(1.08, 0.34)' },
        0.72,
      );

      const plantTimes = [0.36, 0.43, 0.51, 0.58, 0.66, 0.74, 0.82];

      plants.forEach((plant, index) => {
        const at = plantTimes[index] ?? 0.58 + index * 0.1;
        const stem = plant.querySelector<SVGSVGElement>('.plant-stem');
        const stemHeight = stem ? Number.parseFloat(getComputedStyle(stem).height) || 220 : 220;
        const introLift = Math.max(116, stemHeight * 0.94);

        plant.style.setProperty('--intro-lift', `${introLift.toFixed(2)}px`);

        if (stem) {
          timeline.to(stem, { scaleY: 1, duration: 1.34, ease: 'power3.out' }, at);
        }

        timeline.to(
          plant,
          { '--intro-lift': '0px', duration: 1.34, ease: 'power3.out' },
          at,
        );
      });

      placePiece(timeline, '.piece-m-sun', 0.46, 0.76);
      placePiece(timeline, '.piece-m-left', 0.58, 0.92);
      placePiece(timeline, '.piece-m-right', 0.62, 0.92);
      placePiece(timeline, '.piece-m-v', 0.78, 0.74);
      placePiece(timeline, '.piece-i-body', 0.58, 0.76);
      placePiece(timeline, '.piece-i-glass', 0.76, 0.58, 'back.out(1.6)');
      placePiece(timeline, '.piece-i-cap', 0.88, 0.58);
      placePiece(timeline, '.piece-r-stem', 0.66, 0.76);
      placePiece(timeline, '.piece-r-leg', 0.82, 0.86);
      placePiece(timeline, '.piece-r-bowl', 1.0, 0.82, 'elastic.out(0.9, 0.42)');
      placePiece(timeline, '.piece-a-triangle', 0.78, 0.88);
      placePiece(timeline, '.piece-a-cut', 1.0, 0.6, 'back.out(1.5)');
      placePiece(timeline, '.piece-c-core', 0.96, 0.62, 'back.out(1.6)');
      placePiece(timeline, '.piece-c-ring', 1.0, 1.0, 'power3.out');
      placePiece(timeline, '.piece-l-foot', 1.04, 0.58, 'back.out(1.55)');
      placePiece(timeline, '.piece-l-stem', 1.12, 0.84);
      placePiece(timeline, '.piece-e-curve', 1.18, 0.72);
      placePiece(timeline, '.piece-e-top', 1.32, 0.54, 'back.out(1.55)');
      placePiece(timeline, '.piece-e-mid', 1.4, 0.54, 'back.out(1.55)');
      placePiece(timeline, '.piece-e-bottom', 1.48, 0.54, 'back.out(1.55)');
      timeline.call(() => stage.style.setProperty('--intro-motion', '1'), undefined, 2.42);

      this.destroyRef.onDestroy(() => {
        timeline.kill();
      });
    });
  }

  private setupPointerDrift(): void {
    const stage = this.stage?.nativeElement;

    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      let frame = 0;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let pointerX = -10000;
      let pointerY = -10000;
      let previousPointerX = -10000;
      let previousPointerY = -10000;
      let smoothPointerX = -10000;
      let smoothPointerY = -10000;
      let lastPointerX = -10000;
      let lastPointerY = -10000;
      let rawSpeed = 0;
      let smoothedSpeed = 0;
      let pointerVectorX = 0;
      let pointerVectorY = 0;
      let hasPointerMoved = false;
      let lastPointerMoveAt = 0;
      let lastRawPointerX = 0;
      let lastRawPointerY = 0;
      let introMotion = Number.parseFloat(stage.style.getPropertyValue('--intro-motion')) || 0;
      const motionProfiles = [
        { phase: 0.1, frequency: 0.84, amplitude: 1, reach: 1.05, response: 1 },
        { phase: 3.45, frequency: 1.06, amplitude: 0.72, reach: 0.9, response: 0.9 },
        { phase: 5.15, frequency: 0.92, amplitude: 0.88, reach: 0.96, response: 1.06 },
        { phase: 1.72, frequency: 1.16, amplitude: 0.8, reach: 1.02, response: 1.02 },
        { phase: 4.38, frequency: 0.76, amplitude: 0.82, reach: 0.82, response: 0.94 },
        { phase: 2.36, frequency: 1.12, amplitude: 0.74, reach: 0.78, response: 0.92 },
        { phase: 5.92, frequency: 0.8, amplitude: 0.95, reach: 0.98, response: 1.04 },
      ];
      const distanceToSegment = (
        pointX: number,
        pointY: number,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
      ) => {
        const segmentX = endX - startX;
        const segmentY = endY - startY;
        const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

        if (segmentLengthSquared === 0) {
          return Math.hypot(pointX - endX, pointY - endY);
        }

        const progress = Math.max(
          0,
          Math.min(
            1,
            ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSquared,
          ),
        );
        const closestX = startX + segmentX * progress;
        const closestY = startY + segmentY * progress;

        return Math.hypot(pointX - closestX, pointY - closestY);
      };
      const distanceToRect = (
        pointX: number,
        pointY: number,
        left: number,
        top: number,
        right: number,
        bottom: number,
      ) => {
        const dx = Math.max(left - pointX, 0, pointX - right);
        const dy = Math.max(top - pointY, 0, pointY - bottom);

        return Math.hypot(dx, dy);
      };
      const segmentIntersectsRect = (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        left: number,
        top: number,
        right: number,
        bottom: number,
      ) => {
        const startInside = startX >= left && startX <= right && startY >= top && startY <= bottom;
        const endInside = endX >= left && endX <= right && endY >= top && endY <= bottom;

        if (startInside || endInside) {
          return true;
        }

        let t0 = 0;
        let t1 = 1;
        const dx = endX - startX;
        const dy = endY - startY;
        const clip = (p: number, q: number) => {
          if (p === 0) {
            return q >= 0;
          }

          const t = q / p;

          if (p < 0) {
            if (t > t1) {
              return false;
            }

            if (t > t0) {
              t0 = t;
            }
          } else {
            if (t < t0) {
              return false;
            }

            if (t < t1) {
              t1 = t;
            }
          }

          return true;
        };

        return (
          clip(-dx, startX - left) &&
          clip(dx, right - startX) &&
          clip(-dy, startY - top) &&
          clip(dy, bottom - startY)
        );
      };
      const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant')).map(
        (element, index) => {
          const profile = motionProfiles[index % motionProfiles.length];
          const stem = element.querySelector<SVGSVGElement>('.plant-stem');
          const viewBox = stem?.getAttribute('viewBox')?.split(' ').map(Number) ?? [0, 0, 90, 260];
          const stemViewWidth = viewBox[2] || 90;
          const stemViewHeight = viewBox[3] || 260;

          return {
            element,
            letter: element.querySelector<HTMLElement>('.letter'),
            stem,
            stemPath: element.querySelector<SVGPathElement>('.plant-stem path'),
            stemViewWidth,
            stemViewHeight,
            phase: profile.phase,
            frequency: profile.frequency,
            amplitude: stemViewHeight * 0.055 * profile.amplitude,
            reachScale: profile.reach,
            response: profile.response,
            stemWidth: 90,
            stemCssHeight: stemViewHeight,
            topX: 0,
            topY: 0,
            letterLeft: 0,
            letterTop: 0,
            letterRight: 0,
            letterBottom: 0,
            letterCenterX: 0,
            letterCenterY: 0,
            reachWidth: 140,
            tipX: 0,
            tipY: 0,
            velocityX: 0,
            velocityY: 0,
            mousePushX: 0,
            mousePushVelocity: 0,
            sideX: 0,
            swayEnergy: 0,
            visualAngle: 0,
            visualVelocity: 0,
          };
        },
      );

      const updateMeasurements = () => {
        for (const plant of plants) {
          const letterRect =
            plant.letter?.getBoundingClientRect() ?? plant.element.getBoundingClientRect();
          const stemRect = plant.stem?.getBoundingClientRect();
          const stemWidth = stemRect?.width || 90;
          const stemHeight = stemRect?.height || plant.stemViewHeight;

          plant.stemWidth = stemWidth;
          plant.stemCssHeight = stemHeight;
          plant.topX = stemRect
            ? stemRect.left + stemWidth / 2
            : letterRect.left + letterRect.width / 2;
          plant.topY = stemRect
            ? stemRect.top + (24 / plant.stemViewHeight) * stemHeight
            : letterRect.bottom;
          plant.letterLeft = letterRect.left;
          plant.letterTop = letterRect.top;
          plant.letterRight = letterRect.right;
          plant.letterBottom = letterRect.bottom;
          plant.letterCenterX = letterRect.left + letterRect.width / 2;
          plant.letterCenterY = letterRect.top + letterRect.height * 0.54;
          plant.reachWidth = letterRect.width;
        }
      };

      const draw = () => {
        const now = performance.now();
        const introTarget = Number.parseFloat(stage.style.getPropertyValue('--intro-motion')) || 0;
        introMotion += (introTarget - introMotion) * 0.12;
        const pointerAge = hasPointerMoved ? now - lastPointerMoveAt : Number.POSITIVE_INFINITY;
        const motionPresence = hasPointerMoved
          ? Math.max(0, Math.min(1, 1 - Math.max(0, pointerAge - 90) / 300)) * introMotion
          : 0;

        currentX += (targetX - currentX) * 0.075;
        currentY += (targetY - currentY) * 0.075;

        stage.style.setProperty('--drift-x', currentX.toFixed(3));
        stage.style.setProperty('--drift-y', currentY.toFixed(3));
        smoothPointerX += (pointerX - smoothPointerX) * 0.1;
        smoothPointerY += (pointerY - smoothPointerY) * 0.1;

        const smoothDeltaX = smoothPointerX - lastPointerX;
        const smoothDeltaY = smoothPointerY - lastPointerY;
        const smoothDistance = Math.hypot(smoothDeltaX, smoothDeltaY);
        const immediateSpeed = Math.min(120, Math.max(rawSpeed * 0.9, smoothDistance * 1.2));

        smoothedSpeed += (immediateSpeed - smoothedSpeed) * 0.14;
        rawSpeed *= 0.66;

        if (smoothDistance > 0.08) {
          pointerVectorX += (smoothDeltaX / smoothDistance - pointerVectorX) * 0.075;
          pointerVectorY += (smoothDeltaY / smoothDistance - pointerVectorY) * 0.075;
        }

        lastPointerX = smoothPointerX;
        lastPointerY = smoothPointerY;

        for (const plant of plants) {
          const influencePointerX = hasPointerMoved ? smoothPointerX : pointerX;
          const influencePointerY = hasPointerMoved ? smoothPointerY : pointerY;
          const distanceX = influencePointerX - plant.topX;
          const distanceY = influencePointerY - plant.topY;
          const distance = Math.hypot(distanceX, distanceY);
          const reach = Math.max(112, plant.reachWidth * plant.reachScale * 0.7);
          const hitPaddingX = Math.max(18, Math.min(34, plant.reachWidth * 0.13));
          const hitPaddingY = Math.max(20, Math.min(42, plant.stemCssHeight * 0.18));
          const hitLeft = plant.letterLeft - hitPaddingX;
          const hitTop = plant.letterTop - hitPaddingY;
          const hitRight = plant.letterRight + hitPaddingX;
          const hitBottom = plant.letterBottom + hitPaddingY;
          const sweepDistance = hasPointerMoved
            ? distanceToSegment(
                plant.topX,
                plant.topY,
                previousPointerX,
                previousPointerY,
                pointerX,
                pointerY,
              )
            : Number.POSITIVE_INFINITY;
          const letterSweepDistance = hasPointerMoved
            ? distanceToSegment(
                plant.letterCenterX,
                plant.letterCenterY,
                previousPointerX,
                previousPointerY,
                pointerX,
                pointerY,
              )
            : Number.POSITIVE_INFINITY;
          const rectDistance = hasPointerMoved
            ? Math.min(
                distanceToRect(pointerX, pointerY, hitLeft, hitTop, hitRight, hitBottom),
                distanceToRect(
                  smoothPointerX,
                  smoothPointerY,
                  hitLeft,
                  hitTop,
                  hitRight,
                  hitBottom,
                ),
              )
            : Number.POSITIVE_INFINITY;
          const sweepHit = hasPointerMoved
            ? segmentIntersectsRect(
                previousPointerX,
                previousPointerY,
                pointerX,
                pointerY,
                hitLeft,
                hitTop,
                hitRight,
                hitBottom,
              )
            : false;
          const sweepReach = Math.max(74, Math.min(138, reach * 0.82));
          const tipProximity = hasPointerMoved ? Math.max(0, 1 - distance / reach) : 0;
          const shapeProximity = hasPointerMoved ? Math.max(0, 1 - rectDistance / 76) : 0;
          const sweepProximity = hasPointerMoved
            ? Math.max(
                sweepHit ? 0.56 : 0,
                Math.max(0, 1 - sweepDistance / sweepReach) * 0.62,
                Math.max(0, 1 - letterSweepDistance / (plant.reachWidth * 0.5 + 44)) * 0.82,
              ) * Math.min(0.86, 0.26 + immediateSpeed / 96)
            : 0;
          const proximity = Math.max(tipProximity, shapeProximity, sweepProximity) * motionPresence;
          const softProximity =
            proximity * proximity * proximity * (10 - 15 * proximity + 6 * proximity * proximity);
          const mouseActive = softProximity > 0.035;
          const stemBottom = plant.stemViewHeight - 2;
          const maxOffset = Math.min(plant.stemViewHeight * 0.34, 72);
          const windTarget =
            (Math.sin(now * 0.001 * plant.frequency + plant.phase) * plant.amplitude +
              Math.sin(now * 0.001 * plant.frequency * 0.43 + plant.phase * 1.72) *
                plant.amplitude *
                0.42 +
              Math.sin(now * 0.001 * plant.frequency * 0.21 + plant.phase * 2.31) *
                plant.amplitude *
                0.22) *
            (1 + plant.swayEnergy * 0.48) *
            introMotion;
          const letterDistanceX = influencePointerX - plant.letterCenterX;
          const letterDistanceY = influencePointerY - plant.letterCenterY;
          const letterDistance = Math.hypot(letterDistanceX, letterDistanceY);
          const hoverSideX = letterDistance === 0 ? 0 : -letterDistanceX / letterDistance;
          const sweepSideX = Math.abs(pointerVectorX) > 0.08 ? pointerVectorX : hoverSideX;
          const rawSideX =
            sweepProximity > Math.max(tipProximity, shapeProximity) ? sweepSideX : hoverSideX;
          const sideEase = mouseActive ? 0.082 : 0.028;

          plant.sideX += (rawSideX * softProximity - plant.sideX) * sideEase;

          const localPointerSpeed = mouseActive ? smoothedSpeed * motionPresence : 0;
          const localPointerDeltaX = mouseActive ? smoothDeltaX * motionPresence : 0;
          const sweepKick =
            sweepProximity * sweepSideX * Math.min(maxOffset * 0.28, 6 + immediateSpeed * 0.16);
          const vectorPush = pointerVectorX * localPointerSpeed * 0.14;
          const brushPush =
            localPointerDeltaX * 0.32 +
            vectorPush +
            sweepKick +
            plant.sideX * localPointerSpeed * 0.08;
          const hoverPush =
            plant.sideX * Math.min(plant.stemViewHeight * 0.14, 28) * motionPresence;
          const unclampedMousePush = mouseActive ? (brushPush + hoverPush) * plant.response : 0;
          const rawMousePush = Math.max(
            -maxOffset * 0.8,
            Math.min(maxOffset * 0.8, unclampedMousePush),
          );

          plant.swayEnergy = mouseActive
            ? Math.min(
                0.58,
                plant.swayEnergy + softProximity * (0.01 + localPointerSpeed * 0.00034),
              )
            : plant.swayEnergy * 0.925;
          plant.mousePushVelocity +=
            (rawMousePush - plant.mousePushX) * (mouseActive ? 0.082 : 0.043);
          plant.mousePushVelocity *= mouseActive ? 0.78 : 0.85;
          plant.mousePushX += plant.mousePushVelocity;
          const targetTipX = Math.max(
            -maxOffset,
            Math.min(maxOffset, windTarget + plant.mousePushX),
          );

          const stiffness = mouseActive ? 0.104 : 0.047;
          const damping = mouseActive ? 0.77 : 0.86;

          plant.velocityX += (targetTipX - plant.tipX) * stiffness;
          plant.velocityX *= damping;
          plant.tipX = Math.max(-maxOffset, Math.min(maxOffset, plant.tipX + plant.velocityX));
          const targetTipY = Math.abs(plant.tipX / maxOffset) * plant.stemViewHeight * 0.045;

          plant.velocityY += (targetTipY - plant.tipY) * (mouseActive ? 0.105 : 0.052);
          plant.velocityY *= mouseActive ? 0.72 : 0.83;
          plant.tipY = Math.max(
            0,
            Math.min(plant.stemViewHeight * 0.1, plant.tipY + plant.velocityY),
          );

          const endpointX = 45 + plant.tipX;
          const endpointY = 24 + plant.tipY;
          const lowerControlX = 45 + plant.tipX * 0.06;
          const lowerControlY = stemBottom * 0.78;
          const upperControlX = 45 + plant.tipX * 0.28;
          const upperControlY = endpointY + plant.stemViewHeight * 0.18;
          const tangentX = endpointX - upperControlX;
          const tangentY = endpointY - upperControlY;
          const tangentAngle = Math.atan2(tangentX, -tangentY) * (180 / Math.PI);
          const visualAngle = Math.tanh(tangentAngle / 26) * 18;
          plant.visualVelocity += (visualAngle - plant.visualAngle) * (mouseActive ? 0.058 : 0.033);
          plant.visualVelocity *= mouseActive ? 0.81 : 0.87;
          plant.visualAngle += plant.visualVelocity;

          const headShift = (plant.tipX / plant.stemViewWidth) * plant.stemWidth;
          const headDrop = (plant.tipY / plant.stemViewHeight) * plant.stemCssHeight;

          plant.element.style.setProperty('--head-shift', `${headShift.toFixed(3)}px`);
          plant.element.style.setProperty('--head-rotate', `${plant.visualAngle.toFixed(3)}deg`);
          plant.element.style.setProperty('--head-drop', `${headDrop.toFixed(3)}px`);
          plant.element.classList.toggle('is-near', mouseActive);

          plant.stemPath?.setAttribute(
            'd',
            `M45 ${stemBottom} C ${lowerControlX.toFixed(2)} ${lowerControlY.toFixed(
              2,
            )} ${upperControlX.toFixed(2)} ${upperControlY.toFixed(2)} ${endpointX.toFixed(
              2,
            )} ${endpointY.toFixed(2)} m -7 -7 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0`,
          );
        }

        frame = window.requestAnimationFrame(draw);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        targetX = (event.clientX - rect.left) / rect.width - 0.5;
        targetY = (event.clientY - rect.top) / rect.height - 0.5;
        if (!hasPointerMoved) {
          previousPointerX = event.clientX;
          previousPointerY = event.clientY;
          smoothPointerX = event.clientX;
          smoothPointerY = event.clientY;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
          lastRawPointerX = event.clientX;
          lastRawPointerY = event.clientY;
          rawSpeed = 0;
          smoothedSpeed = 0;
          hasPointerMoved = true;
        } else {
          previousPointerX = pointerX;
          previousPointerY = pointerY;
        }

        const deltaX = event.clientX - lastRawPointerX;
        const deltaY = event.clientY - lastRawPointerY;
        lastPointerMoveAt = performance.now();
        rawSpeed = Math.min(
          120,
          Math.max(Math.hypot(event.movementX, event.movementY), Math.hypot(deltaX, deltaY)),
        );
        lastRawPointerX = event.clientX;
        lastRawPointerY = event.clientY;
        pointerX = event.clientX;
        pointerY = event.clientY;
      };

      const handlePointerLeave = () => {
        targetX = 0;
        targetY = 0;
        pointerX = -10000;
        pointerY = -10000;
        previousPointerX = -10000;
        previousPointerY = -10000;
        rawSpeed = 0;
        smoothedSpeed = 0;
        lastPointerMoveAt = 0;
        hasPointerMoved = false;
      };

      updateMeasurements();
      const readyMeasureTimer = window.setTimeout(updateMeasurements, 4300);
      frame = window.requestAnimationFrame(draw);
      window.addEventListener('resize', updateMeasurements);
      stage.addEventListener('pointermove', handlePointerMove, { passive: true });
      stage.addEventListener('pointerleave', handlePointerLeave);

      this.destroyRef.onDestroy(() => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(readyMeasureTimer);
        window.removeEventListener('resize', updateMeasurements);
        stage.removeEventListener('pointermove', handlePointerMove);
        stage.removeEventListener('pointerleave', handlePointerLeave);
      });
    });
  }

  private setupLetterGsapInteractions(): void {
    const stage = this.stage?.nativeElement;

    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const cleanup: Array<() => void> = [];
      const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant'));

      for (const plant of plants) {
        const letter = plant.querySelector<HTMLElement>('.letter');
        const stemPath = plant.querySelector<SVGPathElement>('.plant-stem path');

        if (!letter) {
          continue;
        }

        const handleMouseEnter = () => {
          plant.classList.add('is-gsap-hot');
          gsap.to(stemPath, {
            strokeWidth: 3.35,
            duration: 0.18,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        };

        const handleMouseLeave = () => {
          plant.classList.remove('is-gsap-hot');
          gsap.to(stemPath, {
            strokeWidth: 2.8,
            duration: 0.38,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        };

        letter.addEventListener('mouseenter', handleMouseEnter);
        letter.addEventListener('mouseleave', handleMouseLeave);

        cleanup.push(() => {
          letter.removeEventListener('mouseenter', handleMouseEnter);
          letter.removeEventListener('mouseleave', handleMouseLeave);
          gsap.killTweensOf(stemPath);
        });
      }

      this.destroyRef.onDestroy(() => {
        for (const dispose of cleanup) {
          dispose();
        }
      });
    });
  }
}
