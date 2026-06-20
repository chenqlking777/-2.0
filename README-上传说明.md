# GitHub Pages 上传说明

## 需要上传的内容
- `index.html`
- `admin/`
- `css/`
- `js/`
- `assets/`
- `data/`

## 注意
- 这是静态站点，可直接部署到 GitHub Pages。
- 线上页面不会读取你本机浏览器的 `localStorage`。
- 后台编辑后，记得把导出的 `site-content.js` 同步回仓库。
- 图片和 PDF 必须已经放入 `assets/` 对应目录。

## 推荐部署方式
1. 把 `github-pages-ready/` 里的内容上传到仓库根目录
2. 在 GitHub 仓库设置里开启 Pages
3. 进入你的 Pages 链接检查是否加载成功
