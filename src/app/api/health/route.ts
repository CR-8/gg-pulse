import { connectDB } from "@/lib/db";

/** Liveness + database reachability for the load balancer / uptime monitor. No data is returned. */
export async function GET() {
  try {
    const conn = await connectDB();
    await conn.connection.db?.admin().ping();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
