/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Modeを無効化（開発時の二重レンダリングを防ぐ）
  reactStrictMode: false,
  
  // 画像の最適化
  images: {
    domains: [],
  },
  
  // 実験的機能
  experimental: {
    // Partial Prerenderingを有効化
    ppr: false,
    // 最適化されたパッケージインポート
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot'],
  },
  
  // Webpack設定の最適化
  webpack: (config, { dev, isServer }) => {
    // 開発環境での最適化
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig