import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, RotateCcw } from "lucide-react";

import {
  buildKitchenScene,
  OVERVIEW_CAMERA,
  STATION_METADATA,
  type StationId,
  type StationMeta,
} from "./scene-builder";
import { createKitchenTextures } from "./textures";

export function Kitchen3DScene({ initialAutoStart = false }: { initialAutoStart?: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<StationId>(
    initialAutoStart ? "cooking_line" : "overview",
  );
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Refs shared safely with imperative Three.js controller
  const selectPresetRef = useRef<((id: StationId) => void) | null>(null);

  const handleSelectPreset = useCallback((id: StationId) => {
    setSelectedId(id);
    selectPresetRef.current?.(id);
  }, []);

  // Keyboard H shortcut to toggle bottom control dock + 1..6 station presets
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "h") {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === "0") {
        handleSelectPreset("overview");
      } else if (e.key >= "1" && e.key <= "6") {
        const meta = STATION_METADATA[Number(e.key) - 1];
        if (meta) handleSelectPreset(meta.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSelectPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    // Probe renderer capability first so headless SwiftShader skips heavy AA/shadows
    const probeCanvas = document.createElement("canvas");
    const probeGl = probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
    const dbg = probeGl?.getExtension("WEBGL_debug_renderer_info");
    const gpuName = dbg && probeGl ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuName);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16222a);
    scene.fog = new THREE.Fog(0x16222a, 24, 62);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 120);
    camera.position.copy(OVERVIEW_CAMERA.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.copy(OVERVIEW_CAMERA.target);
    controls.minDistance = 4;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.47;

    // Warm key directional + cool hemisphere fill
    const keyLight = new THREE.DirectionalLight(0xfff2dc, 2.3);
    keyLight.position.set(10, 14, 9);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 36;
      keyLight.shadow.camera.left = -13;
      keyLight.shadow.camera.right = 13;
      keyLight.shadow.camera.top = 11;
      keyLight.shadow.camera.bottom = -11;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdff0ff, 0x3b444f, 0.85);
    scene.add(hemiLight);

    const textures = createKitchenTextures(renderer.capabilities.getMaxAnisotropy());
    const built = buildKitchenScene(textures, !isSoftwareGl);
    scene.add(built.root);

    // Camera transition target state
    let transitionActive = false;
    const goalCamPos = OVERVIEW_CAMERA.position.clone();
    const goalTarget = OVERVIEW_CAMERA.target.clone();

    let rafId = 0;
    let renderScheduled = false;
    let lastTime = performance.now();

    const renderNow = () => {
      renderScheduled = false;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (transitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, goalCamPos.x, 6.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, goalCamPos.y, 6.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, goalCamPos.z, 6.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, goalTarget.x, 6.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, goalTarget.y, 6.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, goalTarget.z, 6.5, dt);

        if (
          camera.position.distanceTo(goalCamPos) < 0.04 &&
          controls.target.distanceTo(goalTarget) < 0.04
        ) {
          camera.position.copy(goalCamPos);
          controls.target.copy(goalTarget);
          transitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (transitionActive) {
        requestRender();
      }
    };

    function requestRender() {
      if (!renderScheduled) {
        renderScheduled = true;
        rafId = window.requestAnimationFrame(renderNow);
      }
    }

    const cancelTransition = () => {
      transitionActive = false;
    };
    controls.addEventListener("start", cancelTransition);
    controls.addEventListener("change", requestRender);

    const applyPreset = (id: StationId) => {
      if (id === "overview") {
        goalCamPos.copy(OVERVIEW_CAMERA.position);
        goalTarget.copy(OVERVIEW_CAMERA.target);
        built.selectionRing.visible = false;
      } else {
        const meta = STATION_METADATA.find((s) => s.id === id);
        if (meta) {
          goalCamPos.set(meta.cameraPos[0], meta.cameraPos[1], meta.cameraPos[2]);
          goalTarget.set(meta.targetPos[0], meta.targetPos[1], meta.targetPos[2]);
          const group = built.stationRoots.get(id);
          if (group) {
            built.selectionRing.position.set(group.position.x, 0.03, group.position.z);
            built.selectionRing.scale.set(meta.ringScale[0], 1, meta.ringScale[1]);
            built.selectionRing.visible = true;
          }
        }
      }
      transitionActive = true;
      lastTime = performance.now();
      requestRender();
    };
    selectPresetRef.current = applyPreset;

    if (initialAutoStart) {
      applyPreset("cooking_line");
    } else {
      renderer.render(scene, camera);
    }

    // Throttled pointer raycasting for hover + click station selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const findHitStation = (
      clientX: number,
      clientY: number,
    ): Exclude<StationId, "overview"> | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const targets = Array.from(built.stationRoots.values());
      const hits = raycaster.intersectObjects(targets, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const st = obj.userData["stationId"] as Exclude<StationId, "overview"> | undefined;
          if (st) return st;
          obj = obj.parent;
        }
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      const hitId = findHitStation(e.clientX, e.clientY);
      const meta = hitId ? STATION_METADATA.find((s) => s.id === hitId) : null;
      renderer.domElement.style.cursor = meta ? "pointer" : "grab";
      setHoveredLabel(meta ? meta.label : null);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return; // Dragged camera orbit, ignore click
      const hitId = findHitStation(e.clientX, e.clientY);
      if (hitId) {
        setSelectedId(hitId);
        applyPreset(hitId);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 320);
      const h = Math.max(entry.contentRect.height, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", cancelTransition);
      controls.removeEventListener("change", requestRender);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      envTarget.dispose();
      textures.dispose();
      built.disposables.geometries.forEach((g) => g.dispose());
      built.disposables.materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      selectPresetRef.current = null;
    };
  }, [initialAutoStart]);

  const activeMeta: StationMeta | null =
    selectedId === "overview" ? null : (STATION_METADATA.find((s) => s.id === selectedId) ?? null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#16222a] text-white select-none">
      {/* Dedicated WebGL Mount Layer */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Minimal Top-Left Station Inspector & Back Link (No backdrop-filter over WebGL) */}
      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex max-w-sm flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/overview"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-[#16222a]/92 px-3 text-xs font-bold text-white transition-colors hover:bg-[#1f313d]"
          >
            <ArrowLeft className="size-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="rounded-xl border border-white/15 bg-[#16222a]/92 px-3 py-1.5 text-xs font-semibold text-slate-200">
            {hoveredLabel ? `Hover: ${hoveredLabel}` : "FoodFlow 3D Twin"}
          </span>
        </div>

        {activeMeta ? (
          <div className="rounded-2xl border border-white/15 bg-[#16222a]/92 p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {activeMeta.zone}
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset("overview")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-300 hover:underline"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </div>
            <h1 className="mt-0.5 font-display text-base font-bold text-white">
              {activeMeta.label}
            </h1>
            <p className="mt-1 text-xs font-semibold text-teal-300">{activeMeta.metric}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{activeMeta.detail}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-[#16222a]/90 px-3.5 py-2.5 text-xs text-slate-200">
            Drag to orbit, scroll to zoom, or click any kitchen station below.
          </div>
        )}
      </div>

      {/* Single Collapsible Bottom Control Dock (<= 14% height, solid rgba, H key toggles) */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 w-auto max-w-[96vw] -translate-x-1/2">
        {dockCollapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockCollapsed(false)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-[#16222a]/92 px-4 text-xs font-bold text-white hover:bg-[#1f313d]"
            >
              <ChevronUp className="size-3.5" />
              <span>Stations (H)</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-[#16222a]/92 px-2.5 py-2 shadow-xl">
            <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap">
              <button
                type="button"
                onClick={() => handleSelectPreset("overview")}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors ${
                  selectedId === "overview"
                    ? "bg-[#087E8B] text-white"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                <Eye className="size-3.5" />
                <span>Overview</span>
              </button>
              {STATION_METADATA.map((station, idx) => {
                const active = selectedId === station.id;
                const shortLabels: Record<typeof station.id, string> = {
                  cooking_line: "Cooking",
                  serving_counter: "Serving",
                  dining_hall: "Dining",
                  cold_store: "Cold / FEFO",
                  qr_kiosk: "QR Gate",
                  waste_station: "Waste",
                };
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleSelectPreset(station.id)}
                    className={`h-8 shrink-0 rounded-xl px-2.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#FF7A1A] text-white"
                        : "bg-white/10 text-slate-200 hover:bg-white/20"
                    }`}
                  >
                    {idx + 1}. {shortLabels[station.id]}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setDockCollapsed(true)}
                aria-label="Hide station dock"
                title="Hide dock (H)"
                className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 hover:bg-white/20"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
