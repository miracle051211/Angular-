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
      this.setupPointerDrift();
      this.setupLetterGsapInteractions();
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
      let smoothPointerX = -10000;
      let smoothPointerY = -10000;
      let lastPointerX = -10000;
      let lastPointerY = -10000;
      let rawSpeed = 0;
      let smoothedSpeed = 0;
      let pointerAngle = 0;
      let pointerVectorX = 0;
      let pointerVectorY = 0;
      let hasPointerMoved = false;
      let lastRawPointerX = 0;
      let lastRawPointerY = 0;
      const motionProfiles = [
        { phase: 0.1, frequency: 0.00044, amplitude: 0.9, reach: 0.82, response: 0.92 },
        { phase: 3.45, frequency: 0.00058, amplitude: 0.58, reach: 0.58, response: 0.72 },
        { phase: 5.15, frequency: 0.0005, amplitude: 0.82, reach: 0.68, response: 1.08 },
        { phase: 1.72, frequency: 0.00072, amplitude: 0.74, reach: 0.82, response: 1.02 },
        { phase: 4.38, frequency: 0.00039, amplitude: 0.76, reach: 0.52, response: 0.82 },
        { phase: 2.36, frequency: 0.00062, amplitude: 0.62, reach: 0.44, response: 0.7 },
        { phase: 5.92, frequency: 0.00047, amplitude: 0.86, reach: 0.76, response: 1 },
      ];
      const plants = Array.from(stage.querySelectorAll<HTMLElement>('.miracle-plant')).map(
        (element, index) => {
          const profile = motionProfiles[index % motionProfiles.length];

          return {
            element,
            letter: element.querySelector<HTMLElement>('.letter'),
            stem: element.querySelector<SVGSVGElement>('.plant-stem'),
            stemPath: element.querySelector<SVGPathElement>('.plant-stem path'),
            stemCircle: element.querySelector<SVGCircleElement>('.plant-stem circle'),
            stemHeight: Number(
              element
                .querySelector<SVGSVGElement>('.plant-stem')
                ?.getAttribute('viewBox')
                ?.split(' ')[3] ?? 330,
            ),
            phase: profile.phase,
            frequency: profile.frequency,
            amplitude: window.innerWidth * 0.0072 * profile.amplitude,
            reachScale: profile.reach,
            response: profile.response,
            stemWidth: 90,
            stemCssHeight: Number(
              element
                .querySelector<SVGSVGElement>('.plant-stem')
                ?.getAttribute('viewBox')
                ?.split(' ')[3] ?? 330,
            ),
            topX: 0,
            topY: 0,
            reachWidth: 140,
            force: 0,
            xv: 0,
            cursorX: 0,
            cursorY: 0,
            cursorVx: 0,
            cursorVy: 0,
            activeDepth: 0,
            swayEnergy: 0,
            tipX: 0,
            tipY: 0,
            tipVx: 0,
            tipVy: 0,
            visualAngle: 0,
            visualVelocity: 0,
            bendSide: 1,
          };
        },
      );

      const updateMeasurements = () => {
        for (const plant of plants) {
          const letterRect = plant.letter?.getBoundingClientRect() ?? plant.element.getBoundingClientRect();
          const stemRect = plant.stem?.getBoundingClientRect();
          const stemWidth = stemRect?.width || 90;
          const originX = stemRect ? stemRect.left : letterRect.left + letterRect.width / 2 - stemWidth / 2;
          const originY = stemRect ? stemRect.top : letterRect.bottom - 16;

          plant.stemWidth = stemWidth;
          plant.stemCssHeight = stemRect?.height || plant.stemHeight;
          plant.topX = originX + stemWidth / 2;
          plant.topY = originY + 18;
          plant.reachWidth = letterRect.width;
        }
      };

      const draw = () => {
        const now = performance.now() / 1000;

        currentX += (targetX - currentX) * 0.075;
        currentY += (targetY - currentY) * 0.075;

        stage.style.setProperty('--drift-x', currentX.toFixed(3));
        stage.style.setProperty('--drift-y', currentY.toFixed(3));
        smoothPointerX += (pointerX - smoothPointerX) * 0.1;
        smoothPointerY += (pointerY - smoothPointerY) * 0.1;

        const smoothDeltaX = smoothPointerX - lastPointerX;
        const smoothDeltaY = smoothPointerY - lastPointerY;
        const smoothDistance = Math.hypot(smoothDeltaX, smoothDeltaY);

        const immediateSpeed = Math.min(140, Math.max(rawSpeed * 1.15, smoothDistance * 1.2));
        smoothedSpeed += (Math.min(120, Math.max(immediateSpeed, smoothedSpeed * 0.72)) - smoothedSpeed) * 0.18;
        rawSpeed *= 0.62;
        if (smoothDistance > 0.08) {
          pointerVectorX += (smoothDeltaX / smoothDistance - pointerVectorX) * 0.07;
          pointerVectorY += (smoothDeltaY / smoothDistance - pointerVectorY) * 0.07;
          pointerAngle = Math.atan2(pointerVectorY, pointerVectorX);
        }
        lastPointerX = smoothPointerX;
        lastPointerY = smoothPointerY;

        for (const plant of plants) {
          const influencePointerX = hasPointerMoved ? pointerX : smoothPointerX;
          const influencePointerY = hasPointerMoved ? pointerY : smoothPointerY;
          const distanceX = plant.topX - influencePointerX;
          const distanceY = plant.topY - influencePointerY;
          const distance = Math.hypot(distanceX, distanceY);
          const reach = Math.max(182, plant.reachWidth * (plant.reachScale + 0.48), immediateSpeed * 3.1);
          const movingForce = Math.max(0, immediateSpeed * 0.82 + smoothedSpeed * 0.34 - 0.28);
          const isSettling = movingForce < 1.2;

          if (distance < reach) {
            const proximity = 1 - distance / reach;
            const softProximity = proximity * proximity * (3 - 2 * proximity);
            const impulseProximity = proximity * proximity * (0.45 + softProximity * 0.55);
            const wave = Math.cos(distance * 0.001) * impulseProximity;
            const sidePressure = distance === 0 ? 0 : -distanceX / distance;
            const speedImpulse = wave * reach * movingForce * 0.0009;
            const brushPressure = sidePressure * impulseProximity * Math.min(0.04, movingForce * 0.00115);

            plant.cursorVx +=
              (Math.cos(pointerAngle) * speedImpulse + brushPressure) * plant.response;
            plant.cursorVy += Math.sin(pointerAngle) * speedImpulse * 0.18 * plant.response;
            plant.xv += sidePressure * impulseProximity * movingForce * 0.00255 * plant.response;
            plant.swayEnergy = Math.min(
              1.35,
              plant.swayEnergy + (softProximity + impulseProximity) * movingForce * 0.0038 * plant.response,
            );
            const activeTarget = movingForce > 0.9 ? softProximity : 0;
            plant.activeDepth += (activeTarget - plant.activeDepth) * (isSettling ? 0.078 : 0.044);
          } else {
            plant.activeDepth += (0 - plant.activeDepth) * 0.082;
          }

          plant.xv += (isSettling ? 0.0105 : 0.0058) * (0 - plant.force);
          plant.xv *= isSettling ? 0.9 : 0.952;
          plant.xv = Math.max(-12, Math.min(12, plant.xv));
          plant.force += plant.xv;
          plant.force *= isSettling ? 0.955 : 0.982;
          plant.cursorVx += (0 - plant.cursorX) * (isSettling ? 0.012 : 0.0062);
          plant.cursorVy += (0 - plant.cursorY) * (isSettling ? 0.011 : 0.006);
          plant.cursorVx *= isSettling ? 0.86 : 0.928;
          plant.cursorVy *= isSettling ? 0.872 : 0.934;
          plant.cursorX += plant.cursorVx * 1.16;
          plant.cursorY += plant.cursorVy * 0.96;
          plant.swayEnergy *= isSettling ? 0.948 : 0.982;
          plant.cursorX = Math.max(-plant.stemHeight * 0.4, Math.min(plant.stemHeight * 0.4, plant.cursorX));
          plant.cursorY = Math.max(-plant.stemHeight * 0.12, Math.min(plant.stemHeight * 0.12, plant.cursorY));

          const oscillation =
            (Math.cos(now * 1000 * plant.frequency + plant.phase) * plant.amplitude +
            Math.cos(now * 1000 * plant.frequency * 0.43 + plant.phase * 1.7) *
              plant.amplitude *
              0.36) *
            (1 + plant.swayEnergy * 1.55) *
            (1 - plant.activeDepth * 0.24);
          const stemBottom = plant.stemHeight - 2;
          const maxOffset = plant.stemHeight * 0.56;
          const rawTopOffsetX = Math.max(
            -maxOffset,
            Math.min(maxOffset, plant.force + oscillation + plant.cursorX),
          );
          plant.tipVx +=
            (rawTopOffsetX - plant.tipX) * (isSettling ? 0.072 : 0.032 + plant.activeDepth * 0.01);
          plant.tipVx *= isSettling ? 0.74 : 0.84;
          plant.tipX += plant.tipVx;
          const topOffsetX = Math.max(-maxOffset, Math.min(maxOffset, plant.tipX));
          const normalizedOffset = Math.max(-0.95, Math.min(0.95, topOffsetX / plant.stemHeight));
          const angleRadians = Math.asin(normalizedOffset);
          const topOffsetY = (1 - Math.cos(angleRadians)) * plant.stemHeight;
          const angle = angleRadians * (180 / Math.PI);
          const rawEndpointOffsetY = topOffsetY + plant.cursorY * 0.14;
          plant.tipVy += (rawEndpointOffsetY - plant.tipY) * (isSettling ? 0.052 : 0.028);
          plant.tipVy *= isSettling ? 0.76 : 0.86;
          plant.tipY += plant.tipVy;
          const endpointOffsetY = plant.tipY;
          const headShift = (topOffsetX / 90) * plant.stemWidth;
          const headDrop = (endpointOffsetY / plant.stemHeight) * plant.stemCssHeight;
          const svgTopX = 45 + topOffsetX;
          const svgTopY = 24 + endpointOffsetY;
          const lowerControlX = 45 + topOffsetX * (0.08 + plant.activeDepth * 0.06);
          const lowerControlY = plant.stemHeight * (0.8 - plant.activeDepth * 0.06);
          const terminalPull = 0.32 + plant.activeDepth * 0.1;
          const upperControlX = svgTopX - topOffsetX * terminalPull;
          const upperControlY = svgTopY + plant.stemHeight * (0.16 + plant.activeDepth * 0.035);
          const tangentAngle =
            Math.atan2(svgTopX - upperControlX, -(svgTopY - upperControlY)) * (180 / Math.PI);
          const wholeStemAngle =
            Math.atan2(topOffsetX, stemBottom - svgTopY) * (180 / Math.PI);
          const rawVisualAngle = tangentAngle * 0.88 + wholeStemAngle * 0.12;
          const visualAngle = Math.tanh(rawVisualAngle / 48) * 52;
          plant.visualVelocity += (visualAngle - plant.visualAngle) * (isSettling ? 0.11 : 0.062);
          plant.visualVelocity *= isSettling ? 0.66 : 0.75;
          plant.visualAngle += plant.visualVelocity;

          plant.element.style.setProperty('--head-shift', `${headShift.toFixed(3)}px`);
          plant.element.style.setProperty('--head-rotate', `${plant.visualAngle.toFixed(3)}deg`);
          plant.element.style.setProperty('--head-drop', `${headDrop.toFixed(3)}px`);
          plant.element.classList.toggle('is-near', distance < reach * 0.72);

          plant.stemPath?.setAttribute(
            'd',
            `M45 ${stemBottom} C${lowerControlX.toFixed(2)} ${lowerControlY.toFixed(
              2,
            )} ${upperControlX.toFixed(2)} ${upperControlY.toFixed(2)} ${svgTopX.toFixed(
              2,
            )} ${svgTopY.toFixed(2)}`,
          );
          plant.stemCircle?.setAttribute('cx', svgTopX.toFixed(2));
          plant.stemCircle?.setAttribute('cy', svgTopY.toFixed(2));
        }

        frame = window.requestAnimationFrame(draw);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        targetX = (event.clientX - rect.left) / rect.width - 0.5;
        targetY = (event.clientY - rect.top) / rect.height - 0.5;
        if (!hasPointerMoved) {
          smoothPointerX = event.clientX;
          smoothPointerY = event.clientY;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
          lastRawPointerX = event.clientX;
          lastRawPointerY = event.clientY;
          rawSpeed = 0;
          hasPointerMoved = true;
        }

        const deltaX = event.clientX - lastRawPointerX;
        const deltaY = event.clientY - lastRawPointerY;
        rawSpeed = Math.max(Math.hypot(event.movementX, event.movementY), Math.hypot(deltaX, deltaY));
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
        rawSpeed = 0;
        smoothedSpeed = 0;
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
        const pieces = letter
          ? Array.from(letter.querySelectorAll<HTMLElement | SVGElement>('span, .letter-piece'))
          : [];
        const stemPath = plant.querySelector<SVGPathElement>('.plant-stem path');

        if (!letter || pieces.length === 0) {
          continue;
        }

        gsap.set(pieces, {
          transformOrigin: '50% 58%',
          force3D: true,
        });
        const readyTimer = window.setTimeout(() => {
          plant.classList.add('is-gsap-ready');
          gsap.set(pieces, {
            animation: 'none',
            opacity: 1,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
          });
        }, 4200);

        const handleMouseEnter = () => {
          plant.classList.add('is-gsap-hot');
          gsap.killTweensOf(pieces);
          gsap.to(pieces, {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1.012,
            duration: 0.34,
            stagger: 0.012,
            ease: 'power2.out',
            overwrite: 'auto',
          });
          gsap.to(stemPath, {
            strokeWidth: 3.35,
            duration: 0.18,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        };

        const handleMouseLeave = () => {
          plant.classList.remove('is-gsap-hot');
          gsap.to(pieces, {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.95,
            stagger: 0.018,
            ease: 'elastic.out(1.12, 0.48)',
            overwrite: 'auto',
          });
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
          window.clearTimeout(readyTimer);
          letter.removeEventListener('mouseenter', handleMouseEnter);
          letter.removeEventListener('mouseleave', handleMouseLeave);
          gsap.killTweensOf([pieces, stemPath]);
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
