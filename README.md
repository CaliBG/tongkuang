# 同框 Tongkuang 官网

## 2026-10-28 Duo 透明滚动开合演示

媒体来源为用户提供的 `10月28日.mp4`：1530×1080、60 fps、451 帧、约 7.5167 秒。透明母版只移除机身以外的白色背景并清理边缘白色污染，保留机身形状、屏幕内容和完整原片时间线。网页素材以原时间戳每隔一帧采样为 30 fps、960×678 的透明 WebP，共 226 帧；源文件 SHA-256、逐帧源索引与时间保存在 `public/assets/duo-fold/manifest.json`，可追溯到原片。

网页交互不播放整段视频。`src/duo-showcase.tsx` 仅选取原片 **0.800000–3.133333 秒**，即 WebP 序列 **24–94**（源视频帧 48–188，共 71 张网页帧）：起点为已显示同框的闭合外屏，终点为完全展开且按钮归位的内屏。向下滚动／手指向上滑时映射 24→94；反向滚动映射 94→24。原片后半段再次合上的过程不进入正向滚动，避免继续往下滑却自动收拢。此为片段的双向滚动呈现，不能称为完整原片播放或原速性能录像。

Duo 区域放在拍摄模式与开发动态之间，手机与短标题在滚动期间固定于视口。交互完全随自然页面纵向滚动推进，不截获滚轮或触摸、不自动播放，没有播放按钮、重播按钮或进度条。默认 SSR 封面使用透明闭合帧 `frame-0024.webp`，接近视口才加载序列。减少动态效果偏好使用展开静态帧 `frame-0094.webp`，取消固定长滚动区。

透明 Canvas 每次绘制前清除上一帧，折叠后不会残留展开机身。下载或解码较慢时保留上一张已呈现画面，失败保留画面并提供刷新说明；20 张解码帧缓存、4 个并发请求，快速反向滚动优先加载新目标。滚动事件被动监听并以 RAF 合并，窗口尺寸变化会重新计算有效滚动距离。

展示保留“开发版本演示 · 画面使用演示素材”。这是用户提供的视频素材的网页交互呈现，不能作为原生 App 的开合性能验证，也不代表无黑屏问题已修复或此版本已正式上架。该组件没有修改 App 功能、商店价格或现有下载清单。

本轮验证：移除按钮式播放器及其时钟测试后，现有 **16 项单元测试通过**，覆盖透明画布清理、乱序定位、失败保留画面与资源释放，以及原有官网功能；TypeScript、Vite 生产构建与 SSR 预渲染成功。Mac Safari 响应式窗口已完成 390×844 的正反滚动验收：实际帧 24→48→89→94，再 94→40→24，目标帧与已呈现帧一致；320×568 下标题、完整机身及备注均显示完整。此前锚点后画面未更新与 Safari 后台窗口没有调度 RAF 有关，测试页移入独立前台窗口后恢复。本轮窄屏检查是 Mac Safari 响应式测试，不是 iPhone 真机验证；桌面最终复核与减少动态效果仍需按发布验收记录确认。临时 DEV 诊断已移除，没有调试进度显示。

## 2026-10-27 官网内容与开发测试包同步

页面名称统一为“录屏自拍”“Vlog提词”，新增本轮开发进展与兼容性说明，保留原视觉设计、产品图片和滚动演示。iPhone Duo 的开合无旋转过渡、展开内屏全屏和按键布局明确标为本地开发演示，未宣称已在 App Store 上架。

Android 与 APK 兼容鸿蒙两个入口使用同一 `0.1.3-alpha`（4）开发签名 APK，包名 `com.tongkuang.app.dev`。本包不是原生 HarmonyOS HAP，不支持 APK 的系统无法安装。下载前保留测试说明、签名冲突处理、版本说明和 SHA-256 校验入口。

独立公开预发布：https://github.com/CaliBG/tongkuang/releases/tag/public-test-0.1.3-20261027 。未覆盖之前的 `public-test-0.1.2`。文件为 62,842,526 bytes，SHA-256 为 `7a15351122d49e48cb942522b561fe99cb906602ce657b9b7d261ca20966ab0d`。

GitHub Pages 下载指向校验通过的 GitHub Release；Netlify 继续通过 `scripts/prepare-mirror.mjs` 生成同源 APK 镜像。两个站点独立部署，不能只更新其中一个。镜像脚本要求实际已发布的 Release JSON，拒绝以草稿记录冒充正式输入。

本轮 12 项现有测试通过，TypeScript、Vite 与 HTML 预渲染构建通过；修复了 SSR 预渲染关闭时不必要的浏览器依赖扫描竞态。App Store 链接和价格说明保留，没有改变 App 的计费配置。

下文为既有项目与历史发布说明。

网站：https://calibg.github.io/tongkuang/

免费备用官网：https://tongkuang.netlify.app/ （2026-10-21 上线，Netlify Free；页面、动画及下载已获用户手机直连测试确认，不代表所有运营商和地区的长期可达性保证。）

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
- 白色功能区：同步双拍、录屏自拍、Vlog提词三张层叠卡片。
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

## 历史：2026-10-20 Android 与鸿蒙公开测试

2026-10-20 开放 `public-test-0.1.2` 预发布：

- Android `0.1.2-alpha`：开发签名的 APK，59.7 MiB，Android 10 / API 29 起，包名 `com.tongkuang.app.dev`。非应用商店正式版；完成模拟器验证，华为 Mate 50 Pro 等真实设备仍需验收。
- 鸿蒙 `0.1.2`：约 51 KB 的源码 ZIP，**不是可安装 HAP**。尚未完成完整 ArkTS / ArkUI 编译、签名或真机验证，录屏与后台相机等能力仍在开发中。公开包移除了本机证据路径，增加 `PUBLIC_PREVIEW.md`，没有新增许可证授权。
- 发布地址：https://github.com/CaliBG/tongkuang/releases/tag/public-test-0.1.2 。版本说明、两个文件及 SHA-256 校验清单在同一 Release。

`public/downloads.json` 是下载元数据来源，`status: testing` 不代表正式发布。`src/download-manifest.js` 只接受本仓库 HTTPS Release 地址或站内 `downloads/<tag>/<filename>` 镜像路径，并校验格式、大小、版本、校验值与同版本的说明链接，防止将源码标作安装包。

## 独立备用站与既有部署方式

字体、演示素材及隐私政策可随网站一起托管。`public/privacy/` 是 2026-10-21 读取的已公开隐私政策副本，正文未改；更新原政策时需要同步这份副本。

`scripts/prepare-mirror.mjs` 从已公开的安装包、源码 ZIP 和 GitHub Release API JSON 生成独立部署目录。输入目录须包含当前清单对应的两个文件，以及 `<tag>.json`。脚本先核验大小、SHA-256 与版本说明，再构建网站并复制到新目录，不覆盖已有目录，也不改原站的下载清单。

```sh
npm test
node scripts/prepare-mirror.mjs /path/to/release-inputs /path/to/new-mirror-output
```

部署目录为输出中的 `site/`；其中测试包和版本说明走站内路径，免责声明保留。仅迁移官网已经公开的版本；本地尚未发布的新版本不会自动加入。免费托管不等于中国大陆访问保证，上线后必须在大陆 Wi-Fi / 移动网络下验收。Netlify 免费额度耗尽会暂停站点，站内 APK 下载也会消耗流量额度；只使用 Free，不启用付费升级。

当前 Netlify 项目名为 `tongkuang`，由 CaliBG 团队持有。使用官方 CLI 登录后，将核验后的 `site/` 目录部署到同一个项目即可更新；GitHub Pages 与 Netlify 目前分别发布，推送 GitHub 不会自动更新 Netlify。首次成功部署编号为 `6ad82cd579ad18527cbc8011`。两个在线下载文件已重新完整下载，SHA-256 与原发布一致；鸿蒙仍是源码预览，不是 HAP。

`src/testing-downloads.tsx` 为 Android 与 APK 兼容鸿蒙两个入口提供独立的测试说明弹窗。用户先阅读功能不完整、设备限制、录制和保存失败等风险及备份提示，再点击下载；不会直接跳过提示。弹窗可通过关闭按钮、取消或 Escape 退出，支持键盘焦点与手机滚动。说明是非签约性质的风险提示，不要求放弃法定权利。下载信息加载失败时保留重试入口。

更新包时先上传并核验真实 Release 文件，再同步清单中的版本、大小、SHA-256、URL 与产品说明。不要上传占位文件或将 Android APK 标为原生鸿蒙应用。

## 验证

已通过 TypeScript 检查与生产构建；Chrome 桌面及 320 / 390 / 768 / 1920 像素布局检查、字体/素材加载、FAQ、下载状态、减少动态效果偏好，以及纵向滚动正放/倒放/停止、固定画面、触摸事件驱动的自然滚动、横屏布局检查。手机测试使用浏览器模拟触屏，真实 iPhone Safari 和华为手机仍需设备验收。

2026-10-20 手机白屏修订：原代码在视频尚无解码帧时就返回“就绪”，提前隐藏了封面；现已移除主动画里的视频解码依赖。`npm test` 覆盖首帧就绪、跳跃滚动的乱序加载、倒放、首帧失败、后续帧失败保留画面与销毁资源。Safari 响应式模式 390×844 下已观察到第一段 0%→47%→81%→7% 的真实画面与文字变化，第二段 67% 正常展开。此为 Mac Safari 窄屏验证，真实 iPhone 触摸／省电模式仍需上线后验收。

App Store：https://apps.apple.com/app/id6791828838

隐私政策：https://calibg.github.io/privacy/

## 2026-10-21 首次加载优化

- 构建时输出页面 HTML，浏览器无需等 React 脚本下载、执行后再发现首屏图片；React 使用 hydration 继续原交互。首屏的淡入改为同样节奏的 CSS 动画。生成 HTML 约 46.6 KB，gzip 约 7.1 KB。
- 首屏及后续配图使用按显示宽度、像素比选择的 WebP 版本，保留原文件。390 px 宽、2x/3x 屏幕对应的首屏两图约 87.3 / 129.2 KB，原图合计 303.0 KB；这是文件体积对比，不是实测加载时间或中国大陆网络承诺。
- 首屏两图高优先级，后续配图懒加载。动画渲染代码分包，实际展示区域进入附近 200 px 才下载，继续保留真实帧解码成功前的封面保护。
- 内容哈希命名的响应式图片与构建脚本长期缓存；未带版本的帧/字体短期缓存。下载清单仍需重新验证，避免新版本发布后显示旧安装包。
- `python3 scripts/optimize-images.py` 使用 Pillow 重建响应式配图与清单；`npm run build` 自动运行 `scripts/prerender.mjs`。`public/_headers` 随部署复制，镜像脚本不再覆盖缓存规则。
- 此次未修改截图内容、页面排版、动画帧序列、Android APK 或鸿蒙源码包。已验证生产构建、现有 12 项测试、静态 HTML 的图片可发现性和 Safari 桌面渲染/下载按钮加载；用户手机速度改善程度仍待复测。

性能修订已发布至同一个免费项目，部署编号 `6ad8306ce4a380d37bc92542`；在线 HTML 已含首屏内容及新图片，图片返回 HTTP 200 且长期缓存头生效。
