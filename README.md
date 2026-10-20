# 同框 Tongkuang 官网

轻量静态产品官网，发布到 https://calibg.github.io/tongkuang/ 。GitHub Pages 来源：`main` 分支的 `/docs`。

- 真实 App 界面与 App Store 下载入口。
- 同步双拍、录屏双拍、Vlog 三种模式，可点击或用方向键切换。
- 原 Keynote 第 36 页：视频和文字动画；第 39 → 40 页：神奇移动与内嵌视频。已拆为原生网页交互：手指或鼠标左右拖动直接控制图层、文字与实拍画面；反向拖动倒回，松手停止。支持进度条、键盘、自动演示、暂停、重置及全屏。
- 移动端布局、键盘操作、减少动态效果偏好。没有分析追踪或注册表单。
- Android 尚未发布，下载入口保持“开发中”，不提供占位安装包。

## 本地查看

在本项目目录运行 `node scripts/preview.mjs`，打开 http://localhost:4176 。无需安装前端依赖或构建。预览服务器支持 HTTP Range，这是视频逐帧拖动定位所必需的；普通 Python 静态服务器无法完整验证该行为。

## 动态演示

官网的 `interactive-story.js` 为原生可拖动网页：第 36 页的文字使用独立 HTML 元素，实拍视频按拖动进度定位；第 39 → 40 页从原动画提取 30 张透明图层及原位移、缩放、淡入淡出数据，直接在 DOM 中正向/反向渲染，不使用 iframe 播放器。原视频通过系统工具转换为适合网页的 H.264 MP4。素材无 AI 生成。

`docs/story/` 保留用户提供的 Keynote HTML 导出播放器作为“查看原始演示”入口。只纳入第 36、39、40 页，保留原始 JSON 动画、PDF 纹理与视频；没有把动态演示替换成静态截图。封面取自这些真实素材。原播放器的版权与致谢文件保留在 assets/player。

`bridge.js` 暴露嵌入所需的播放状态并处理静音自动播放；禁止跳入未选择的原第 37、41 页。播放器代码只有一处改动，用于向网页公开已有控制器。原始素材的 SHA-256 记录见 `scripts/keynote-source-manifest.json`。

如需重新导入同一份 43 页导出：`python3 scripts/import-keynote.py /path/to/keynote-export`。导入后保留 bridge.js，并重新检查章节场景索引与媒体播放。封面不是动画的替代品。运行 `python3 scripts/extract-interactive.py` 可从已导入资料重新提取透明图层（需要 PyMuPDF、Pillow）。

## 发布 Android 安装包

正式签名 APK 应上传到 GitHub Releases，再更新 `docs/downloads.json` 的 `android`：将 `status` 改为 `ready`，`url` 设置为 HTTPS APK 下载地址，填写真实 `version` 和 `sha256`。当前没有 APK，不得提前启用下载。网页不使用 APK 占位文件。

Android 发布时还需要同步调整页面标题描述、FAQ、支持设备与系统信息。不要把 Android APK 标为原生鸿蒙应用。

## 设计与验证

沿用同框蓝色图标、实际拍摄界面与用户提供的演示素材；原生 HTML/CSS/JS，设计参数为 7 / 4 / 3（变化 / 动效 / 密度）。页面本身尊重减少动态效果设置，拖动时画面完全随手势变化；自动演示仅由用户主动启动。

已在 Chrome 中验证桌面、320 / 390 / 768 像素布局、键盘标签切换、FAQ、待发布下载状态、36 页视频与文字动画、39 → 40 页动画与视频、原生图层鼠标/真实触摸事件拖动、反向拖动、松手冻结、键盘进度控制、自动演示/暂停/重置及全屏。上线后需要继续在真实 iPhone Safari 与 Android 浏览器验收视频解码和全屏差异。

App Store: https://apps.apple.com/app/id6791828838

隐私政策: https://calibg.github.io/privacy/
