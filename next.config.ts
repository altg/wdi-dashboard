import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB uses native binaries — must not be bundled by webpack
  serverExternalPackages: ["@duckdb/node-api"],
};

export default nextConfig;
