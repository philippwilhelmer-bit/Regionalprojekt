import { NextRequest } from "next/server";
import { listBezirke } from "@/lib/content/bezirke";
import { listArticlesReader } from "@/lib/content/articles";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const slugs = sp.get("bezirkSlugs")?.split(",").filter(Boolean) ?? [];
  const limit = parseInt(sp.get("limit") ?? "20", 10);
  const offset = parseInt(sp.get("offset") ?? "0", 10);

  let bezirkIds: number[] | undefined;
  if (slugs.length > 0) {
    const all = await listBezirke();
    bezirkIds = all.filter((b) => slugs.includes(b.slug)).map((b) => b.id);
  }

  const articles = await listArticlesReader({ bezirkIds, limit, offset });
  return Response.json(articles);
}
