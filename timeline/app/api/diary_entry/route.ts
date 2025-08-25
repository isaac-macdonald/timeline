import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const entry = await sql`SELECT * FROM diary_entries WHERE id = ${id} AND "userId" = ${userId}`;

  if (entry.length === 0) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(entry[0]);
}

export async function POST(request: Request) {
  const { message, date, userId, colour } = await request.json();

  try {
    const inserted = await sql`
      INSERT INTO diary_entries (user_id, entry_datetime, message, colour)
      VALUES (${userId}, ${date}, ${message}, ${colour})
      RETURNING *;
    `;
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Insert entry error:", error);
    return NextResponse.json({ error: "Failed to insert entry" }, { status: 500 });
  }
}