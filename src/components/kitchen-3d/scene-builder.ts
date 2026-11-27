import * as THREE from "three";
import type { KitchenTextureSet } from "./textures";

export type StationId =
  | "overview"
  | "cooking_line"
  | "serving_counter"
  | "dining_hall"
  | "cold_store"
  | "qr_kiosk"
  | "waste_station";

export interface StationMeta {
  id: Exclude<StationId, "overview">;
  label: string;
  zone: string;
  metric: string;
  detail: string;
  accentHex: string;
  ringScale: [number, number];
  cameraPos: [number, number, number];
  targetPos: [number, number, number];
}

export const STATION_METADATA: StationMeta[] = [
  {
    id: "cooking_line",
    label: "Hot Cooking Line",
    zone: "Back-of-House Prep",
    metric: "680 / 720 Lunch Portions Active",
    detail:
      "3 induction stockpots on Dal Tadka, Paneer Butter Masala & Basmati Rice. Exhaust hood flow 100%.",
    accentHex: "#ff7a1a",
    ringScale: [1.85, 0.9],
    cameraPos: [-3.5, 4.4, -1.5],
    targetPos: [-6.5, 1.2, -5.2],
  },
  {
    id: "serving_counter",
    label: "Steam Serving Line",
    zone: "Bain-Marie Service",
    metric: "Holding Temp: 67.5°C (FSSAI OK)",
    detail: "4 GN-1/1 chafing wells behind sneeze guard. Peak rush queue ETA 3 min.",
    accentHex: "#087e8b",
    ringScale: [2.0, 0.85],
    cameraPos: [2.2, 3.6, 2.2],
    targetPos: [-1.2, 1.0, -0.8],
  },
  {
    id: "dining_hall",
    label: "Student Dining Hall",
    zone: "North Hall Seating",
    metric: "148 / 240 Seats Occupied",
    detail: "Teakwood 6-seater tables with high-turnover flow and filtered hydration station.",
    accentHex: "#f59e0b",
    ringScale: [2.3, 1.9],
    cameraPos: [9.5, 5.2, 8.5],
    targetPos: [4.2, 0.8, 3.5],
  },
  {
    id: "cold_store",
    label: "Cold Store & FEFO Racks",
    zone: "Walk-In Chiller 4.1°C",
    metric: "Dairy Batch Expiring in 48h",
    detail:
      "FEFO priority crates staged at eye level: 26 L Whole Milk, 18 kg Paneer, 8 kg Spinach.",
    accentHex: "#38bdf8",
    ringScale: [1.95, 1.15],
    cameraPos: [7.8, 4.2, -1.6],
    targetPos: [6.4, 1.4, -5.4],
  },
  {
    id: "qr_kiosk",
    label: "QR Attendance Gate",
    zone: "Entry Turnstile",
    metric: "24 Scans / Min (Offline Ready)",
    detail:
      "Dynamic 60-second rotating pass verification synced to IndexedDB queue & Firestore skips.",
    accentHex: "#16a36a",
    ringScale: [0.85, 0.75],
    cameraPos: [-6.8, 3.3, 8.2],
    targetPos: [-6.2, 1.1, 4.4],
  },
  {
    id: "waste_station",
    label: "Zero-Waste Scale",
    zone: "Plate Return & Weigh-In",
    metric: "5.2% Plate Waste Today (-1.9%)",
    detail: "Dual wet/dry segregation scale tracking leftover rice and prep trimmings.",
    accentHex: "#ef4444",
    ringScale: [1.05, 0.75],
    cameraPos: [-2.4, 3.5, 8.4],
    targetPos: [-1.5, 0.9, 5.2],
  },
];

export const OVERVIEW_CAMERA = {
  position: new THREE.Vector3(12.5, 10.5, 13.5),
  target: new THREE.Vector3(0, 0.9, 0),
};

export interface BuiltKitchenScene {
  root: THREE.Group;
  stationRoots: Map<Exclude<StationId, "overview">, THREE.Group>;
  selectionRing: THREE.Mesh;
  disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };
}

export function buildKitchenScene(
  textures: KitchenTextureSet,
  castShadow: boolean,
): BuiltKitchenScene {
  const root = new THREE.Group();
  const stationRoots = new Map<Exclude<StationId, "overview">, THREE.Group>();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared PBR Materials
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.floorTiles,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7b8b97,
      roughness: 0.82,
      metalness: 0.05,
    }),
  );
  const trimTealMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x087e8b,
      roughness: 0.42,
      metalness: 0.15,
    }),
  );
  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.brushedSteel,
      roughness: 0.34,
      metalness: 0.82,
    }),
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222a30,
      roughness: 0.55,
      metalness: 0.75,
    }),
  );
  const copperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97736,
      roughness: 0.28,
      metalness: 0.88,
    }),
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.teakWood,
      roughness: 0.62,
      metalness: 0.04,
    }),
  );
  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9f3ff,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.38,
    }),
  );
  const curryAmberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.45, metalness: 0.05 }),
  );
  const riceWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf4f0e4, roughness: 0.85, metalness: 0.0 }),
  );
  const greenProduceMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x16a36a, roughness: 0.68, metalness: 0.02 }),
  );
  const dairyBlueMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, metalness: 0.1 }),
  );
  const grainCrateMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65, metalness: 0.05 }),
  );

  // Architectural Ground Slab & Partition Walls
  const floor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 0.24, 16)), floorMat);
  floor.position.set(0, -0.12, 0);
  floor.receiveShadow = castShadow;
  root.add(floor);

  const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 4.4, 0.26)), wallMat);
  backWall.position.set(0, 2.2, -7.85);
  backWall.receiveShadow = castShadow;
  root.add(backWall);

  const sideWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 4.4, 16)), wallMat);
  sideWall.position.set(-10.87, 2.2, 0);
  sideWall.receiveShadow = castShadow;
  root.add(sideWall);

  const dadoBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(21.6, 0.14, 0.3)), trimTealMat);
  dadoBand.position.set(0, 1.35, -7.84);
  root.add(dadoBand);

  const addMesh = (
    parent: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(trackGeo(geo), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = castShadow;
    parent.add(mesh);
    return mesh;
  };

  const registerStation = (id: Exclude<StationId, "overview">, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.userData["stationId"] = id;
    root.add(g);
    stationRoots.set(id, g);
    return g;
  };

  // 1. HOT COOKING LINE (6+ parts)
  const cookGroup = registerStation("cooking_line", -6.5, -5.2);
  addMesh(cookGroup, new THREE.BoxGeometry(5.8, 0.9, 1.5), steelMat, [0, 0.45, 0]);
  addMesh(cookGroup, new THREE.BoxGeometry(5.88, 0.08, 1.58), darkIronMat, [0, 0.92, 0]);
  for (let i = -1; i <= 1; i += 1) {
    const bx = i * 1.75;
    addMesh(cookGroup, new THREE.CylinderGeometry(0.45, 0.48, 0.08, 24), darkIronMat, [
      bx,
      0.98,
      0,
    ]);
    addMesh(cookGroup, new THREE.CylinderGeometry(0.38, 0.34, 0.46, 24), steelMat, [bx, 1.24, 0]);
    addMesh(cookGroup, new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24), copperMat, [bx, 1.03, 0]);
    addMesh(cookGroup, new THREE.CylinderGeometry(0.39, 0.39, 0.05, 24), steelMat, [bx, 1.49, 0]);
    addMesh(cookGroup, new THREE.CylinderGeometry(0.06, 0.05, 0.07, 14), copperMat, [bx, 1.54, 0]);
    addMesh(cookGroup, new THREE.BoxGeometry(0.1, 0.05, 0.14), darkIronMat, [bx - 0.41, 1.32, 0]);
    addMesh(cookGroup, new THREE.BoxGeometry(0.1, 0.05, 0.14), darkIronMat, [bx + 0.41, 1.32, 0]);
  }
  // Overhead exhaust hood & flue ducts
  addMesh(cookGroup, new THREE.BoxGeometry(6.1, 0.55, 1.9), steelMat, [0, 3.05, 0]);
  addMesh(cookGroup, new THREE.BoxGeometry(0.65, 1.2, 0.65), steelMat, [-1.4, 3.85, 0]);
  addMesh(cookGroup, new THREE.BoxGeometry(0.65, 1.2, 0.65), steelMat, [1.4, 3.85, 0]);
  const hoodGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xff9f43,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    }),
  );
  addMesh(cookGroup, new THREE.BoxGeometry(5.5, 0.06, 0.14), hoodGlowMat, [0, 2.76, 0.4]);

  // 2. STEAM SERVING COUNTER (Bain-Marie + Sneeze Guard)
  const serveGroup = registerStation("serving_counter", -1.2, -0.8);
  addMesh(serveGroup, new THREE.BoxGeometry(6.4, 0.92, 1.35), steelMat, [0, 0.46, 0]);
  addMesh(serveGroup, new THREE.BoxGeometry(6.48, 0.07, 0.25), trimTealMat, [0, 0.82, 0.76]);
  // 4 Gastronorm food pans
  const dishMats = [curryAmberMat, riceWhiteMat, curryAmberMat, greenProduceMat];
  for (let i = 0; i < 4; i += 1) {
    const px = -2.1 + i * 1.4;
    addMesh(serveGroup, new THREE.BoxGeometry(1.1, 0.12, 0.82), steelMat, [px, 0.94, 0]);
    addMesh(serveGroup, new THREE.BoxGeometry(0.96, 0.05, 0.68), dishMats[i]!, [px, 0.98, 0]);
  }
  // Sneeze-guard stanchions + tilted glass
  for (const sx of [-2.9, 0, 2.9]) {
    addMesh(serveGroup, new THREE.CylinderGeometry(0.035, 0.035, 0.68, 12), steelMat, [
      sx,
      1.26,
      0.48,
    ]);
  }
  addMesh(
    serveGroup,
    new THREE.BoxGeometry(6.1, 0.56, 0.04),
    glassMat,
    [0, 1.42, 0.28],
    [-0.45, 0, 0],
  );

  // 3. STUDENT DINING HALL (4 Composite Tables + Benches + Trays)
  const diningGroup = registerStation("dining_hall", 4.2, 3.5);
  const tableOffsets: [number, number][] = [
    [-2.1, -1.6],
    [2.1, -1.6],
    [-2.1, 1.7],
    [2.1, 1.7],
  ];
  for (const [tx, tz] of tableOffsets) {
    // Tabletop
    addMesh(diningGroup, new THREE.BoxGeometry(2.6, 0.08, 1.05), woodMat, [tx, 0.76, tz]);
    // 4 steel legs
    for (const lx of [-1.05, 1.05]) {
      for (const lz of [-0.4, 0.4]) {
        addMesh(diningGroup, new THREE.CylinderGeometry(0.035, 0.035, 0.74, 10), darkIronMat, [
          tx + lx,
          0.37,
          tz + lz,
        ]);
      }
    }
    // 2 Benches
    for (const bz of [-0.82, 0.82]) {
      addMesh(diningGroup, new THREE.BoxGeometry(2.35, 0.06, 0.34), woodMat, [tx, 0.44, tz + bz]);
      addMesh(diningGroup, new THREE.BoxGeometry(0.08, 0.42, 0.28), darkIronMat, [
        tx - 0.95,
        0.21,
        tz + bz,
      ]);
      addMesh(diningGroup, new THREE.BoxGeometry(0.08, 0.42, 0.28), darkIronMat, [
        tx + 0.95,
        0.21,
        tz + bz,
      ]);
    }
    // Steel dining thali trays
    addMesh(diningGroup, new THREE.BoxGeometry(0.36, 0.03, 0.28), steelMat, [
      tx - 0.55,
      0.82,
      tz - 0.15,
    ]);
    addMesh(diningGroup, new THREE.BoxGeometry(0.36, 0.03, 0.28), steelMat, [
      tx + 0.45,
      0.82,
      tz + 0.18,
    ]);
  }

  // 4. COLD STORE & FEFO RACKS
  const coldGroup = registerStation("cold_store", 6.4, -5.4);
  // Walk-in chiller box
  addMesh(coldGroup, new THREE.BoxGeometry(3.2, 2.9, 2.4), steelMat, [1.4, 1.45, 0]);
  addMesh(coldGroup, new THREE.BoxGeometry(1.1, 2.25, 0.08), darkIronMat, [1.0, 1.15, 1.22]);
  addMesh(coldGroup, new THREE.BoxGeometry(0.12, 0.45, 0.12), copperMat, [1.4, 1.15, 1.28]);
  addMesh(coldGroup, new THREE.BoxGeometry(0.45, 0.22, 0.06), dairyBlueMat, [1.85, 2.15, 1.22]);
  // FEFO open storage rack beside chiller
  for (const px of [-2.4, -0.7]) {
    for (const pz of [-0.55, 0.55]) {
      addMesh(coldGroup, new THREE.CylinderGeometry(0.04, 0.04, 2.3, 10), steelMat, [px, 1.15, pz]);
    }
  }
  const crateMats = [grainCrateMat, dairyBlueMat, greenProduceMat];
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const sy = 0.45 + shelf * 0.72;
    addMesh(coldGroup, new THREE.BoxGeometry(1.85, 0.06, 1.2), steelMat, [-1.55, sy, 0]);
    addMesh(coldGroup, new THREE.BoxGeometry(0.68, 0.34, 0.85), crateMats[shelf]!, [
      -1.95,
      sy + 0.2,
      0,
    ]);
    addMesh(coldGroup, new THREE.BoxGeometry(0.68, 0.34, 0.85), crateMats[(shelf + 1) % 3]!, [
      -1.15,
      sy + 0.2,
      0,
    ]);
  }

  // 5. QR ATTENDANCE GATE KIOSK
  const qrGroup = registerStation("qr_kiosk", -6.2, 4.4);
  addMesh(qrGroup, new THREE.BoxGeometry(1.8, 0.08, 1.3), darkIronMat, [0, 0.04, 0]);
  addMesh(qrGroup, new THREE.BoxGeometry(0.24, 1.45, 0.24), trimTealMat, [-0.55, 0.76, 0]);
  addMesh(qrGroup, new THREE.BoxGeometry(0.24, 1.05, 0.24), steelMat, [0.55, 0.56, 0]);
  // Turnstile arms
  addMesh(
    qrGroup,
    new THREE.CylinderGeometry(0.03, 0.03, 0.88, 12),
    steelMat,
    [-0.08, 0.92, 0],
    [0, 0, Math.PI / 2],
  );
  // Angled QR Screen head
  const qrScreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.qrScreen,
      emissive: 0x0b3a40,
      emissiveIntensity: 0.4,
      roughness: 0.25,
    }),
  );
  addMesh(
    qrGroup,
    new THREE.BoxGeometry(0.56, 0.42, 0.08),
    darkIronMat,
    [-0.55, 1.58, 0.08],
    [-0.4, 0, 0],
  );
  addMesh(
    qrGroup,
    new THREE.PlaneGeometry(0.46, 0.34),
    qrScreenMat,
    [-0.55, 1.6, 0.125],
    [-0.4, 0, 0],
  );

  // 6. ZERO-WASTE SEGREGATION & WEIGH STATION
  const wasteGroup = registerStation("waste_station", -1.5, 5.2);
  addMesh(wasteGroup, new THREE.BoxGeometry(1.15, 0.1, 0.95), steelMat, [-0.6, 0.05, 0]);
  addMesh(
    wasteGroup,
    new THREE.CylinderGeometry(0.035, 0.035, 1.35, 12),
    steelMat,
    [-1.05, 0.72, -0.35],
  );
  addMesh(wasteGroup, new THREE.BoxGeometry(0.44, 0.24, 0.08), darkIronMat, [-1.05, 1.42, -0.33]);
  // Organic green bin & Dry amber bin
  addMesh(
    wasteGroup,
    new THREE.CylinderGeometry(0.32, 0.26, 0.82, 20),
    greenProduceMat,
    [0.35, 0.41, 0],
  );
  addMesh(
    wasteGroup,
    new THREE.CylinderGeometry(0.32, 0.26, 0.82, 20),
    grainCrateMat,
    [1.15, 0.41, 0],
  );

  // Selection ring grounded at y = 0.03
  const ringGeo = trackGeo(new THREE.RingGeometry(1.75, 1.98, 48));
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff7a1a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.position.set(0, 0.03, 0);
  selectionRing.visible = false;
  root.add(selectionRing);

  return {
    root,
    stationRoots,
    selectionRing,
    disposables: { geometries, materials },
  };
}
