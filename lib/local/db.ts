import path from "path";
import { DuckDBInstance, type DuckDBValue } from "@duckdb/node-api";

const DB_PATH = path.resolve(process.cwd(), "wdidata/wdi.duckdb");

let instancePromise: Promise<DuckDBInstance> | null = null;

function getInstance(): Promise<DuckDBInstance> {
  if (!instancePromise) {
    instancePromise = DuckDBInstance.create(DB_PATH, { access_mode: "READ_ONLY" });
  }
  return instancePromise;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: DuckDBValue[] = []
): Promise<T[]> {
  const instance = await getInstance();
  const conn = await instance.connect();
  try {
    const reader = await conn.runAndReadAll(sql, params.length ? params : undefined);
    return reader.getRowObjects() as T[];
  } finally {
    conn.closeSync();
  }
}
