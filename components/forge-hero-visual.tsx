"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Optional local Meshy GLB; procedural geometry remains the no-network fallback. */
export function ForgeHeroVisual({ modelUrl }: { modelUrl?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const playing = useRef(true);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};
    import("three")
      .then(async (THREE) => {
        if (disposed) return;
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          });
        } catch {
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 8);
        const sculpture = new THREE.Group();
        scene.add(sculpture);
        scene.add(new THREE.HemisphereLight(0xf2f7ff, 0x252d39, 3));
        const light = new THREE.DirectionalLight(0xffffff, 5);
        light.position.set(3, 5, 5);
        scene.add(light);
        const rim = new THREE.DirectionalLight(0xc2f542, 4);
        rim.position.set(-4, 0, 2);
        scene.add(rim);
        const material = new THREE.MeshStandardMaterial({
          color: 0xa9b0b8,
          metalness: 0.72,
          roughness: 0.24,
        });
        const lime = new THREE.MeshStandardMaterial({
          color: 0xc6f344,
          metalness: 0.35,
          roughness: 0.28,
        });
        const geometry = new THREE.TorusGeometry(1.08, 0.28, 24, 80);
        for (let i = 0; i < 3; i++) {
          const mesh = new THREE.Mesh(geometry, i === 1 ? lime : material);
          mesh.rotation.set((i * Math.PI) / 3, (i * Math.PI) / 3, 0);
          sculpture.add(mesh);
        }
        sculpture.rotation.set(0.4, 0.5, -0.3);
        element.appendChild(renderer.domElement);
        setReady(true);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        const syncMotion = () => {
          playing.current = !reduce.matches;
          setPaused(reduce.matches);
        };
        syncMotion();
        reduce.addEventListener("change", syncMotion);
        let visible = true,
          frame = 0,
          last = 0;
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
        });
        observer.observe(element);
        const resize = new ResizeObserver(() => {
          const w = element.clientWidth,
            h = element.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        });
        resize.observe(element);
        const render = (now: number) => {
          frame = requestAnimationFrame(render);
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (!visible || document.hidden) return;
          if (playing.current) sculpture.rotation.y += dt * 0.16;
          renderer.render(scene, camera);
        };
        frame = requestAnimationFrame(render);
        const disposeObject = (object: InstanceType<typeof THREE.Object3D>) =>
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((m) => {
                for (const value of Object.values(m))
                  if (value instanceof THREE.Texture) value.dispose();
                m.dispose();
              });
            }
          });
        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          resize.disconnect();
          reduce.removeEventListener("change", syncMotion);
          disposeObject(sculpture);
          geometry.dispose();
          material.dispose();
          lime.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
        if (modelUrl) {
          try {
            const { GLTFLoader } = await import(
              "three/examples/jsm/loaders/GLTFLoader.js"
            );
            const gltf = await new GLTFLoader().loadAsync(modelUrl);
            if (disposed) {
              disposeObject(gltf.scene);
              return;
            }
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.sub(center);
            const model = new THREE.Group();
            model.add(gltf.scene);
            model.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z));
            sculpture.clear();
            sculpture.add(model);
          } catch {
            /* Retain procedural sculpture if the asset cannot load. */
          }
        }
      })
      .catch(() => {});
    return () => {
      disposed = true;
      cleanup();
    };
  }, [modelUrl]);
  return (
    <div className="forge-art">
      <div
        className="absolute inset-[15%] rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      {!ready && (
        <div
          aria-hidden="true"
          className="absolute inset-[23%] rotate-45 rounded-[30%] border-[35px] border-accent/70 shadow-2xl"
        />
      )}
      <div
        ref={host}
        className="absolute inset-0"
        role="img"
        aria-label="Three interlocking sculptural rings representing builders coming together"
      />
      <span className="forge-art-label left-[3%] top-[18%]">
        &lt;builder /&gt;
      </span>
      <span className="forge-art-label right-[1%] top-[56%]">
        git checkout -b together
      </span>
      <div className="absolute bottom-[5%] left-[8%] right-[8%] flex items-center justify-between border-t border-border pt-3">
        <span className="forge-eyebrow">
          Different skills. Shared ambition.
        </span>
        {ready && (
          <button
            type="button"
            aria-label={paused ? "Play 3D animation" : "Pause 3D animation"}
            onClick={() => {
              playing.current = paused;
              setPaused(!paused);
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
