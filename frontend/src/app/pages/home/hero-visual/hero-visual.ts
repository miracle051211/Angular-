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
  private hasNodPointerMotion = false;

  constructor() {
    afterNextRender(() => {
      this.setupIntroAssembly();
    });
  }

  private setupIntroAssembly(): void {
    const stage = this.stage?.nativeElement;

    if (!stage) {
      return;
    }

    stage.classList.add('is-motion-ready');

    const word = stage.querySelector<HTMLElement>('.hero-word');
    const renderPath = stage.querySelector<SVGPathElement>('.hero-render-path');
    const renderEdge = stage.querySelector<SVGPathElement>('.hero-render-edge');
    const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant'));
    const stems = Array.from(stage.querySelectorAll<SVGSVGElement>('.plant-stem'));
    const stemPaths = Array.from(stage.querySelectorAll<SVGPathElement>('.plant-stem path'));
    const pieces = Array.from(stage.querySelectorAll<SVGGElement>('.letter-piece'));
    const pieceOffsets = [
      { x: -18, y: 24, rotation: -9 },
      { x: 16, y: 22, rotation: 8 },
      { x: 0, y: 30, rotation: 5 },
      { x: -8, y: 18, rotation: -6 },
      { x: 12, y: 26, rotation: 7 },
    ];
    const baselineY = 832;
    const hiddenY = 1180;
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

    stage.style.setProperty('--intro-motion', '0.08');
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
      this.setupNodPointerMotion();

      gsap.killTweensOf([
        word,
        renderPath,
        renderEdge,
        ...plants,
        ...stems,
        ...stemPaths,
        ...pieces,
      ]);
      gsap.set(word, {
        clipPath: 'inset(0 -100vw 100% -100vw)',
        y: 0,
      });
      gsap.set(plants, {
        opacity: 0,
        yPercent: 0,
        rotation: (index: number) => (index % 2 === 0 ? -1.2 : 1.1),
        scaleX: 0.985,
        scaleY: 0.92,
        transformOrigin: '50% 100%',
      });
      gsap.set(stemPaths, {
        opacity: 0.95,
        strokeDasharray: (_index: number, path: SVGPathElement) => path.getTotalLength(),
        strokeDashoffset: (_index: number, path: SVGPathElement) => path.getTotalLength(),
      });
      gsap.set(pieces, {
        opacity: 0,
        x: (index: number) => pieceOffsets[index % pieceOffsets.length].x,
        y: (index: number) => pieceOffsets[index % pieceOffsets.length].y + 10,
        rotation: (index: number) => pieceOffsets[index % pieceOffsets.length].rotation,
        scale: 0.86,
        scaleX: (index: number) => (index % 2 === 0 ? 0.84 : 1.12),
        scaleY: (index: number) => (index % 2 === 0 ? 1.12 : 0.84),
        transformOrigin: '50% 60%',
      });

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
          gsap.set(stemPaths, { clearProps: 'strokeDasharray,strokeDashoffset,opacity' });
          gsap.set(pieces, { clearProps: 'transform,opacity,transformOrigin' });
          window.dispatchEvent(new Event('resize'));
        },
      });

      timeline.to(renderEdge, { opacity: 0.72, duration: 0.2, ease: 'power2.out' }, 0.08);
      timeline.to(
        pathPoints,
        { y1: baselineY, y3: baselineY, duration: 0.62, ease: 'power3.out' },
        0.02,
      );
      timeline.to(pathPoints, { y2: 402, duration: 0.56, ease: 'power3.out' }, 0.02);
      timeline.to(
        word,
        { clipPath: 'inset(0 -100vw -100vh -100vw)', duration: 1.08, ease: 'power3.out' },
        0.02,
      );
      timeline.to(
        pathPoints,
        { y2: baselineY, duration: 1.8, ease: 'elastic.out(1.5, 0.4)' },
        0.46,
      );
      timeline.to(stage, { '--intro-motion': 1, duration: 1.18, ease: 'power2.out' }, 0.1);

      const plantTimes = [0.04, 0.1, 0.18, 0.29, 0.39, 0.5, 0.61];
      const plantDurations = [1.22, 1.12, 1.18, 1.1, 1.2, 1.12, 1.2];

      plants.forEach((plant, index) => {
        const at = plantTimes[index] ?? 0.58 + index * 0.1;
        const duration = plantDurations[index] ?? 1.18;
        const plantStemPath = plant.querySelector<SVGPathElement>('.plant-stem path');

        timeline.to(
          plant,
          {
            opacity: 1,
            yPercent: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            duration,
            ease: 'elastic.out(1.08, 0.54)',
          },
          at,
        );
        timeline.to(
          plantStemPath,
          {
            strokeDashoffset: 0,
            duration: duration * 0.62,
            ease: 'power2.out',
          },
          at,
        );
        timeline.to(
          plant.querySelectorAll('.letter-piece'),
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 0.78,
            ease: 'back.out(2.1)',
            stagger: 0.038,
          },
          at + duration * 0.18,
        );
      });

      this.destroyRef.onDestroy(() => {
        timeline.kill();
      });
    });
  }

  private setupNodPointerMotion(): void {
    const stage = this.stage?.nativeElement;

    if (
      !stage ||
      this.hasNodPointerMotion ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.hasNodPointerMotion = true;

    this.ngZone.runOutsideAngular(() => {
      let frame = 0;
      let measureFrame = 0;
      let measuredScrollY = window.scrollY || 0;
      let pointerX = -10000;
      let pointerY = -10000;
      let previousX = 0;
      let previousY = 0;
      let pointerSpeed = 0;
      let pointerAngle = 0;
      const amplitudeBase = Math.max(4.2, window.innerWidth * 0.0052);
      const motionProfiles = [
        { phase: 0.15, frequency: 0.00044, amplitude: 1.12 },
        { phase: 2.3, frequency: 0.00052, amplitude: 0.82 },
        { phase: 4.2, frequency: 0.00048, amplitude: 0.96 },
        { phase: 1.15, frequency: 0.00058, amplitude: 0.76 },
        { phase: 5.35, frequency: 0.00042, amplitude: 1.06 },
        { phase: 3.05, frequency: 0.00055, amplitude: 0.88 },
        { phase: 4.85, frequency: 0.00046, amplitude: 1.0 },
      ];
      const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant')).map(
        (element, index) => {
          const stem = element.querySelector<SVGSVGElement>('.plant-stem');
          const viewBox = stem?.getAttribute('viewBox')?.split(' ').map(Number) ?? [0, 0, 90, 260];
          const profile = motionProfiles[index % motionProfiles.length];

          return {
            element,
            letter: element.querySelector<HTMLElement>('.letter'),
            letterSvg: element.querySelector<SVGSVGElement>('.letter-svg'),
            stem,
            path: element.querySelector<SVGPathElement>('.plant-stem path'),
            viewWidth: viewBox[2] || 90,
            viewHeight: viewBox[3] || 260,
            anchorY: 24,
            letterAnchorX: 0,
            letterAnchorY: 0,
            baseDrop: 0,
            cssWidth: 90,
            cssHeight: viewBox[3] || 260,
            originX: 0,
            originY: 0,
            force: 0,
            velocity: 0,
            phase: profile.phase,
            frequency: profile.frequency,
            amplitude: amplitudeBase * profile.amplitude,
          };
        },
      );

      const updateMeasurements = () => {
        measuredScrollY = window.scrollY || 0;

        for (const plant of plants) {
          const rect = plant.stem?.getBoundingClientRect();

          if (!rect) {
            continue;
          }

          const plantRect = plant.element.getBoundingClientRect();
          const letterStyles = plant.letter ? window.getComputedStyle(plant.letter) : null;
          const letterTop = letterStyles ? Number.parseFloat(letterStyles.top) || 0 : 0;
          const letterWidth = plant.letter?.offsetWidth || 0;
          const letterHeight = plant.letter?.offsetHeight || 0;
          const svgElement = plant.letterSvg as unknown as HTMLElement | null;
          const svgLeft = svgElement?.offsetLeft ?? 0;
          const svgTop = svgElement?.offsetTop ?? 0;
          const svgWidth = svgElement?.clientWidth || letterWidth;
          const svgHeight = svgElement?.clientHeight || letterHeight;
          const ringInsideInset = 8;
          const originRatio =
            (Number.parseFloat(
              window.getComputedStyle(plant.element).getPropertyValue('--origin-x'),
            ) || 50) / 100;
          const letterAnchorX = svgLeft + svgWidth * originRatio;
          const letterAnchorY = svgTop + svgHeight - ringInsideInset;
          const anchorY = (plant.anchorY / plant.viewHeight) * rect.height;

          plant.cssWidth = rect.width;
          plant.cssHeight = rect.height;
          plant.letterAnchorX = letterAnchorX;
          plant.letterAnchorY = letterAnchorY;
          plant.originX = rect.left + rect.width / 2;
          plant.originY = rect.top + anchorY;
          plant.baseDrop = plant.originY - (plantRect.top + letterTop + letterAnchorY);
          plant.element.style.setProperty('--letter-anchor-x', `${letterAnchorX.toFixed(3)}px`);
        }
      };
      const scheduleMeasurements = () => {
        if (measureFrame) {
          return;
        }

        measureFrame = window.requestAnimationFrame(() => {
          measureFrame = 0;
          updateMeasurements();
        });
      };
      const draw = (now: number) => {
        const horizontalVelocity = Math.max(
          -1,
          Math.min(1, Math.cos((pointerAngle * Math.PI) / 180) * pointerSpeed * 0.025),
        );

        for (const plant of plants) {
          const distance = Math.hypot(pointerX - plant.originX, pointerY - plant.originY);
          const reach = Math.max(200, pointerSpeed);

          if (distance < reach) {
            const proximity = 1 - distance / reach;
            const wave = Math.cos(distance * 0.001) * proximity;
            plant.velocity += horizontalVelocity * wave * reach * pointerSpeed * 0.0005;
          }

          plant.velocity += 0.005 * -plant.force;
          plant.velocity *= 0.95;
          plant.velocity = Math.max(-10, Math.min(10, plant.velocity));
          plant.force += plant.velocity;

          const introMotion = Number.parseFloat(stage.style.getPropertyValue('--intro-motion')) || 0;
          const ambientBreath =
            Math.cos(now * plant.frequency + plant.phase) * plant.amplitude +
            Math.sin(now * plant.frequency * 0.43 + plant.phase * 1.7) * plant.amplitude * 0.36;
          const oscillation = ambientBreath * introMotion;
          const rawOffsetX = plant.force + oscillation;
          const offsetX = Math.max(
            -plant.viewHeight * 0.92,
            Math.min(plant.viewHeight * 0.92, rawOffsetX),
          );
          const angleRadians = Math.asin(offsetX / plant.viewHeight) - Math.PI / 2;
          const offsetY = (1 + Math.sin(angleRadians)) * plant.viewHeight;
          const angle = (angleRadians * 180) / Math.PI + 90;
          const centerX = plant.viewWidth / 2;
          const nodeX = centerX + offsetX;
          const nodeY = plant.anchorY + offsetY;
          const scaleX = plant.cssWidth / plant.viewWidth || 1;
          const scaleY = plant.cssHeight / plant.viewHeight || 1;
          const ringRadius = 6.8;
          const ringRx = Math.max(4.4, Math.min(10.5, ringRadius / scaleX));
          const ringRy = Math.max(4.4, Math.min(10.5, ringRadius / scaleY));
          const attachX = nodeX;
          const attachY = nodeY + ringRy;
          const oppositeY = nodeY - ringRy;
          const controlX = centerX;
          const controlY = plant.viewHeight / 2;
          const headShift = (offsetX / plant.viewWidth) * plant.cssWidth;
          const headDrop = plant.baseDrop + (offsetY / plant.viewHeight) * plant.cssHeight;

          plant.path?.setAttribute(
            'd',
            `M ${centerX.toFixed(2)} ${(plant.viewHeight * 1.2).toFixed(2)} Q ${controlX.toFixed(
              2,
            )} ${controlY.toFixed(2)} ${attachX.toFixed(2)} ${attachY.toFixed(
              2,
            )} A ${ringRx.toFixed(2)} ${ringRy.toFixed(2)} 0 1 0 ${nodeX.toFixed(
              2,
            )} ${oppositeY.toFixed(2)} A ${ringRx.toFixed(2)} ${ringRy.toFixed(
              2,
            )} 0 1 0 ${attachX.toFixed(2)} ${attachY.toFixed(2)}`,
          );
          plant.element.style.setProperty('--head-shift', `${headShift.toFixed(3)}px`);
          plant.element.style.setProperty('--head-drop', `${headDrop.toFixed(3)}px`);
          plant.element.style.setProperty('--head-rotate', `${angle.toFixed(3)}deg`);
          plant.force *= 0.98;
        }

        pointerSpeed *= 0.9;
        frame = window.requestAnimationFrame(draw);
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (Math.abs((window.scrollY || 0) - measuredScrollY) > 0.5) {
          updateMeasurements();
        }

        if (pointerX < -1000) {
          previousX = event.clientX;
          previousY = event.clientY;
        }

        const deltaX = event.clientX - previousX;
        const deltaY = event.clientY - previousY;
        const distance = Math.hypot(deltaX, deltaY);

        pointerSpeed = Math.min(240, Math.max(pointerSpeed, distance));
        if (distance > 0.01) {
          pointerAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
        }

        previousX = event.clientX;
        previousY = event.clientY;
        pointerX = event.clientX;
        pointerY = event.clientY;
      };
      const handlePointerLeave = () => {
        pointerX = -10000;
        pointerY = -10000;
        pointerSpeed = 0;
      };

      stage.style.setProperty('--drift-x', '0');
      stage.style.setProperty('--drift-y', '0');
      updateMeasurements();
      const readyMeasureTimer = window.setTimeout(updateMeasurements, 4300);
      draw(performance.now());
      stage.classList.add('is-motion-ready');
      window.addEventListener('resize', updateMeasurements);
      window.addEventListener('scroll', scheduleMeasurements, { passive: true });
      stage.addEventListener('pointermove', handlePointerMove, { passive: true });
      stage.addEventListener('pointerleave', handlePointerLeave);

      this.destroyRef.onDestroy(() => {
        window.cancelAnimationFrame(frame);
        window.cancelAnimationFrame(measureFrame);
        window.clearTimeout(readyMeasureTimer);
        this.hasNodPointerMotion = false;
        window.removeEventListener('resize', updateMeasurements);
        window.removeEventListener('scroll', scheduleMeasurements);
        stage.removeEventListener('pointermove', handlePointerMove);
        stage.removeEventListener('pointerleave', handlePointerLeave);
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
      let lastRawPointerX = 0;
      let lastRawPointerY = 0;
      let introMotion = Number.parseFloat(stage.style.getPropertyValue('--intro-motion')) || 0;
      let measureFrame = 0;
      let measuredScrollY = window.scrollY || 0;
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
        measuredScrollY = window.scrollY || 0;

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
      const scheduleMeasurements = () => {
        if (measureFrame) {
          return;
        }

        measureFrame = window.requestAnimationFrame(() => {
          measureFrame = 0;
          updateMeasurements();
        });
      };

      const draw = () => {
        const now = performance.now();
        const introTarget = Number.parseFloat(stage.style.getPropertyValue('--intro-motion')) || 0;
        introMotion += (introTarget - introMotion) * 0.12;
        const motionPresence = hasPointerMoved ? introMotion : 0;

        currentX += (targetX - currentX) * 0.14;
        currentY += (targetY - currentY) * 0.14;

        stage.style.setProperty('--drift-x', currentX.toFixed(3));
        stage.style.setProperty('--drift-y', currentY.toFixed(3));
        smoothPointerX += (pointerX - smoothPointerX) * 0.34;
        smoothPointerY += (pointerY - smoothPointerY) * 0.34;

        const smoothDeltaX = smoothPointerX - lastPointerX;
        const smoothDeltaY = smoothPointerY - lastPointerY;
        const smoothDistance = Math.hypot(smoothDeltaX, smoothDeltaY);
        const immediateSpeed = Math.min(140, Math.max(rawSpeed, smoothDistance * 1.45));

        smoothedSpeed += (immediateSpeed - smoothedSpeed) * 0.28;
        rawSpeed *= 0.62;

        if (smoothDistance > 0.08) {
          pointerVectorX += (smoothDeltaX / smoothDistance - pointerVectorX) * 0.22;
          pointerVectorY += (smoothDeltaY / smoothDistance - pointerVectorY) * 0.22;
        }

        lastPointerX = smoothPointerX;
        lastPointerY = smoothPointerY;

        for (const plant of plants) {
          const influencePointerX = pointerX;
          const influencePointerY = pointerY;
          const distanceX = influencePointerX - plant.topX;
          const distanceY = influencePointerY - plant.topY;
          const distance = Math.hypot(distanceX, distanceY);
          const reach = Math.max(132, plant.reachWidth * plant.reachScale * 0.9);
          const hitPaddingX = Math.max(24, Math.min(46, plant.reachWidth * 0.2));
          const hitPaddingY = Math.max(28, Math.min(54, plant.stemCssHeight * 0.24));
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
          const sweepReach = Math.max(82, Math.min(152, reach * 0.9));
          const tipProximity = hasPointerMoved ? Math.max(0, 1 - distance / reach) : 0;
          const shapeProximity = hasPointerMoved ? Math.max(0, 1 - rectDistance / 112) : 0;
          const sweepProximity = hasPointerMoved
            ? Math.max(
                sweepHit ? 0.48 : 0,
                Math.max(0, 1 - sweepDistance / sweepReach) * 0.54,
                Math.max(0, 1 - letterSweepDistance / (plant.reachWidth * 0.56 + 50)) * 0.74,
              ) * Math.min(0.78, 0.22 + immediateSpeed / 112)
            : 0;
          const proximity = Math.max(tipProximity, shapeProximity, sweepProximity) * motionPresence;
          const softProximity = proximity * (2 - proximity);
          const mouseActive = softProximity > 0.012;
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
          const sideEase = mouseActive ? 0.24 : 0.06;

          plant.sideX += (rawSideX * softProximity - plant.sideX) * sideEase;

          const localPointerSpeed = mouseActive ? smoothedSpeed * motionPresence : 0;
          const localPointerDeltaX = mouseActive ? smoothDeltaX * motionPresence : 0;
          const sweepKick =
            sweepProximity * sweepSideX * Math.min(maxOffset * 0.34, 7 + immediateSpeed * 0.16);
          const vectorPush = pointerVectorX * localPointerSpeed * 0.14;
          const brushPush =
            localPointerDeltaX * 0.34 +
            vectorPush +
            sweepKick +
            plant.sideX * localPointerSpeed * 0.08;
          const hoverPush =
            plant.sideX * Math.min(plant.stemViewHeight * 0.16, 32) * motionPresence;
          const unclampedMousePush = mouseActive ? (brushPush + hoverPush) * plant.response : 0;
          const rawMousePush = Math.max(
            -maxOffset * 0.8,
            Math.min(maxOffset * 0.8, unclampedMousePush),
          );

          plant.swayEnergy = mouseActive
            ? Math.min(
                0.5,
                plant.swayEnergy + softProximity * (0.008 + localPointerSpeed * 0.00026),
              )
            : plant.swayEnergy * 0.94;
          plant.mousePushVelocity +=
            (rawMousePush - plant.mousePushX) * (mouseActive ? 0.18 : 0.065);
          plant.mousePushVelocity *= mouseActive ? 0.68 : 0.84;
          plant.mousePushX += plant.mousePushVelocity;
          const targetTipX = Math.max(
            -maxOffset,
            Math.min(maxOffset, windTarget + plant.mousePushX),
          );

          const stiffness = mouseActive ? 0.19 : 0.065;
          const damping = mouseActive ? 0.7 : 0.86;

          plant.velocityX += (targetTipX - plant.tipX) * stiffness;
          plant.velocityX *= damping;
          plant.tipX = Math.max(-maxOffset, Math.min(maxOffset, plant.tipX + plant.velocityX));
          const targetTipY = Math.abs(plant.tipX / maxOffset) * plant.stemViewHeight * 0.045;

          plant.velocityY += (targetTipY - plant.tipY) * (mouseActive ? 0.17 : 0.065);
          plant.velocityY *= mouseActive ? 0.7 : 0.84;
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
          const visualAngle = Math.tanh(tangentAngle / 28) * 15.5;
          plant.visualVelocity += (visualAngle - plant.visualAngle) * (mouseActive ? 0.14 : 0.055);
          plant.visualVelocity *= mouseActive ? 0.72 : 0.84;
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
            )} ${endpointY.toFixed(2)}`,
          );
        }

        frame = window.requestAnimationFrame(draw);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (Math.abs((window.scrollY || 0) - measuredScrollY) > 0.5) {
          updateMeasurements();
        }

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
        hasPointerMoved = false;
      };

      updateMeasurements();
      const readyMeasureTimer = window.setTimeout(updateMeasurements, 4300);
      frame = window.requestAnimationFrame(draw);
      window.addEventListener('resize', updateMeasurements);
      window.addEventListener('scroll', scheduleMeasurements, { passive: true });
      stage.addEventListener('pointermove', handlePointerMove, { passive: true });
      stage.addEventListener('pointerleave', handlePointerLeave);

      this.destroyRef.onDestroy(() => {
        window.cancelAnimationFrame(frame);
        window.cancelAnimationFrame(measureFrame);
        window.clearTimeout(readyMeasureTimer);
        window.removeEventListener('resize', updateMeasurements);
        window.removeEventListener('scroll', scheduleMeasurements);
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
