/* ============================================
   Deom UI - Apple-Style Personal Blog
   JavaScript - Interactions & Logic
   ============================================ */

(function() {
  "use strict";

  // ==================== STATE ====================
  const state = {
    content: null,
    currentPost: null,
    bgInterval: null,
  };

  // ==================== DOM REFS ====================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ==================== INIT ====================
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    await loadContent();
    renderProjects();
    renderBlogPosts();
    initNav();
    initScrollAnimations();
    initSmoothScroll();
    initBackgroundRotation();
    initSnowfall();
    initBackToTop();
    initModalEvents();
    hideLoading();
  }

  // ==================== LOAD CONTENT ====================
  async function loadContent() {
    try {
      const saved = localStorage.getItem("qiling-site-content");
      if (saved) {
        state.content = normalizeContent(JSON.parse(saved));
        updateProfile();
        renderProjects();
        renderBlogPosts();
        return;
      }
      if (window.SITE_DATA) {
        state.content = normalizeContent(window.SITE_DATA);
        document.title = state.content.site.title + " - Personal Site";
        updateProfile();
        renderProjects();
        renderBlogPosts();
        return;
      }
      const res = await fetch("data/content.json", { cache: "no-store" });
      state.content = normalizeContent(await res.json());
      document.title = state.content.site.title + " - Personal Site";
      updateProfile();
      renderProjects();
      renderBlogPosts();
    } catch (e) {
      console.warn("Content load failed, using fallback", e);
      state.content = normalizeContent(getFallbackContent());
      updateProfile();
      renderProjects();
      renderBlogPosts();
    }
  }

  function updateProfile() {
    const s = state.content.site;
    $("#hero-name").textContent = s.title;
    $("#hero-subtitle").textContent = s.subtitle;
    $("#hero-bio").textContent = s.bio;
    const navLogo = $(".nav-logo");
    const footerCopyright = $(".footer-copyright");
    if (navLogo) {
      navLogo.innerHTML = `<span class="nav-logo-dot"></span>${s.title}`;
    }
    if (footerCopyright) {
      footerCopyright.innerHTML = `&copy; 2024-2026 ${s.title}. Built with ❤️`;
    }
    renderSocialLinks();
    renderAvatar();
  }

  function renderSocialLinks() {
    const social = $("#hero-social");
    if (!social || !state.content || !state.content.social) return;
    const { github = "", email = "" } = state.content.social;
    const links = [];

    if (github) {
      links.push(`
        <a href="${github}" target="_blank" rel="noopener" aria-label="GitHub">
          <i class="fab fa-github"></i>
        </a>
      `);
    }

    if (email) {
      links.push(`
        <a href="mailto:${email}" aria-label="Email">
          <i class="fas fa-envelope"></i>
        </a>
      `);
    }

    social.innerHTML = links.join("");
  }

  function renderAvatar() {
    const inner = $("#hero-avatar-inner");
    const badge = $(".hero-avatar-badge");
    const avatar = $("#hero-avatar");
    if (!inner) return;

    const avatarValue = state.content?.avatar || "";
    if (avatarValue) {
      inner.innerHTML = `<img src="${avatarValue}" alt="头像">`;
    } else {
      inner.textContent = (state.content?.site?.title || "Q").slice(0, 1).toUpperCase();
    }

    if (badge) badge.style.display = "none";
    if (avatar) avatar.style.cursor = "default";
  }

  function normalizeContent(raw) {
    const fallback = getFallbackContent();
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

  // ==================== PROJECTS ====================
  const projectIcons = ["💻", "⛰️", "📝", "🎨", "🚀", "⚡", "🛠️", "📊"];

  function renderProjects() {
    const grid = $("#projects-grid");
    if (!grid || !state.content) return;
    const projects = Array.isArray(state.content.projects) ? state.content.projects : [];
    if (!projects || projects.length === 0) {
      grid.innerHTML = `<div class="empty-state">还没有项目内容，请在后台添加。</div>`;
      return;
    }
    grid.innerHTML = projects.map((p, i) => `
      <article class="project-card animate-on-scroll delay-${(i % 4) + 1}">
        <div class="project-card-image ${p.image ? "has-image" : "is-placeholder"}">
          ${p.image
            ? `<img src="${p.image}" alt="${p.title}">`
            : `<div class="project-card-placeholder"><span>${projectIcons[i % projectIcons.length]}</span></div>`
          }
        </div>
        <div class="project-card-icon">${projectIcons[i % projectIcons.length]}</div>
        <div class="project-card-meta">${p.date || ""}</div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <div class="project-tags">
          ${p.tags.map(t => `<span class="project-tag">${t}</span>`).join("")}
        </div>
        <div class="project-card-actions">
          ${p.link && p.link !== "#" ? `<a href="${p.link}" class="project-card-link" target="_blank" rel="noopener">项目链接</a>` : ""}
          ${p.pdf ? `<a href="${p.pdf}" class="project-card-pdf project-card-pdf-view" target="_blank" rel="noopener">查看 PDF</a>` : ""}
          ${p.pdf ? `<a href="${p.pdf}" class="project-card-pdf project-card-pdf-download" target="_blank" rel="noopener" download>下载 PDF</a>` : ""}
        </div>
      </article>
    `).join("");
  }

  // ==================== BLOG POSTS ====================
  function renderBlogPosts() {
    const grid = $("#blog-grid");
    if (!grid || !state.content) return;
    const posts = Array.isArray(state.content.posts) ? state.content.posts : [];
    if (!posts || posts.length === 0) {
      grid.innerHTML = `<div class="empty-state">还没有日常内容，请在后台发布。</div>`;
      return;
    }
    const blogColors = ["#5e5ce6", "#ff6b9d", "#a78bfa", "#34d399", "#f59e0b", "#60a5fa"];
    grid.innerHTML = posts.map((p, i) => `
      <article class="blog-card animate-on-scroll delay-${(i % 4) + 1}" data-post-id="${p.id}">
        <div class="blog-card-image" style="background: linear-gradient(135deg, ${blogColors[i % blogColors.length]}33, ${blogColors[(i+1) % blogColors.length]}22);">
          ${p.image ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;">` : ["📖", "🧠", "📸", "🖥️", "📝"][i % 5]}
        </div>
        <div class="blog-card-body">
          <div class="blog-card-date">${formatDate(p.date)}</div>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
          <div class="project-tags">
            ${p.tags.map(t => `<span class="project-tag">${t}</span>`).join("")}
          </div>
        </div>
      </article>
    `).join("");

    // Click to open modal
    $$(".blog-card").forEach(card => {
      card.addEventListener("click", () => openPost(parseInt(card.dataset.postId)));
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  function openPost(id) {
    const post = state.content.posts.find(p => p.id === id);
    if (!post) return;
    state.currentPost = post;
    const modal = $("#blog-modal");
    const title = $("#modal-title");
    const date = $("#modal-date");
    const body = $("#modal-body");
    const tags = $("#modal-tags");

    title.textContent = post.title;
    date.textContent = formatDate(post.date);
    if (post.image) {
      body.innerHTML = `<img src="${post.image}" alt="${post.title}" style="width:100%;max-height:380px;object-fit:cover;border-radius:16px;margin-bottom:16px;">` + renderMarkdown(post.content);
    } else {
      body.innerHTML = renderMarkdown(post.content);
    }
    tags.innerHTML = post.tags.map(t => `<span class="project-tag">${t}</span>`).join("");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closePost() {
    const modal = $("#blog-modal");
    modal.classList.remove("active");
    document.body.style.overflow = "";
    state.currentPost = null;
  }

  function initModalEvents() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.currentPost) {
        closePost();
      }
    });
  }

  // Simple markdown renderer
  function renderMarkdown(md) {
    if (!md) return "";
    return md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^(.+)$/m, "<p>$1</p>")
      .replace(/<p><\/p>/g, "");
  }

  // ==================== NAVIGATION ====================
  function initNav() {
    const nav = $(".nav");
    const toggle = $(".nav-toggle");
    const links = $(".nav-links");
    const navLinks = $$(".nav-link");

    // Scroll effect
    window.addEventListener("scroll", () => {
      nav.classList.toggle("scrolled", window.scrollY > 80);
    });

    // Mobile toggle
    if (toggle) {
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("active");
        links.classList.toggle("open");
      });
    }

    // Nav link click - smooth scroll
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        const target = link.dataset.target;
        if (target) {
          e.preventDefault();
          const el = $(`#${target}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          // Close mobile menu
          toggle.classList.remove("active");
          links.classList.remove("open");
        }
      });
    });

    // Update active nav on scroll
    window.addEventListener("scroll", () => {
      const sections = ["hero", "projects", "blog", "about"];
      let current = "hero";
      sections.forEach(id => {
        const el = $(`#${id}`);
        if (el && el.getBoundingClientRect().top <= 200) {
          current = id;
        }
      });
      navLinks.forEach(link => {
        link.classList.toggle("active", link.dataset.target === current);
      });
    });
  }

  // ==================== SCROLL ANIMATIONS ====================
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    $$(".animate-on-scroll").forEach(el => observer.observe(el));
  }

  // ==================== SMOOTH SCROLL ====================
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener("click", (e) => {
        const href = anchor.getAttribute("href");
        if (href && href.length > 1) {
          const target = $(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    });
  }

  // ==================== BACKGROUND ROTATION ====================
  function initBackgroundRotation() {
    const layers = $$(".hero-bg .layer");
    if (layers.length < 2) return;
    let current = 0;
    state.bgInterval = setInterval(() => {
      layers.forEach(l => l.style.opacity = "0");
      current = (current + 1) % layers.length;
      layers[current].style.opacity = "1";
    }, 8000);
  }

  // ==================== SNOWFALL ====================
  function initSnowfall() {
    const container = $(".snow-particles");
    if (!container) return;
    const count = window.innerWidth < 768 ? 30 : 50;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "snow-particle";
      const size = 1 + Math.random() * 3;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = (8 + Math.random() * 12) + "s";
      p.style.animationDelay = Math.random() * 15 + "s";
      p.style.opacity = 0.2 + Math.random() * 0.5;
      container.appendChild(p);
    }
  }

  // ==================== BACK TO TOP ====================
  function initBackToTop() {
    const btn = $(".back-to-top");
    if (!btn) return;
    window.addEventListener("scroll", () => {
      btn.classList.toggle("visible", window.scrollY > 400);
    });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "qiling-site-content" && event.newValue) {
      try {
        state.content = normalizeContent(JSON.parse(event.newValue));
        updateProfile();
        renderProjects();
        renderBlogPosts();
      } catch (e) {
        console.warn("Failed to sync content", e);
      }
    }
  });

  window.addEventListener("qiling-content-updated", () => {
    const saved = localStorage.getItem("qiling-site-content");
    if (!saved) return;
    try {
      state.content = normalizeContent(JSON.parse(saved));
      updateProfile();
      renderProjects();
      renderBlogPosts();
    } catch (e) {
      console.warn("Failed to refresh content", e);
    }
  });

  // ==================== LOADING SCREEN ====================
  function hideLoading() {
    setTimeout(() => {
      const loading = $(".loading-screen");
      if (loading) loading.classList.add("hidden");
      document.body.classList.add("motion-ready");
    }, 800);
  }

  // ==================== MODAL EVENTS (delegated) ====================
  document.addEventListener("click", (e) => {
    if (e.target.closest(".blog-modal-overlay") || e.target.closest(".blog-modal-close")) {
      closePost();
    }
  });

  // ==================== FALLBACK CONTENT ====================
  function getFallbackContent() {
    return {
      site: {
        title: "qiling",
        subtitle: "专注 / 创新 / 适应",
        bio: "欢迎来到我的记录博客"
      },
      projects: [],
      posts: []
    };
  }

})();
