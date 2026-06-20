/* ============================================
   Deom Admin - JavaScript
   Content Management System
   ============================================ */

(function() {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const ADMIN_PASSWORD_KEY = "qiling-admin-password";
  const ADMIN_SESSION_KEY = "qiling-admin-session";
  const DEFAULT_ADMIN_PASSWORD = "qiling-admin";

  // ==================== STATE ====================
  let content = null;
  let editing = { projects: null, posts: null };

  // ==================== INIT ====================
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    initAdminGate();
    await loadContent();
    renderDashboard();
    initNavigation();
    initFormHandlers();
  }

  function initAdminGate() {
    const form = $("#admin-login-form");
    const gate = $("#admin-gate");
    const hasSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === "granted";

    if (hasSession && gate) {
      gate.classList.add("hidden");
      return;
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = $("#admin-password-input");
        const expected = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
        const value = input ? input.value.trim() : "";

        if (value === expected) {
          sessionStorage.setItem(ADMIN_SESSION_KEY, "granted");
          gate.classList.add("hidden");
          showToast("✅ 已进入后台");
          return;
        }

        if (input) input.value = "";
        showToast("❌ 密码错误");
      });
    }
  }

  // ==================== LOAD / SAVE CONTENT ====================
  async function loadContent() {
    try {
      const saved = localStorage.getItem("qiling-site-content");
      if (saved) {
        content = JSON.parse(saved);
      } else if (window.parent && window.parent.SITE_DATA) {
        content = JSON.parse(JSON.stringify(window.parent.SITE_DATA));
      } else if (window.SITE_DATA) {
        content = JSON.parse(JSON.stringify(window.SITE_DATA));
      } else {
        const res = await fetch("../js/site-content.js?t=" + Date.now());
        await res.text();
        content = window.SITE_DATA ? JSON.parse(JSON.stringify(window.SITE_DATA)) : getDefaultContent();
      }
    } catch (e) {
      console.warn("Failed to load content, using default");
      content = window.SITE_DATA ? JSON.parse(JSON.stringify(window.SITE_DATA)) : getDefaultContent();
    }
  }

  function saveContent() {
    const normalized = normalizeContent(content);
    content = normalized;

    let stored = false;
    let storageError = null;
    try {
      localStorage.setItem("qiling-site-content", JSON.stringify(normalized));
      stored = true;
    } catch (e) {
      storageError = e;
      console.warn("localStorage 写入失败，可能是图片内容过大", e);
    }

    syncWindowState(normalized);
    window.dispatchEvent(new CustomEvent("qiling-content-updated", { detail: normalized }));

    const source = `window.SITE_DATA = ${JSON.stringify(content, null, 2)};\n`;
    const blob = new Blob([source], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site-content.js";
    a.click();
    URL.revokeObjectURL(url);

    if (stored) {
      showToast("✅ 已保存并导出 site-content.js");
    } else {
      showToast("⚠️ 本地缓存已超限，但已导出 site-content.js；建议继续压缩图片或减少图片数量");
    }
  }

  // ==================== RENDER ====================
  function renderDashboard() {
    const stats = $("#admin-stats");
    if (stats) {
      stats.innerHTML = `
        <div class="admin-stat">
          <div class="admin-stat-value">${content.projects.length}</div>
          <div class="admin-stat-label">总项目</div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-value">${content.posts.length}</div>
          <div class="admin-stat-label">文章数</div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-value">${content.posts.reduce((sum, p) => sum + p.tags.length, 0)}</div>
          <div class="admin-stat-label">标签数</div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-value">${new Date().getFullYear()}</div>
          <div class="admin-stat-label">当前年份</div>
        </div>
      `;
    }
  }

    function renderProjects() {
    const container = $("#projects-list");
    if (!container) return;
    const projects = content.projects;
    if (projects.length === 0) {
      container.innerHTML = `<div class="admin-empty"><i class="fas fa-folder-open"></i><p>还没有项目，点击上方按钮添加</p></div>`;
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>项目名称</th>
            <th>标签</th>
            <th>图片</th>
            <th>日期</th>
            <th style="width:100px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${projects.map(p => `
            <tr>
              <td style="font-weight:600;">${escapeHtml(p.title)}</td>
              <td>${p.tags.map(t => `<span class="project-tag" style="font-size:0.7rem;padding:2px 8px;border-radius:999px;background:rgba(94,92,230,0.1);color:#7b79f0;border:1px solid rgba(94,92,230,0.15);margin:0 2px;">${escapeHtml(t)}</span>`).join("")}</td>
              <td>${p.image ? `<img src="${escapeHtml(p.image)}" style="width:56px;height:40px;object-fit:cover;border-radius:8px;">` : "-"}</td>
              <td style="color:var(--admin-text-secondary);font-size:0.8rem;">${p.date || "-"}</td>
              <td>
                <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="window.editProject(${p.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.deleteProject(${p.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }
function renderPosts() {
    const container = $("#posts-list");
    if (!container) return;
    const posts = content.posts;
    if (posts.length === 0) {
      container.innerHTML = `<div class="admin-empty"><i class="fas fa-file-alt"></i><p>还没有文章，点击上方按钮添加</p></div>`;
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>文章标题</th>
            <th>标签</th>
            <th>日期</th>
            <th style="width:100px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map(p => `
            <tr>
              <td style="font-weight:600;">${escapeHtml(p.title)}</td>
              <td>${p.tags.map(t => `<span class="project-tag" style="font-size:0.7rem;padding:2px 8px;border-radius:999px;background:rgba(94,92,230,0.1);color:#7b79f0;border:1px solid rgba(94,92,230,0.15);margin:0 2px;">${escapeHtml(t)}</span>`).join("")}</td>
              <td style="color:var(--admin-text-secondary);font-size:0.8rem;">${p.date || "-"}</td>
              <td>
                <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="window.editPost(${p.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.deletePost(${p.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ==================== NAVIGATION ====================
  function initNavigation() {
    const navItems = $$(".admin-nav-item");
    const tabContents = $$(".admin-tab-content");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const tab = item.dataset.tab;
        navItems.forEach(n => n.classList.remove("active"));
        item.classList.add("active");
        tabContents.forEach(tc => tc.classList.remove("active"));
        const target = $(`#tab-${tab}`);
        if (target) target.classList.add("active");

        // Refresh content
        if (tab === "dashboard") renderDashboard();
        if (tab === "projects") { renderProjects(); renderProjectForm(); }
        if (tab === "posts") { renderPosts(); renderPostForm(); }
        if (tab === "settings") renderSettings();
      });
    });
  }

  function initFormHandlers() {
    renderSettings();
  }

  // ==================== PROJECT FORM ====================
    function renderProjectForm(data = null) {
    const container = $("#project-form-container");
    if (!container) return;
    const d = data || { title: "", description: "", tags: "", link: "", date: "", pdf: "", image: "" };
    const isEdit = !!data;
    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>${isEdit ? "编辑项目" : "添加新项目"}</h3>
        </div>
        <div class="admin-form">
          <div class="admin-form-group">
            <label>项目名称</label>
            <input type="text" id="pf-title" value="${escapeHtml(d.title)}" placeholder="输入项目名称">
          </div>
          <div class="admin-form-group">
            <label>项目描述</label>
            <textarea id="pf-desc" placeholder="输入项目描述">${escapeHtml(d.description)}</textarea>
          </div>
          <div class="admin-form-group">
            <label>标签（逗号分隔）</label>
            <input type="text" id="pf-tags" value="${(d.tags || []).join(", ")}" placeholder="React, TypeScript, Node.js">
          </div>
          <div class="admin-form-group">
            <label>链接</label>
            <input type="url" id="pf-link" value="${escapeHtml(d.link || "")}" placeholder="https://github.com/...">
          </div>
          <div class="admin-form-group">
            <label>PDF 文件</label>
            <input type="text" id="pf-pdf" value="${escapeHtml(d.pdf || "")}" placeholder="assets/pdfs/your-project.pdf 或完整 GitHub Pages 链接">
          </div>
          <div class="admin-form-group">
            <label>项目图片</label>
            <input type="file" id="pf-image-file" accept="image/*">
            <input type="hidden" id="pf-image" value="${escapeHtml(d.image || "")}">
            <div class="admin-image-preview" id="pf-image-preview">${d.image ? `<img src="${escapeHtml(d.image)}" alt="项目图片预览">` : "<span>未选择图片</span>"}</div>
          </div>
          <div class="admin-form-group">
            <label>日期</label>
            <input type="text" id="pf-date" value="${escapeHtml(d.date || "")}" placeholder="2026-06">
          </div>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-primary" onclick="window.saveProject(${d.id || "null"})">
              <i class="fas fa-save"></i> ${isEdit ? "保存修改" : "添加项目"}
            </button>
            ${isEdit ? `<button class="admin-btn" style="color:var(--admin-text-secondary);" onclick="window.cancelProjectEdit()">取消</button>` : ""}
          </div>
        </div>
      </div>
    `;

    const fileInput = $("#pf-image-file");
    if (fileInput) {
      fileInput.addEventListener("change", () => handleImageUpload(fileInput, "pf-image", "pf-image-preview"));
    }
  }
window.editProject = function(id) {
    const project = content.projects.find(p => p.id === id);
    if (project) {
      renderProjectForm(project);
      editing.projects = id;
    }
  };

    window.saveProject = function(id) {
    const title = $("#pf-title").value.trim();
    const desc = $("#pf-desc").value.trim();
    const tagsStr = $("#pf-tags").value.trim();
    const link = $("#pf-link").value.trim();
    const pdf = $("#pf-pdf").value.trim();
    const image = $("#pf-image").value.trim();
    const date = $("#pf-date").value.trim();

    if (!title) { showToast("❌ 请填写项目名称"); return; }

    const tags = tagsStr ? tagsStr.split(/[,，、\s]+/).filter(Boolean) : [];

    if (id) {
      const idx = content.projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        content.projects[idx] = { ...content.projects[idx], title, description: desc, tags, link, pdf, image, date };
        showToast("✅ 项目已更新");
      }
    } else {
      const newId = Math.max(0, ...content.projects.map(p => p.id)) + 1;
      content.projects.push({ id: newId, title, description: desc, tags, link, pdf, image, date });
      showToast("✅ 项目已添加");
    }
    editing.projects = null;
    renderProjects();
    renderProjectForm();
    saveContent();
  };
window.cancelProjectEdit = function() {
    editing.projects = null;
    renderProjectForm();
  };

  window.deleteProject = function(id) {
    if (!confirm("确定删除此项目？")) return;
    content.projects = content.projects.filter(p => p.id !== id);
    renderProjects();
    saveContent();
    showToast("🗑️ 项目已删除");
  };

  // ==================== POST FORM ====================
    function renderPostForm(data = null) {
    const container = $("#post-form-container");
    if (!container) return;
    const d = data || { title: "", excerpt: "", content: "", tags: "", date: "", image: "" };
    const isEdit = !!data;
    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>${isEdit ? "编辑文章" : "写新文章"}</h3>
        </div>
        <div class="admin-form">
          <div class="admin-form-group">
            <label>文章标题</label>
            <input type="text" id="post-title" value="${escapeHtml(d.title)}" placeholder="输入文章标题">
          </div>
          <div class="admin-form-group">
            <label>摘要</label>
            <textarea id="post-excerpt" placeholder="文章摘要，用于列表展示">${escapeHtml(d.excerpt || "")}</textarea>
          </div>
          <div class="admin-form-group">
            <label>正文内容 (支持 Markdown)</label>
            <textarea id="post-content" placeholder="支持 Markdown 格式&#10;## 标题&#10;正文内容..." style="min-height:200px;">${escapeHtml(d.content || "")}</textarea>
          </div>
          <div class="admin-form-group">
            <label>日常图片</label>
            <input type="file" id="post-image-file" accept="image/*">
            <input type="hidden" id="post-image" value="${escapeHtml(d.image || "")}">
            <div class="admin-image-preview" id="post-image-preview">${d.image ? `<img src="${escapeHtml(d.image)}" alt="日常图片预览">` : "<span>未选择图片</span>"}</div>
          </div>
          <div class="admin-form-group">
            <label>标签（逗号分隔）</label>
            <input type="text" id="post-tags" value="${(d.tags || []).join(", ")}" placeholder="算法, 前端, 生活">
          </div>
          <div class="admin-form-group">
            <label>日期</label>
            <input type="date" id="post-date" value="${d.date || ""}">
          </div>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-primary" onclick="window.savePost(${d.id || "null"})">
              <i class="fas fa-save"></i> ${isEdit ? "保存修改" : "发布文章"}
            </button>
            ${isEdit ? `<button class="admin-btn" style="color:var(--admin-text-secondary);" onclick="window.cancelPostEdit()">取消</button>` : ""}
          </div>
        </div>
      </div>
    `;

    const fileInput = $("#post-image-file");
    if (fileInput) {
      fileInput.addEventListener("change", () => handleImageUpload(fileInput, "post-image", "post-image-preview"));
    }
  }
window.editPost = function(id) {
    const post = content.posts.find(p => p.id === id);
    if (post) {
      renderPostForm(post);
      editing.posts = id;
    }
  };

  window.savePost = function(id) {
    const title = $("#post-title").value.trim();
    const excerpt = $("#post-excerpt").value.trim();
    const contentText = $("#post-content").value.trim();
    const tagsStr = $("#post-tags").value.trim();
    const date = $("#post-date").value;
    const image = $("#post-image").value.trim();

    if (!title) { showToast("❌ 请填写文章标题"); return; }

    const tags = tagsStr ? tagsStr.split(/[,，、\s]+/).filter(Boolean) : [];

    if (id) {
      const idx = content.posts.findIndex(p => p.id === id);
      if (idx !== -1) {
        content.posts[idx] = { ...content.posts[idx], title, excerpt, content: contentText, tags, date, image };
        showToast("✅ 文章已更新");
      }
    } else {
      const newId = Math.max(0, ...content.posts.map(p => p.id)) + 1;
      content.posts.push({ id: newId, title, excerpt, content: contentText, tags, date, image });
      showToast("✅ 文章已发布");
    }
    editing.posts = null;
    renderPosts();
    renderPostForm();
    saveContent();
  };

  window.cancelPostEdit = function() {
    editing.posts = null;
    renderPostForm();
  };

  window.deletePost = function(id) {
    if (!confirm("确定删除此文章？")) return;
    content.posts = content.posts.filter(p => p.id !== id);
    renderPosts();
    saveContent();
    showToast("🗑️ 文章已删除");
  };

  // ==================== SETTINGS ====================
  function renderSettings() {
    const container = $("#tab-settings");
    if (!container) return;
    container.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h3>网站设置</h3>
        </div>
        <div class="admin-form" style="max-width:500px;">
          <div class="admin-form-group">
            <label>网站名称</label>
            <input type="text" id="site-name" value="${escapeHtml(content.site.title)}">
          </div>
          <div class="admin-form-group">
            <label>副标题</label>
            <input type="text" id="site-subtitle" value="${escapeHtml(content.site.subtitle)}">
          </div>
          <div class="admin-form-group">
            <label>个人简介</label>
            <textarea id="site-bio">${escapeHtml(content.site.bio)}</textarea>
          </div>
          <div class="admin-form-group">
            <label>GitHub URL</label>
            <input type="url" id="site-github" value="${escapeHtml(content.social.github)}">
          </div>
          <div class="admin-form-group">
            <label>Email</label>
            <input type="email" id="site-email" value="${escapeHtml(content.social.email)}">
          </div>
          <div class="admin-form-group">
            <label>后台密码</label>
            <input type="password" id="site-admin-password" placeholder="留空则保持当前密码">
          </div>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn-primary" onclick="window.saveSettings()">
              <i class="fas fa-save"></i> 保存设置
            </button>
            <button class="admin-btn" onclick="window.logoutAdmin()" type="button">
              <i class="fas fa-right-from-bracket"></i> 退出后台
            </button>
          </div>
        </div>
      </div>
      <div class="admin-card" style="margin-top:var(--space-lg);">
        <div class="admin-card-header">
          <h3>数据管理</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--admin-text-secondary);margin-bottom:var(--space-md);">
          所有数据存储在 <code>data/content.json</code> 文件中。
          修改后需要手动替换该文件以更新网站内容。
        </p>
        <button class="admin-btn admin-btn-primary" onclick="window.exportData()">
          <i class="fas fa-download"></i> 导出数据
        </button>
        <button class="admin-btn" style="margin-left:8px;background:rgba(52,211,153,0.15);color:#34d399;" onclick="document.getElementById('import-file').click()">
          <i class="fas fa-upload"></i> 导入数据
        </button>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="window.importData(event)">
      </div>
    `;
  }

  window.saveSettings = function() {
    const adminPassword = $("#site-admin-password").value.trim();
    content.site.title = $("#site-name").value.trim();
    content.site.subtitle = $("#site-subtitle").value.trim();
    content.site.bio = $("#site-bio").value.trim();
    content.social.github = $("#site-github").value.trim();
    content.social.email = $("#site-email").value.trim();
    if (adminPassword) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, adminPassword);
    }
    saveContent();
    showToast("✅ 设置已保存");
  };

  window.logoutAdmin = function() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.reload();
  };

  window.exportData = function() {
    saveContent();
  };

  window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        content = data;
        localStorage.setItem("qiling-site-content", JSON.stringify(content));
        renderDashboard();
        renderProjects();
        renderPosts();
        showToast("✅ 数据已导入");
      } catch (err) {
        showToast("❌ 导入失败: JSON 格式错误");
      }
    };
    reader.readAsText(file);
  };

  function handleImageUpload(fileInput, hiddenId, previewId) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("❌ 请选择图片文件");
      fileInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      compressImage(event.target.result, 1600, 0.82).then((dataUrl) => {
        const hidden = $("#" + hiddenId);
        const preview = $("#" + previewId);
        if (hidden) hidden.value = dataUrl;
        if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="预览">`;
      }).catch(() => {
        showToast("❌ 图片处理失败");
      });
    };
    reader.readAsDataURL(file);
  }

  function compressImage(dataUrl, maxSize = 1600, quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const ratio = Math.min(1, 1200 / Math.max(width, height));
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
        const outputType = supportsWebp ? "image/webp" : "image/jpeg";
        let outputQuality = 0.72;
        let output = canvas.toDataURL(outputType, outputType === "image/jpeg" || outputType === "image/webp" ? outputQuality : undefined);

        while (output.length > 650000 && outputQuality > 0.45) {
          outputQuality -= 0.08;
          output = canvas.toDataURL(outputType, outputQuality);
        }

        resolve(output);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function syncWindowState(nextContent) {
    const snapshot = JSON.parse(JSON.stringify(nextContent));
    if (window.opener && window.opener !== window) {
      window.opener.SITE_DATA = snapshot;
    }
    if (window.parent && window.parent !== window) {
      window.parent.SITE_DATA = snapshot;
    }
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        if (frame.contentWindow) frame.contentWindow.SITE_DATA = snapshot;
      } catch (e) {}
    });
  }

  function normalizeContent(raw) {
    const fallback = getDefaultContent();
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      site: {
        title: source.site?.title || fallback.site.title,
        subtitle: source.site?.subtitle || fallback.site.subtitle,
        bio: source.site?.bio || fallback.site.bio
      },
      avatar: source.avatar || "",
      social: {
        github: source.social?.github || fallback.social.github,
        email: source.social?.email || fallback.social.email
      },
      projects: Array.isArray(source.projects) ? source.projects : [],
      posts: Array.isArray(source.posts) ? source.posts : []
    };
  }
  // ==================== UTILITIES ====================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    const existing = $(".admin-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function getDefaultContent() {
    return {
      site: { title: "qiling", subtitle: "专注 / 创新 / 适应", bio: "热爱编程的创作者与记录者" },
      social: { github: "https://github.com/", email: "11433282920@qq.com" },
      projects: [],
      posts: []
    };
  }

  // Expose needed functions
  window.renderPosts = renderPosts;
  window.renderProjects = renderProjects;
  window.renderProjectForm = renderProjectForm;
  window.renderPostForm = renderPostForm;

})();









