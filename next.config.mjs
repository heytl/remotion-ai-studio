/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion 的渲染/打包库是重量级 Node 依赖，必须在服务端作为外部包引用，
  // 否则 Next.js 会尝试把它们打进 server bundle 导致构建失败。
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
