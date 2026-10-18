'use client';

import * as React from 'react';
import * as THREE from 'three';

interface Props {
  /** True while the assistant is waiting on an answer: the character wobbles and spins its ring. */
  thinking?: boolean;
  className?: string;
  /** Called if WebGL is not available so the caller can show a flat fallback. */
  onUnsupported?: () => void;
}

const LIME = 0xbdea2a;
const EMBER = 0xf97d2b;

/**
 * The Forge assistant character, rendered with three.js: a lime robot head with a
 * dark visor, glowing eyes and an ember antenna, floating over a glowing ring.
 * The head follows the cursor, blinks, and bobs. Honors prefers-reduced-motion.
 */
export default function AssistantOrb({ thinking = false, className, onUnsupported }: Props) {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const thinkingRef = React.useRef(thinking);
  thinkingRef.current = thinking;
  const unsupportedRef = React.useRef(onUnsupported);
  unsupportedRef.current = onUnsupported;

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      unsupportedRef.current?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0.05, 5.0);
    camera.lookAt(0, 0.05, 0);

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a3f2c, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(EMBER, 30, 12, 2);
    rim.position.set(-3, -1, 3);
    scene.add(rim);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const limeMat = track(
      new THREE.MeshPhysicalMaterial({ color: LIME, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.2 })
    );
    const visorMat = track(new THREE.MeshPhysicalMaterial({ color: 0x15130f, roughness: 0.12, metalness: 0.3, clearcoat: 1 }));
    const emberMat = track(
      new THREE.MeshStandardMaterial({ color: EMBER, emissive: EMBER, emissiveIntensity: 0.9, roughness: 0.4 })
    );
    const eyeMat = track(new THREE.MeshBasicMaterial({ color: 0xdcff6b }));

    const robot = new THREE.Group();
    scene.add(robot);

    const head = new THREE.Group();
    robot.add(head);

    const skull = new THREE.Mesh(track(new THREE.SphereGeometry(1, 48, 48)), limeMat);
    skull.scale.set(1.02, 0.92, 0.95);
    head.add(skull);

    const visor = new THREE.Mesh(track(new THREE.SphereGeometry(1, 48, 32)), visorMat);
    visor.scale.set(0.72, 0.5, 0.3);
    visor.position.set(0, 0.04, 0.68);
    head.add(visor);

    const eyeGeo = track(new THREE.CapsuleGeometry(0.085, 0.13, 6, 16));
    const eyes: THREE.Mesh[] = [-1, 1].map((side) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.27, 0.05, 0.93);
      head.add(eye);
      return eye;
    });

    const earGeo = track(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 28));
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(earGeo, emberMat);
      ear.rotation.z = Math.PI / 2;
      ear.position.set(side * 1.03, -0.02, 0);
      head.add(ear);
    });

    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 12)), limeMat);
    stem.position.set(0, 1.0, 0);
    head.add(stem);
    const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.115, 24, 24)), emberMat);
    bulb.position.set(0, 1.23, 0);
    head.add(bulb);

    const ringGeo = track(new THREE.TorusGeometry(0.92, 0.04, 16, 80));
    const ring = new THREE.Mesh(ringGeo, emberMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.22, 0);
    robot.add(ring);
    const ring2 = new THREE.Mesh(track(new THREE.TorusGeometry(0.62, 0.025, 12, 64)), limeMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(0, -1.22, 0);
    robot.add(ring2);

    // Size to container
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Cursor tracking
    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      pointer.x = THREE.MathUtils.clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1);
      pointer.y = THREE.MathUtils.clamp((e.clientY - cy) / (window.innerHeight / 2), -1, 1);
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const clock = new THREE.Clock();
    let nextBlink = 2.5;
    let blinkT = -1;

    const frame = () => {
      const t = clock.getElapsedTime();
      const busy = thinkingRef.current;

      // Head turns toward the cursor, with a side-to-side wobble while thinking.
      const targetY = pointer.x * 0.55 + (busy ? Math.sin(t * 6) * 0.16 : 0);
      const targetX = pointer.y * 0.3;
      head.rotation.y += (targetY - head.rotation.y) * 0.08;
      head.rotation.x += (targetX - head.rotation.x) * 0.08;

      robot.position.y = Math.sin(t * 1.6) * 0.06;
      ring.rotation.z = t * (busy ? 4 : 0.8);
      ring2.rotation.z = -t * (busy ? 5 : 1.2);

      emberMat.emissiveIntensity = 0.9 + Math.sin(t * (busy ? 9 : 2.4)) * (busy ? 0.6 : 0.25);
      bulb.scale.setScalar(1 + Math.sin(t * (busy ? 9 : 2.4)) * 0.08);

      // Blink, or squint while thinking.
      if (blinkT < 0 && t > nextBlink) blinkT = 0;
      let openness = busy ? 0.55 : 1;
      if (blinkT >= 0) {
        blinkT += 0.016;
        openness = Math.max(0.05, Math.abs(1 - blinkT / 0.07) * 0.95 + 0.05) * (busy ? 0.55 : 1);
        if (blinkT > 0.14) {
          blinkT = -1;
          nextBlink = t + 2.5 + Math.random() * 3;
        }
      }
      eyes.forEach((e) => e.scale.set(1, openness, 1));

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      // One still frame, no loop and no cursor tracking.
      head.rotation.y = 0.25;
      renderer.render(scene, camera);
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
