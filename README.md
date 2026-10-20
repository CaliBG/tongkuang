# 同框 Tongkuang 官网

网站：https://calibg.github.io/tongkuang/

## 开发与发布

React 18 + TypeScript + Tailwind CSS 3 + Framer Motion 12 + Lucide React，由 Vite 构建。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

开发与预览地址：http://127.0.0.1:4176 。预览服务器支持视频定位需要的 HTTP Range。不要用不支持 Range 的服务器验证滚动视频定位。

`main` 分支推送触发 `.github/workflows/pages.yml`，将 `dist` 构建产物发布到 GitHub Pages。Pages 的 Build type 为 GitHub Actions。没有上传 APK 或 iOS 项目源代码。

## 页面与设计

以用户提供的 3D 创作者页面为视觉参考，保持同框产品内容：

- #0C0C0C 深色背景、金属渐变大标题、Kanit 字体 300–900（本地托管，并附 OFL 授权）。
- 实际 App 界面组成悬浮手机首屏，鼠标靠近产生磁性移动。
- 随滚动反向移动的产品画面、逐字显现的介绍。
- 白色功能区：同步双拍、录屏双拍、Vlog 三张层叠卡片。
- 首屏后两段独立、随纵向滚动推进的原生网页演示、App Store 下载、Android 开发中状态、FAQ 与隐私链接。

所有产品素材来自现有 App 和用户提供的 Keynote 导出，未生成 AI 素材。录屏双拍卡片中的屏幕小窗为明确标注的功能示意。减少动态效果偏好会关闭磁性位移、滚动位移、字符渐显与卡片层叠；两段展示变为静态终帧，并取消固定滚动区。

## 两段纵向滚动演示

核心文件：`src/interactive-story.js`。

- 原第 36 页：实拍视频按进度定位；四行文字以独立 HTML 元素出现、移动和淡出。
- 原第 39 → 40 页：从 Keynote 提取 30 张透明图层以及原始位移、缩放和淡入淡出数据，直接在 DOM 中按进度渲染。内嵌视频同步定位。
- 首屏之后，原第 36 页与第 39 → 40 页各自占一个独立的固定展示页。页面滚动向下推进时间线，向上倒回，滚动停止则画面停在当前进度。
- 使用 Framer Motion 的滚动进度驱动图层与视频定位，不捕获触摸、不拦截滚轮。进度条只显示状态；取消横向拖动、章节切换与自动播放控件。
- 展示页接近视口时预载素材，加载失败可以重试；横屏和窄屏按可见高度缩放画面，系统“减少动态效果”设置改为静态展示。
- 主交互不使用 iframe，不依赖原 Keynote 播放器。`public/story/` 保留原导出作为“查看原始演示”入口。

原始幻灯片动画与媒体文件的 SHA-256 见 `scripts/keynote-source-manifest.json`。原播放器的版权与致谢文件保留在 `public/story/assets/player`。

从同一份 43 页 HTML 导出重新导入：

```sh
python3 scripts/import-keynote.py /path/to/keynote-export
python3 scripts/extract-interactive.py
```

提取图层需要 PyMuPDF、Pillow。网页视频用 macOS `avconvert` 的 `Preset1280x720` 生成，保存在 `public/assets/interactive`；原视频未被替换或删除。

## Android 下载

目前没有可发布 APK。`public/downloads.json` 的 `android.status` 保持 `development`。

正式 APK 签名并完成真机验证后，上传到 GitHub Releases，将 `status` 改为 `ready`，`url` 设置为 HTTPS APK 地址，并填写真实 `version` 与 `sha256`。不要上传占位文件或把 Android APK 标为原生鸿蒙应用。发布 Android 时同步修改首屏状态、FAQ、支持设备及系统信息。

## 验证

已通过 TypeScript 检查与生产构建；Chrome 桌面及 320 / 390 / 768 / 1920 像素布局检查、字体/素材加载、FAQ、下载状态、减少动态效果偏好，以及纵向滚动正放/倒放/停止、固定画面、触摸事件驱动的自然滚动、横屏布局检查。手机测试使用浏览器模拟触屏，真实 iPhone Safari 和华为手机仍需设备验收。

App Store：https://apps.apple.com/app/id6791828838

隐私政策：https://calibg.github.io/privacy/
