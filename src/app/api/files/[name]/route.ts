import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

// Les fichiers sont servis avec un nom aléatoire non devinable. Les fichiers
// d'énigme sont référencés par les jeux ; les rendre publics par URL permet
// aux apprenants (sans compte) de les télécharger pendant une session.
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[name]">) {
  const { name } = await ctx.params;
  const upload = await prisma.upload.findUnique({ where: { storedName: name }, select: { mime: true, originalName: true } });
  if (!upload) return new NextResponse("Not found", { status: 404 });
  const file = await storage.read(name);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const inline = upload.mime.startsWith("image/") || upload.mime === "application/pdf";
  const safeName = encodeURIComponent(upload.originalName);
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": upload.mime === "image/svg+xml" ? "image/svg+xml" : upload.mime,
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safeName}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      ...(upload.mime === "image/svg+xml" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
    },
  });
}
