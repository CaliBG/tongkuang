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

开发与预览地址：http://127.0.0.1:4176 。主交互已改为真实画面序列，不再依赖视频播放许可或 HTTP Range 定位。

`main` 分支推送触发 `.github/workflows/pages.yml`，将 `dist` 构建产物发布到 GitHub Pages。Pages 的 Build type 为 GitHub Actions。APK 与经整理的鸿蒙源码预览放在 GitHub Releases；不提交大型安装包到网站仓库，不发布 iOS 项目源码。

## 页面与设计

以用户提供的 3D 创作者页面为视觉参考，保持同框产品内容：

- #0C0C0C 深色背景、金属渐变大标题、Kanit 字体 300–900（本地托管，并附 OFL 授权）。
- 实际 App 界面组成悬浮手机首屏，鼠标靠近产生磁性移动。
- 随滚动反向移动的产品画面、逐字显现的介绍。
- 白色功能区：同步双拍、录屏双拍、Vlog 三张层叠卡片。
- 首屏后两段独立、随纵向滚动推进的原生网页演示、App Store 下载、Android Alpha 测试下载、鸿蒙源码预览、FAQ 与隐私链接。

产品素材主要来自现有 App 和用户提供的 Keynote 导出。录屏双拍卡片使用用户提供的 `IMG_7872.PNG` 作为编辑输入，由内置 imagegen 在黑色小窗中生成男性自拍；网页素材为 `public/assets/screen-camera-selfie.jpg`，不作为后台相机已修复的证明。按用户要求不显示图片说明，三种模式共用配图尺寸、倾斜和卡片层叠排版；录屏截图按小窗位置调整垂直取景，手机端保留完整自拍小窗。减少动态效果偏好会关闭磁性位移、滚动位移、字符渐显与卡片层叠；两段展示变为静态终帧，并取消固定滚动区。

## 两段纵向滚动演示

核心文件：`src/interactive-story.js`、`src/frame-sequence.js`。

- 原第 36 页：由原实拍视频提取 105 帧 WebP，以 Canvas 按进度绘制；四行文字以独立 HTML 元素出现、移动和淡出。
- 原第 39 → 40 页：从 Keynote 提取 30 张透明图层以及原始位移、缩放和淡入淡出数据，直接在 DOM 中按进度渲染。内嵌视频同步使用 96 帧原片序列。
- 首屏之后，原第 36 页与第 39 → 40 页各自占一个独立的固定展示页。页面滚动向下推进时间线，向上倒回，滚动停止则画面停在当前进度。
- 使用原生被动滚动事件和实际视口几何位置驱动图层与画面，不依赖 Safari 的原生 ScrollTimeline，不捕获触摸、不拦截滚轮。进度条只显示状态；没有横向拖动和自动播放控件。
- 展示页接近视口时预载素材；首个真实画面绘制成功后才隐藏封面，后续加载慢或失败保留上一帧并提供重试，不会露出空白画布。每段最多保留 12 张解码帧、3 个并发请求。
- 横屏和窄屏按可见高度缩放画面，系统“减少动态效果”设置改为静态终帧展示。
- 主交互不使用 iframe，不依赖原 Keynote 播放器。`public/story/` 保留原导出作为“查看原始演示”入口。

原始幻灯片动画与媒体文件的 SHA-256 见 `scripts/keynote-source-manifest.json`。原播放器的版权与致谢文件保留在 `public/story/assets/player`。

从同一份 43 页 HTML 导出重新导入：

```sh
python3 scripts/import-keynote.py /path/to/keynote-export
python3 scripts/extract-interactive.py
```

提取图层需要 PyMuPDF、Pillow。网页视频用 macOS `avconvert` 的 `Preset1280x720` 生成，保存在 `public/assets/interactive`；原视频未被替换或删除。`python3 scripts/extract-story-frames.py` 使用 Pillow 与 ffmpeg（也支持 imageio_ffmpeg）从这些视频重建 16 fps、960 像素宽的真实帧序列；201 张共约 3 MB，源视频校验值保存在 `src/story-frames.json`。

## Android 与鸿蒙公开测试

2026-10-20 开放 `public-test-0.1.2` 预发布：

- Android `0.1.2-alpha`：开发签名的 APK，59.7 MiB，Android 10 / API 29 起，包名 `com.tongkuang.app.dev`。非应用商店正式版；完成模拟器验证，华为 Mate 50 Pro 等真实设备仍需验收。
- 鸿蒙 `0.1.2`：约 51 KB 的源码 ZIP，**不是可安装 HAP**。尚未完成完整 ArkTS / ArkUI 编译、签名或真机验证，录屏与后台相机等能力仍在开发中。公开包移除了本机证据路径，增加 `PUBLIC_PREVIEW.md`，没有新增许可证授权。
- 发布地址：https://github.com/CaliBG/tongkuang/releases/tag/public-test-0.1.2 。版本说明、两个文件及 SHA-256 校验清单在同一 Release。

`public/downloads.json` 是下载元数据来源，`status: testing` 不代表正式发布。`src/download-manifest.js` 只接受本仓库 HTTPS Release 地址，并校验格式、大小、版本、校验值与匹配的版本说明链接，防止将源码标作安装包。

`src/testing-downloads.tsx` 为两个入口提供独立的测试说明弹窗。用户先阅读功能不完整、设备限制、录制和保存失败等风险及备份提示，再点击下载；不会直接跳过提示。弹窗可通过关闭按钮、取消或 Escape 退出，支持键盘焦点与手机滚动。说明是非签约性质的风险提示，不要求放弃法定权利。下载信息加载失败时保留重试入口。

更新包时先上传并核验真实 Release 文件，再同步清单中的版本、大小、SHA-256、URL 与产品说明。不要上传占位文件或将 Android APK 标为原生鸿蒙应用。

## 验证

已通过 TypeScript 检查与生产构建；Chrome 桌面及 320 / 390 / 768 / 1920 像素布局检查、字体/素材加载、FAQ、下载状态、减少动态效果偏好，以及纵向滚动正放/倒放/停止、固定画面、触摸事件驱动的自然滚动、横屏布局检查。手机测试使用浏览器模拟触屏，真实 iPhone Safari 和华为手机仍需设备验收。

2026-10-20 手机白屏修订：原代码在视频尚无解码帧时就返回“就绪”，提前隐藏了封面；现已移除主动画里的视频解码依赖。`npm test` 覆盖首帧就绪、跳跃滚动的乱序加载、倒放、首帧失败、后续帧失败保留画面与销毁资源。Safari 响应式模式 390×844 下已观察到第一段 0%→47%→81%→7% 的真实画面与文字变化，第二段 67% 正常展开。此为 Mac Safari 窄屏验证，真实 iPhone 触摸／省电模式仍需上线后验收。

App Store：https://apps.apple.com/app/id6791828838

隐私政策：https://calibg.github.io/privacy/
