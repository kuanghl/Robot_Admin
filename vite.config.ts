/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-03-30 17:45:29
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-11-05
 * @FilePath: \Robot_Admin\vite.config.ts
 * @Description: 基于 Vite 8 (Rolldown/Oxc) 的优化配置
 * Copyright (c) 2025 by CHENY, All Rights Reserved 😎.
 */

import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type PluginOption, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import Unocss from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import preloader from 'vite-plugin-preloader'

import {
  viteConsolePlugin,
  vendorStyleCssFixPlugin,
  viteAutoImportPlugin,
  viteComponentsPlugin,
  resolveConfig,
  serverConfig,
  buildConfig,
  createI18nPlugin,
  createVuePluginOptions,
} from './src/config/vite/index.ts'
import { HEAVY_PAGE_ROUTES } from './src/config/heavyPages.ts'


/**
 * 组件库全部 C_* 子路径导出（从 dist 扫描，随包版本自动更新）。
 * Vite 8 的依赖扫描不跟随 dynamicRouter 的 import.meta.glob 懒路由，
 * 进入演示页才会运行时发现这些依赖 → 触发整页 reload → 打断 SPA 导航。
 * 启动时全部预构建可消除该问题（本地源码模式走 alias，跳过）。
 */
const cComponentDeps = (() => {
  if (
    process.env.USE_LOCAL_COMPONENTS === 'true' ||
    process.env.USE_LOCAL_PACKAGES === 'true'
  )
    return []
  const dist = fileURLToPath(
    new URL(
      './node_modules/@robot-admin/naive-ui-components/dist',
      import.meta.url
    )
  )
  if (!existsSync(dist)) return []
  return readdirSync(dist)
    .filter(f => /^C_.*\.js$/.test(f))
    .map(f => `@robot-admin/naive-ui-components/${f.replace(/\.js$/, '')}`)
})()

export default defineConfig(async ({ mode, command }: { mode: string; command: string }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [
      vendorStyleCssFixPlugin(),
      viteConsolePlugin,
      Unocss(),
      vue(createVuePluginOptions()),
      vueJsx(),
      ...(process.env.VITE_DEVTOOLS === 'true' ? [vueDevTools()] : []),
      Icons({ autoInstall: true }),
      viteAutoImportPlugin,
      viteComponentsPlugin,
      // ⚡ preloader 仅在开发环境启用（生产环境 import() 无法加载原始 .vue 源文件）
      ...(command === 'serve'
        ? [
            preloader({
              routes: HEAVY_PAGE_ROUTES,
            }),
          ]
        : []),
      createI18nPlugin(),
      ...(process.env.ANALYZE
        ? [
            (await import('rollup-plugin-visualizer')).visualizer({
              filename: 'dist/report.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
            }) as PluginOption,
          ]
        : []),
    ].filter(Boolean),

    resolve: resolveConfig,

    optimizeDeps: {
      // ✅ 预构建大型依赖以提升启动速度
      // dev:components 模式下组件库走本地源码，不能预构建
      include: [
        'naive-ui',
        ...(process.env.USE_LOCAL_COMPONENTS === 'true'
          ? []
          : ['@robot-admin/naive-ui-components', ...cComponentDeps]),
        'vue-router',
        'pinia',
        '@vueuse/core',
        'echarts/core',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        '@antv/x6',
        'axios',
      ],
      // 🔧 排除 Vue 全家桶：预构建时会将 Vue 内部模块拆成多个共享 chunk，
      // 导致 RefImpl / isFunction 等内部符号跨 chunk 引用断裂。
      // Vite 8 使用 Rolldown 替代 esbuild 预构建，保留排除以确保稳定性。
      exclude: [
        'vue',
        '@vue/shared',
        '@vue/reactivity',
        '@vue/runtime-core',
        '@vue/runtime-dom',
        '@vue/compiler-dom',
        '@vue/compiler-core',
        '@vue/compiler-sfc',
        'pinia-plugin-persistedstate',
      ],
    },

    server: serverConfig,
    build: buildConfig,

  }
})
