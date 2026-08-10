import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript 5.9 exposes the compiler API; avoid the CLI config parser in
  // this Next.js release, which cannot consume its `--showConfig` output.
  experimental: {
    useTypeScriptCli: false
  }
};

export default nextConfig;
