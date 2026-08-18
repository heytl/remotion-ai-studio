import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion 的渲染/打包库是重量级 Node 依赖，必须在服务端作为外部包引用，
  // 否则 Next.js 会尝试把它们打进 server bundle 导致构建失败。
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // 显式声明 @ 别名（指向项目根目录），避免个别构建环境未读取 tsconfig paths 导致
    // "Module not found: Can't resolve '@/...'" 的构建失败。
    config.resolve.alias['@'] = path.resolve(process.cwd());
    return config;
  },
};

export default nextConfig;
