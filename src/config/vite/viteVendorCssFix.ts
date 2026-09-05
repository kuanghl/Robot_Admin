/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-04
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-09-04
 * @FilePath: \Robot_Admin\src\config\vite\viteVendorCssFix.ts
 * @Description: 修复 @robot-admin/naive-ui-components/dist/style.css 的非法 CSS 结构
 *   （拼接产物中 @charset/@import 出现在文件中部，触发 postcss 警告，且 @import 被浏览器忽略）
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Plugin } from 'vite'

/**
 * 上游 style.css 由多个组件 CSS 直接拼接而成，各段自带 @charset，
 * C_Markdown 段还带 @import —— 均位于文件中部，属于非法 CSS。
 * 此处将 @import 提升到文件头、移除中部 @charset，使产物合法。
 * ponytail: vendor 0.11.6 的拼接产物问题；上游修复 dist 后删除本插件即可
 */
const STYLE_CSS_RE = /@robot-admin\/naive-ui-components\/dist\/style\.css/

/**
 *
 */
export default function vendorStyleCssFixPlugin(): Plugin {
  return {
    name: 'vendor-style-css-fix',
    enforce: 'pre',
    /**
     *
     */
    transform(code, id) {
      if (!STYLE_CSS_RE.test(id.split('?')[0])) return

      const imports: string[] = []
      const body = code
        .replace(/@import\s+[^;]+;/g, match => {
          if (!imports.includes(match)) imports.push(match)
          return ''
        })
        .replace(/@charset\s+[^;]+;/g, '')

      return { code: imports.join('') + body, map: null }
    },
  }
}
