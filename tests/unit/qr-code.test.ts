import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { qrMatrix } from "@/components/live/qr-code";

/**
 * Vérifie le générateur de QR code avec un décodeur indépendant (jsQR) :
 * la matrice est rasterisée à l'échelle 4 puis décodée.
 */
function decode(text: string): string | null {
  const matrix = qrMatrix(text);
  const quiet = 4;
  const scale = 4;
  const modules = matrix.length;
  const size = (modules + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (!matrix[r][c]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = (c + quiet) * scale + dx;
          const y = (r + quiet) * scale + dy;
          const i = (y * size + x) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
    }
  }
  return jsQR(data, size, size)?.data ?? null;
}

describe("générateur de QR code", () => {
  it("produit une matrice 33x33 (version 4)", () => {
    const m = qrMatrix("https://escapeclass.dev/join/X7K9P2");
    expect(m).toHaveLength(33);
    expect(m[0]).toHaveLength(33);
  });

  it("encode une URL de session décodable par jsQR", () => {
    const url = "https://escapeclass.dev/join/X7K9P2";
    expect(decode(url)).toBe(url);
  });

  it("encode une URL locale décodable", () => {
    const url = "http://localhost:3000/join/K7P4X9";
    expect(decode(url)).toBe(url);
  });

  it("encode une URL longue décodable", () => {
    const url = "https://formation.exemple-organisme.fr/join/ABCDEF";
    expect(decode(url)).toBe(url);
  });

  it("refuse un contenu trop long pour la version 4", () => {
    expect(() => qrMatrix("x".repeat(100))).toThrow();
  });
});
