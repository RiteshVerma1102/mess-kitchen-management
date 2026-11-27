import * as THREE from "three";

export interface KitchenTextureSet {
  floorTiles: THREE.CanvasTexture;
  brushedSteel: THREE.CanvasTexture;
  teakWood: THREE.CanvasTexture;
  qrScreen: THREE.CanvasTexture;
  dispose: () => void;
}

export function createKitchenTextures(maxAnisotropy: number): KitchenTextureSet {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Commercial kitchen quarry-slate tile map
  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fCtx = floorCanvas.getContext("2d")!;
  fCtx.fillStyle = "#2b363f";
  fCtx.fillRect(0, 0, 512, 512);

  const tiles = 8;
  const step = 512 / tiles;
  for (let y = 0; y < tiles; y += 1) {
    for (let x = 0; x < tiles; x += 1) {
      const tone = 44 + ((x * 7 + y * 13) % 9);
      fCtx.fillStyle = `rgb(${tone}, ${tone + 8}, ${tone + 15})`;
      fCtx.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);
    }
  }
  const floorTiles = new THREE.CanvasTexture(floorCanvas);
  floorTiles.colorSpace = THREE.SRGBColorSpace;
  floorTiles.wrapS = THREE.RepeatWrapping;
  floorTiles.wrapT = THREE.RepeatWrapping;
  floorTiles.repeat.set(6, 5);
  floorTiles.anisotropy = anisotropy;

  // 2. Brushed stainless steel map
  const steelCanvas = document.createElement("canvas");
  steelCanvas.width = 256;
  steelCanvas.height = 256;
  const sCtx = steelCanvas.getContext("2d")!;
  sCtx.fillStyle = "#c9d2da";
  sCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    const shade = 190 + ((y * 19) % 26);
    sCtx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
    sCtx.fillRect(0, y, 256, 1);
  }
  const brushedSteel = new THREE.CanvasTexture(steelCanvas);
  brushedSteel.colorSpace = THREE.SRGBColorSpace;
  brushedSteel.wrapS = THREE.RepeatWrapping;
  brushedSteel.wrapT = THREE.RepeatWrapping;
  brushedSteel.anisotropy = anisotropy;

  // 3. Warm teakwood dining table grain
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext("2d")!;
  wCtx.fillStyle = "#96613a";
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 64; i += 1) {
    const y = i * 4;
    const r = 136 + ((i * 11) % 24);
    const g = 84 + ((i * 7) % 16);
    const b = 48 + ((i * 5) % 12);
    wCtx.fillStyle = `rgb(${r},${g},${b})`;
    wCtx.fillRect(0, y, 256, 3);
  }
  const teakWood = new THREE.CanvasTexture(woodCanvas);
  teakWood.colorSpace = THREE.SRGBColorSpace;
  teakWood.wrapS = THREE.RepeatWrapping;
  teakWood.wrapT = THREE.RepeatWrapping;
  teakWood.anisotropy = anisotropy;

  // 4. QR Scanner kiosk face texture
  const qrCanvas = document.createElement("canvas");
  qrCanvas.width = 128;
  qrCanvas.height = 128;
  const qCtx = qrCanvas.getContext("2d")!;
  qCtx.fillStyle = "#0b2228";
  qCtx.fillRect(0, 0, 128, 128);
  qCtx.fillStyle = "#d9f5ee";
  qCtx.fillRect(16, 16, 96, 96);
  qCtx.fillStyle = "#087e8b";
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 6; c += 1) {
      if ((r + c) % 2 === 0 || (r === 0 && c === 0) || (r === 5 && c === 5)) {
        qCtx.fillRect(24 + c * 13, 24 + r * 13, 10, 10);
      }
    }
  }
  const qrScreen = new THREE.CanvasTexture(qrCanvas);
  qrScreen.colorSpace = THREE.SRGBColorSpace;
  qrScreen.anisotropy = anisotropy;

  return {
    floorTiles,
    brushedSteel,
    teakWood,
    qrScreen,
    dispose: () => {
      floorTiles.dispose();
      brushedSteel.dispose();
      teakWood.dispose();
      qrScreen.dispose();
    },
  };
}
