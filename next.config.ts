import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Node 25 on Windows is currently more reliable here when Next uses a
    // single worker-thread based build pipeline instead of child-process fans.
    cpus: 1,
    workerThreads: true,
  },
};

export default nextConfig;
