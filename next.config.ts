import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB uses native binaries — must not be bundled by webpack
  serverExternalPackages: ["@duckdb/node-api"],
  // Allow access from LAN addresses (e.g. 192.168.x.x, 10.x.x.x) during dev
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
