import pkg from '../package.json'

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC'

const containerStyle = [
  'margin: 12px 0;',
  'padding: 16px 20px;',
  'border: 1px solid var(--k-color-border, rgba(127, 127, 127, 0.25));',
  'border-radius: 13px;',
  'background: var(--k-card-bg, rgba(127, 127, 127, 0.04));',
  'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);',
  'color: var(--k-text-dark, inherit);',
  'line-height: 1.6;',
].join('')

const detailsStyle = [
  'margin: 12px 0;',
  'border: 1px solid var(--k-color-border, rgba(127, 127, 127, 0.3));',
  'border-radius: 10px;',
  'background: var(--k-card-bg, rgba(127, 127, 127, 0.03));',
  'overflow: hidden;',
  'box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);',
  'transition: border-color .2s ease, background-color .2s ease;',
].join('')

const summaryStyle = [
  'padding: 10px 14px;',
  'background: var(--k-hover-bg, rgba(127, 127, 127, 0.09));',
  'color: var(--k-text-dark, inherit);',
  'cursor: pointer;',
  'user-select: none;',
  'font-size: 14.5px;',
].join('')

const detailsBodyStyle = [
  'padding: 12px 16px 14px;',
  'border-top: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.2));',
  'background: var(--k-card-bg, transparent);',
  'color: var(--k-text-dark, inherit);',
  'line-height: 1.65;',
].join('')

export const usage = `
<div style="${containerStyle}">

  <h1 style="margin: 0 0 8px 0; color: #00AEEC; font-size: 22px; display: flex; align-items: center; gap: 8px;">
    <span>🎵</span> Koishi 插件：术力口周榜 billboard-data
  </h1>
  <div style="font-size: 13.5px; opacity: 0.85; margin-bottom: 12px;">
    🎯 <b>插件版本：</b><code>v${pkg.version}</code>
  </div>

  <p style="margin: 10px 0;">
    <a href="https://www.npmjs.com/package/koishi-plugin-billboard-data" target="_blank">
      <img src="https://img.shields.io/npm/v/koishi-plugin-billboard-data?style=flat-square&logo=npm" alt="npm version">
    </a>
    <a href="https://npm-stat.com/charts.html?package=koishi-plugin-billboard-data" target="_blank">
      <img src="https://img.shields.io/npm/dm/koishi-plugin-billboard-data?style=flat-square&logo=npm" alt="npm downloads">
    </a>
    <br>
    <a href="https://github.com/VincentZyuApps/koishi-plugin-billboard-data" target="_blank">
      <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
    </a>
    <a href="https://gitee.com/vincent-zyu/koishi-plugin-billboard-data" target="_blank">
      <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
    </a>
    <br>
    <a href="https://qm.qq.com/q/ZHj33L5cuC" target="_blank">
      <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
    </a>
  </p>

  <h2 style="margin: 18px 0 8px 0; font-size: 16px; border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.2)); padding-bottom: 6px;">
    💬 交流反馈
  </h2>
  <p style="margin: 4px 0;">💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b style="color: #12B7F5;">1085190201</b> 🎉</p>
  <p style="margin: 4px 0;">💡 在群里直接艾特我，回复的更快哦~ ✨</p>

  <blockquote style="margin: 14px 0; padding: 10px 14px; border-left: 5px solid #00AEEC; border-radius: 6px; background: rgba(0, 174, 236, 0.08); line-height: 1.6;">
    <b style="color: #00AEEC;">💡 双源数据体系与致谢：</b><br>
    • <b>Bilibili 本土周榜：</b>来源于 B 站 <a href="https://space.bilibili.com/3493269493907727/article" target="_blank" style="color: #00AEEC; font-weight: bold; text-decoration: underline;">@Bili-Board_Atel（点击直达B站专栏）</a>（Bilibili Vocaloid Songs 周榜 TOP20 专栏，示例：<code>Bili_Board术力口周榜第122期2026年10月7日第40周</code>）。<br>
    • <b>Niconico 日本周榜：</b>来源于 B 站 <a href="https://space.bilibili.com/5937105/article" target="_blank" style="color: #FB7299; font-weight: bold; text-decoration: underline;">@Elvansphere（点击直达B站专栏）</a>（Niconico Vocaloid Songs 周榜 TOP20 专栏，示例：<code>【2026/10/07】ニコニコ VOCALOID SONGS TOP20</code>，由 Billboard JAPAN 与 ニコニコ 官方合作出品）。<br>
    支持 <a href="src/crawler" style="color: #00AEEC; font-weight: bold; text-decoration: underline;">插件本地原生爬取</a> 或 <a href="https://github.com/VincentZyuApps/billboard-data" target="_blank" style="color: #00AEEC; font-weight: bold;">GitHub 官方归档仓库</a> / <a href="https://cdn.jsdelivr.net/gh/VincentZyuApps/billboard-data@main/data/niconico/index.json" target="_blank" style="color: #00AEEC; font-weight: bold;">jsDelivr CDN</a> 静态数据源，每周定时归档同步。
  </blockquote>

  <!-- 折叠区域 1 -->
  <details style="${detailsStyle}">
    <summary style="${summaryStyle}"><b style="color: #00AEEC;">🎨 渲染引擎与排版指南（Takumi / Puppeteer / QQ Markdown）</b></summary>
    <div style="${detailsBodyStyle}">
      <p style="margin: 4px 0;"><b>⚡ Takumi WASM 渲染出图：</b>基于 Rust/WASM 的轻量化渲染引擎，开箱即用，支持 <code>takumiScale</code> 放大倍率（默认 1.5 倍高清输出），适配移动端高分屏。</p>
      <p style="margin: 4px 0;"><b>🎨 Puppeteer 网页出图：</b>高保真海报级渲染，需要 Koishi 加载 <code>puppeteer</code> 服务。能完美呈现圆角、多重阴影与微缩歌曲封面。</p>
      <p style="margin: 4px 0;"><b>💫 QQ 原生 Markdown：</b>在 QQ 官bot 平台原生下发图文卡片与紧凑表格，支持蓝字外部跳转至 B 站原专栏或直达原视频。已拆分为 <code>md-style</code>（流式卡片风格）与 <code>md-table</code>（紧凑表格模式），两者均受 <code>qqMarkdownDetailedMode</code> 控制（<code>standard</code> 模式下表格展开为 4 列含歌曲与直达播放/原视频/创作者/时长与六维播放指标，卡片展示六维数据；<code>simple</code> 模式下表格为 3 列极简呈现，卡片仅保留核心链接）。</p>
      <p style="margin: 4px 0;"><b>📤 自由多选输出：</b>可在「消息输出格式」列表中自由勾选需要的格式（纯文本、Takumi 看板、Puppeteer 海报、QQ md-style、QQ md-table），满足多场景需求。</p>


    </div>
  </details>

  <!-- 折叠区域 2 -->
  <details style="${detailsStyle}">
    <summary style="${summaryStyle}"><b style="color: #00AEEC;">🕷️ 本地爬虫、7 层容灾矩阵与智能缓存</b></summary>
    <div style="${detailsBodyStyle}">
      <p style="margin: 4px 0;"><b>🕷️ 本地原生爬取：</b>内置轻量级纯 TypeScript 爬虫，可直接解析 <a href="https://space.bilibili.com/3493269493907727/article" target="_blank" style="color: #00AEEC; text-decoration: underline;">@Bili-Board_Atel</a> 与 <a href="https://space.bilibili.com/5937105/article" target="_blank" style="color: #FB7299; text-decoration: underline;">@Elvansphere</a> 的 B站动态专栏，无需等待 GitHub Action 定时归档即可秒查最新榜单！</p>
      <p style="margin: 4px 0;"><b>🛡️ 7 层容灾流水线 (dataSourceList)：</b>预设 3 列表格（enabled / mode / network），已有 本地爬虫+公网gh代理+本地自定义代理 7层默认容灾兜底。当非 GitHub 模式误选 ghproxy 时将自动平滑回退为原生直连。</p>
      <p style="margin: 4px 0;"><b>💾 Database / 内存智能缓存：</b>支持通过 Koishi <code>database</code> 服务或纯内存 Map 持久化周榜数据（默认缓存 10 小时）。</p>
      <p style="margin: 4px 0;"><b>🕒 周三 19:00 智能失效：</b>当跨越每周三 19:00（出榜时间节点）时，会自动令最新一期缓存失效，确保第一时间抓取当周新鲜榜单！</p>
      <p style="margin: 4px 0;"><b>❄️ 冷启动回溯与本地镜像：</b>开启 <code>enableBackfill</code> 时，首次启动可自动按稳定链路将 GitHub 历史全量数据同步入库；开启 <code>enableLocalBackup</code> 会在 <code>data/billboard-data/</code> 额外保存一份本地 JSON 作为运维查阅 bonus。</p>
    </div>
  </details>

  <!-- 折叠区域 3 -->
  <details style="${detailsStyle}">
    <summary style="${summaryStyle}"><b style="color: #00AEEC;">⏱️ 渲染耗时、尝试源统计与等待提示</b></summary>
    <div style="${detailsBodyStyle}">
      <p style="margin: 4px 0;"><b>⏳ 等待提示与自动撤回：</b>开启 <code>enableWaitingHint</code> 后，发起周榜指令时会立刻发送「正在获取并渲染周榜数据，请稍候...」，待最终文本或图片发送完成后，将自动撤回该提示消息。</p>
      <p style="margin: 4px 0;"><b>📊 统计指标展示：</b>提供 4 项独立的 <code>showRenderInfo</code> 开关。开启后会在输出结果后追加展示：
        <code>⏱️ API 请求: xx ms (尝试源: x) | 🎨/⚡ 渲染: xx ms | 📊 总耗时: xx ms</code>，精准反映拉取与渲染性能。</p>
    </div>
  </details>

  <!-- 折叠区域 4 -->
  <details style="${detailsStyle}">
    <summary style="${summaryStyle}"><b style="color: #00AEEC;">📢 每周新榜自动广播推送 (Cron / 轮询)</b></summary>
    <div style="${detailsBodyStyle}">
      <p style="margin: 4px 0;"><b>🔔 自动检测与 Cron 调度：</b>支持为每个群组单独配置专属 <code>cron</code> 定时表达式（基于 Koishi <code>cron</code> 可选服务），同时也支持传统的 <code>checkInterval</code> 周期性轮询。</p>
      <p style="margin: 4px 0;"><b>🎯 全局推送源与目标表格：</b>在表格上方通过 <code>broadcastSources</code> 全局多选榜单源（B站 / N站），下方 <code>broadcastTargets</code> 仅需配置平台、Bot selfId（留空匹配所有）、群号与专属 Cron，简洁高效！</p>
    </div>
  </details>

  <!-- 折叠区域 5 -->
  <details style="${detailsStyle}">
    <summary style="${summaryStyle}"><b style="color: #00AEEC;">⚡ 单一格式覆盖参数 (-f / --format) 与子指令重定向机制</b></summary>
    <div style="${detailsBodyStyle}">
      <p style="margin: 4px 0;"><b>🎯 -f / --format 参数：</b>配置项 <code>outputFormats</code> 决定了默认的多选输出模式（可一次性同时发送文本、图片与 QQ Markdown）。当临时只想返回某种特定格式时，无需修改配置，在指令后追加 <code>-f &lt;format&gt;</code> 即可临时覆盖全局配置，本次<b>仅返回指定的单一格式</b>：</p>
      <ul style="margin: 6px 0; padding-left: 20px;">
        <li><code>bb -f text</code> 或 <code>bb -f txt</code>：本次仅输出纯文本周榜</li>
        <li><code>bb -f takumi</code> 或 <code>bb -f wasm</code>：本次仅输出 Takumi WASM 渲染看板图片</li>
        <li><code>bb -f pptr</code> 或 <code>bb -f web</code>：本次仅输出 Puppeteer 网页精美海报图片</li>
        <li><code>bb -f md-style</code> 或 <code>bb -f card</code>：本次仅输出 QQ 原生 Markdown 流式卡片（仅限 QQ 官bot 平台）</li>
        <li><code>bb -f md-table</code> 或 <code>bb -f table</code>：本次仅输出 QQ 原生 Markdown 紧凑表格（仅限 QQ 官bot 平台）</li>
      </ul>
      <p style="margin: 6px 0 4px 0;"><b>🔄 session.execute 专属子指令重定向：</b>为提供极致便捷的交互，插件基于 <code>session.execute</code> 重定向机制内置了 5 大格式的快捷子指令，底层完全共享主指令流水线，自动继承 <code>-s</code> 榜单源、<code>-n</code> 数量截取与临时等待提示自动撤回机制：</p>
      <ul style="margin: 6px 0; padding-left: 20px;">
        <li><code>bb.text [期数]</code>（别名 <code>周榜.text</code>、<code>周榜文本</code>）➔ <code>bb -f text</code></li>
        <li><code>bb.takumi [期数]</code>（别名 <code>周榜.takumi</code>、<code>周榜takumi</code>）➔ <code>bb -f takumi</code></li>
        <li><code>bb.pptr [期数]</code>（别名 <code>bb.puppeteer</code>、<code>周榜.pptr</code>、<code>周榜海报</code>）➔ <code>bb -f puppeteer</code></li>
        <li><code>bb.md-style [期数]</code>（别名 <code>周榜.md-style</code>、<code>周榜卡片</code>，仅限 QQ 官bot 平台）➔ <code>bb -f md-style</code></li>
        <li><code>bb.md-table [期数]</code>（别名 <code>周榜.md-table</code>、<code>周榜表格</code>，仅限 QQ 官bot 平台）➔ <code>bb -f md-table</code></li>
      </ul>
      <p style="margin: 4px 0;">💡 <b>提示：</b>所有子指令均支持继续追加 <code>-s nico</code> 或 <code>-n 20</code>，例如输入 <code>bb.pptr -s nico 188</code> 即可直接以网页海报形式查看第 188 期 N 站周榜！</p>
    </div>
  </details>

  <h3 style="margin: 16px 0 6px 0; font-size: 15px;">📌 常用指令速查</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; line-height: 1.5; border: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.2)); border-radius: 8px; overflow: hidden;">
    <thead>
      <tr style="background: var(--k-hover-bg, rgba(127, 127, 127, 0.1)); text-align: left;">
        <th style="padding: 8px 12px; border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.2)); width: 36%;">指令</th>
        <th style="padding: 8px 12px; border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.2));">说明</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb [期数]</code></td>
        <td style="padding: 6px 12px;">查看最新或指定期数周榜（默认按后台配置输出）</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb -s nico</code></td>
        <td style="padding: 6px 12px;">查看日本 N站 VOCALOID TOP20 最新周榜</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb -f takumi</code></td>
        <td style="padding: 6px 12px;">临时指定仅输出 Takumi 看板图 (支持 text/takumi/pptr/md-style/md-table)</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>周榜b</code> / <code>bbb [期数]</code></td>
        <td style="padding: 6px 12px;">快捷查看 B站本土周榜</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>周榜n</code> / <code>nbb [期数]</code></td>
        <td style="padding: 6px 12px;">快捷查看 N站日本周榜</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.text</code> / <code>bb.pptr</code></td>
        <td style="padding: 6px 12px;">快捷子指令：仅输出纯文本 / 仅输出海报出图</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.md-style</code></td>
        <td style="padding: 6px 12px;">快捷子指令：仅输出 QQ Markdown 卡片 (仅限 QQ 官bot 平台)</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.md-table</code></td>
        <td style="padding: 6px 12px;">快捷子指令：仅输出 QQ Markdown 表格 (仅限 QQ 官bot 平台)</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb -n 20</code></td>
        <td style="padding: 6px 12px;">展示 TOP 20</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.history</code></td>
        <td style="padding: 6px 12px;">查看近期收录的周榜期数总览（支持 -s 参数）</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.search &lt;歌名&gt;</code></td>
        <td style="padding: 6px 12px;">检索某首歌曲在近期周榜中的排位战绩（支持 -s 参数）</td>
      </tr>
      <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.reload</code></td>
        <td style="padding: 6px 12px;">管理员强制刷新数据缓存</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><code>bb.help</code></td>
        <td style="padding: 6px 12px;">查看周榜详细帮助与选项说明</td>
      </tr>
    </tbody>
  </table>

</div>
`
