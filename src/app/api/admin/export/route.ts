import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCsvStream, buildJson, fetchExportData, parseExportRange } from "@/lib/export";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const filter = parseExportRange(url.searchParams);
  const weeks = await fetchExportData(filter);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const body = JSON.stringify(buildJson(weeks), null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="weekly-report-${stamp}.json"`,
      },
    });
  }

  const stream = buildCsvStream(weeks);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weekly-report-${stamp}.csv"`,
    },
  });
}
