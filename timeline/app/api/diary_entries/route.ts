import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  const entries = await sql`SELECT * FROM diary_entries WHERE "user_id" = ${userId}`;

  if (entries.length === 0) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(entries);
}