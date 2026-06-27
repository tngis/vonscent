/**
 * Apply SQL migrations in supabase/migrations/* to the database in DATABASE_URL.
 *
 *   node --env-file=.env.local --import tsx scripts/migrate.ts
 *
 * Migrations are idempotent (if-not-exists / duplicate-object guards), so this
 * is safe to re-run. Each file runs in its own transaction, in filename order.
 *
 * Supabase's direct host (db.<ref>.supabase.co) is IPv6-only; if it can't be
 * resolved we transparently fall back to the IPv4 Session pooler, auto-probing
 * the project's region.
 */
import { Client } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL is not set (use --env-file=.env.local).");
  process.exit(1);
}

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const SSL = { rejectUnauthorized: false } as const;

// Common Supabase pooler regions to probe (Session pooler, port 5432, IPv4).
const REGIONS = [
  "ap-southeast-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-southeast-2",
  "ap-south-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "sa-east-1",
];

function isLocal(u: string) {
  return u.includes("localhost") || u.includes("127.0.0.1");
}

async function tryDirect(): Promise<Client | null> {
  const client = new Client({
    connectionString: url,
    ssl: isLocal(url!) ? undefined : SSL,
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    return client;
  } catch {
    await client.end().catch(() => {});
    return null;
  }
}

async function tryPooler(): Promise<Client | null> {
  const u = new URL(url!);
  const m = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (!m) return null;
  const ref = m[1];
  const password = decodeURIComponent(u.password);
  const database = u.pathname.replace(/^\//, "") || "postgres";

  const hosts = REGIONS.flatMap((r) => [
    `aws-0-${r}.pooler.supabase.com`,
    `aws-1-${r}.pooler.supabase.com`,
  ]);

  for (const host of hosts) {
    const client = new Client({
      host,
      port: 5432,
      user: `postgres.${ref}`,
      password,
      database,
      ssl: SSL,
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log(`→ Connected via Session pooler (${host}).`);
      return client;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Only surface non-"tenant not found" errors to cut noise.
      if (!/tenant.*not found/i.test(msg)) console.log(`  ${host}: ${msg}`);
      await client.end().catch(() => {});
    }
  }
  return null;
}

async function main() {
  const client = (await tryDirect()) ?? (await tryPooler());
  if (!client) {
    console.error(
      "✖ Could not connect via direct host or Session pooler.\n" +
        "  Copy the Session pooler URI from the Supabase dashboard\n" +
        "  (Connect → Session pooler) into DATABASE_URL and retry.",
    );
    process.exit(1);
  }

  // Track which migrations have run so re-runs only apply new ones.
  await client.query(
    `create table if not exists _app_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const appliedRes = await client.query<{ name: string }>(
    "select name from _app_migrations",
  );
  const applied = new Set(appliedRes.rows.map((r) => r.name));

  // SQLSTATEs that mean "object already exists" — treat as already-applied
  // (covers triggers/policies from a prior partial run without tracking).
  const DUP_CODES = new Set([
    "42710",
    "42P07",
    "42P06",
    "42723",
    "42701",
    "42P04",
    "42P16",
  ]);

  console.log(`${applied.size} already applied. Checking ${files.length}…\n`);
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• ${file} (skipped)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into _app_migrations(name) values ($1) on conflict do nothing",
        [file],
      );
      await client.query("commit");
      console.log(`✓ ${file}`);
    } catch (err) {
      await client.query("rollback").catch(() => {});
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (DUP_CODES.has(code)) {
        await client.query(
          "insert into _app_migrations(name) values ($1) on conflict do nothing",
          [file],
        );
        console.log(`• ${file} (already applied)`);
        continue;
      }
      console.error(`✖ ${file}`);
      console.error(`  ${err instanceof Error ? err.message : String(err)}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("\n✅ All migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
