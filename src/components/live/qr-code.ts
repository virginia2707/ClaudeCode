/**
 * Générateur de QR code autonome (version 4, correction L, encodage octet,
 * masque 0). Évite une dépendance externe pour une fonction d'affichage.
 * Capacité : 78 octets, suffisant pour une URL de session.
 */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

function generatorPoly(degree: number) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1);
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data: number[], ecCount: number) {
  const gen = generatorPoly(ecCount);
  const res = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecCount; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

const SIZE = 33; // version 4
const DATA_BYTES = 80;
const EC_BYTES = 20;
const ALIGN_POS = [6, 26];

function buildMatrix(bits: number[]) {
  // null = libre, 2 = réservé (format), 0/1 = module fixe
  const modules: (number | null)[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
  const put = (r: number, c: number, v: number) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) modules[r][c] = v;
  };

  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const dark = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        put(row + r, col + c, dark ? 1 : 0);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, SIZE - 7);
  placeFinder(SIZE - 7, 0);

  for (let i = 8; i < SIZE - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0;
    if (modules[6][i] === null) modules[6][i] = v;
    if (modules[i][6] === null) modules[i][6] = v;
  }

  const last = ALIGN_POS[ALIGN_POS.length - 1];
  for (const ar of ALIGN_POS) {
    for (const ac of ALIGN_POS) {
      if ((ar === 6 && ac === 6) || (ar === 6 && ac === last) || (ar === last && ac === 6)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          put(ar + r, ac + c, Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0);
        }
      }
    }
  }
  put(SIZE - 8, 8, 1); // module sombre obligatoire

  for (let i = 0; i < 9; i++) {
    if (modules[8][i] === null) modules[8][i] = 2;
    if (modules[i][8] === null) modules[i][8] = 2;
  }
  for (let i = 0; i < 8; i++) {
    if (modules[8][SIZE - 1 - i] === null) modules[8][SIZE - 1 - i] = 2;
    if (modules[SIZE - 1 - i][8] === null) modules[SIZE - 1 - i][8] = 2;
  }

  let bitIndex = 0;
  let upward = true;
  for (let colPair = SIZE - 1; colPair > 0; colPair -= 2) {
    const col = colPair === 6 ? colPair - 1 : colPair;
    for (let i = 0; i < SIZE; i++) {
      const row = upward ? SIZE - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (modules[row][c] !== null) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex] : 0;
        bitIndex++;
        modules[row][c] = (row + c) % 2 === 0 ? bit ^ 1 : bit; // masque 0
      }
    }
    upward = !upward;
  }

  // Information de format : niveau L (01) + masque 0, protégée par BCH(15,5).
  const formatData = 0b01000;
  let rem = formatData << 10;
  for (let i = 4; i >= 0; i--) if (rem & (1 << (i + 10))) rem ^= 0b10100110111 << i;
  const format = ((formatData << 10) | rem) ^ 0b101010000010010;
  const fbits = Array.from({ length: 15 }, (_, i) => (format >> (14 - i)) & 1);

  for (let i = 0; i <= 5; i++) modules[8][i] = fbits[i];
  modules[8][7] = fbits[6];
  modules[8][8] = fbits[7];
  modules[7][8] = fbits[8];
  for (let i = 9; i < 15; i++) modules[14 - i][8] = fbits[i];
  for (let i = 0; i < 8; i++) modules[SIZE - 1 - i][8] = fbits[i];
  for (let i = 8; i < 15; i++) modules[8][SIZE - 15 + i] = fbits[i];

  return modules.map((row) => row.map((v) => (v === 2 || v === null ? 0 : v)));
}

/** Matrice de modules (1 = sombre) encodant `text`. */
export function qrMatrix(text: string): number[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > DATA_BYTES - 2) throw new Error("Contenu trop long pour un QR code version 4");

  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4); // mode octet
  push(bytes.length, 8); // compteur de caractères (versions 1 à 9)
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, DATA_BYTES * 8 - bits.length)); // terminateur
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  const pad = [0xec, 0x11];
  let p = 0;
  while (data.length < DATA_BYTES) data.push(pad[p++ % 2]);

  const ec = reedSolomon(data, EC_BYTES);
  const finalBits: number[] = [];
  for (const byte of [...data, ...ec]) for (let i = 7; i >= 0; i--) finalBits.push((byte >> i) & 1);

  return buildMatrix(finalBits);
}
