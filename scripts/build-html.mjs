#!/usr/bin/env node
// build-html.mjs — Jekyll을 대체하는 정적 사이트 빌더
// _posts/ 스캔 → front matter 파싱 → markdown→HTML → dist/에 출력

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, basename, join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

import { site, publications } from "./site-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

// Build timestamp for cache busting
const BUILD_TS = Math.floor(Date.now() / 1000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

/** Zero-padded two digits */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Format date as "2026년 02월 18일" */
function formatDateKR(date) {
  return `${date.getFullYear()}년 ${pad2(date.getMonth() + 1)}월 ${pad2(date.getDate())}일`;
}

/** Format date as ISO 8601 with +09:00 offset */
function dateToXmlSchema(date) {
  const y = date.getFullYear();
  const mo = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

/** Read a source file relative to ROOT */
function readSrc(relPath) {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

/** Write a dist file, creating directories as needed */
function writeDist(relPath, content) {
  const abs = resolve(DIST, relPath);
  ensureDir(dirname(abs));
  writeFileSync(abs, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Layout renderer — reproduces _layouts/default.html
// ---------------------------------------------------------------------------

/**
 * @param {string} content - Inner HTML content
 * @param {object} opts
 * @param {string} [opts.title] - Page title
 * @param {boolean} [opts.hideHeader] - Hide sidebar header
 * @param {boolean} [opts.isPost] - Is a post page (loads post.css, hides header)
 * @param {boolean} [opts.loadPostCss] - Force load post.css
 * @param {string} [opts.extraHead] - Extra HTML for <head>
 */
function renderLayout(content, opts = {}) {
  const { title, hideHeader, isPost, loadPostCss, extraHead, isHomepage } = opts;

  // Title logic: homepage → "SiteName | Affiliation", page → "PageTitle | SiteName", else → "SiteName"
  let titleTag = site.title;
  if (isHomepage && site.affiliation) {
    titleTag = `${site.title} | ${site.affiliation}`;
  } else if (title) {
    titleTag = `${title} | ${site.title}`;
  }

  // Font stylesheet
  const fontCss =
    site.font === "Sans Serif"
      ? `<link rel="stylesheet" href="/assets/css/font_sans_serif.css?v=${BUILD_TS}">`
      : `<link rel="stylesheet" href="/assets/css/font.css?v=${BUILD_TS}">`;

  // Post CSS (for post layout or pages with load_post_css)
  const postCss =
    isPost || loadPostCss
      ? `\n    <link rel="stylesheet" href="/assets/css/post.css?v=${BUILD_TS}">`
      : "";

  // Header section
  let headerHtml = "";
  if (!hideHeader && !isPost) {
    headerHtml = `
      <header>
        ${site.avatar ? `<a class="image avatar"><img src="${site.avatar}" alt="avatar" /></a>` : ""}

        <h1>${site.title}</h1>

        ${site.position ? `<position style="font-size:1.10rem;">${site.position}</position>\n          <br>` : ""}
        ${site.affiliation ? `<a href="${site.affiliation_link}" rel="noopener">\n            <autocolor>${site.affiliation}</autocolor>\n          </a>\n          <br>` : ""}
        ${site.email ? `<email>${site.email}</email>` : ""}
        <div class="social-icons">
          ${site.google_scholar ? `<a style="margin: 0 5px 0 0" href="${site.google_scholar}">\n              <i class="ai ai-google-scholar" style="font-size:1.2rem"></i>\n            </a>  ` : ""}
          ${site.cv_link ? `<a style="margin: 0 5px 0 0" href="${site.cv_link}">\n              <i class="ai ai-cv" style="font-size:1.3rem;"></i>\n            </a>` : ""}
          ${site.github_link ? `<a style="margin: 0 5px 0 0" href="${site.github_link}">\n              <i class="fab fa-github"></i>\n            </a>` : ""}
          ${site.linkedin ? `<a style="margin: 0 5px 0 0" href="${site.linkedin}">\n              <i class="fab fa-linkedin"></i>\n            </a>` : ""}
        </div>
      </header>`;
  }

  return `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${titleTag}</title>
    <meta name="description" content="${site.description}">
    <meta name="keywords" content="${site.keywords}">
    <link rel="canonical" href="${site.canonical}"/>

    <link rel="icon" media="(prefers-color-scheme:dark)" href="${site.favicon_dark || site.favicon}" type="image/png" />
    <link rel="icon" media="(prefers-color-scheme:light)" href="${site.favicon}" type="image/png" />
    <script src="/assets/js/favicon-switcher.js" type="application/javascript"></script>

    <!-- 외부 아이콘 스타일 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/academicons/1.8.6/css/academicons.min.css" integrity="sha256-uFVgMKfistnJAfoCUQigIl+JfUaP47GrRKjf6CTPVmw=" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- 공통 스타일시트 -->
    <link rel="stylesheet" href="/assets/css/top-menu.css?v=${BUILD_TS}">
    ${fontCss}
    <link rel="stylesheet" href="/assets/css/style-no-dark-mode.css?v=${BUILD_TS}">
    <link rel="stylesheet" href="/assets/css/publications-no-dark-mode.css?v=${BUILD_TS}">
    <link rel="stylesheet" href="/assets/css/custom-theme.css?v=${BUILD_TS}">
    <link rel="stylesheet" href="/assets/css/bg-effects.css?v=${BUILD_TS}">

    ${extraHead || ""}${postCss}
  </head>
  <!-- 상단 메뉴바 -->
  <nav class="top-menu">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About Me</a></li>
      <li><a href="/playground">Playground</a></li>
      <li><a href="/posts">Posts</a></li>
    </ul>
  </nav>
  <body>

    <div class="wrapper">
      <!-- 공통 헤더 -->${headerHtml}

      <!-- 페이지별 콘텐츠 영역 -->
      <section>
        ${content}
      </section>

      <!-- 공통 푸터 -->
      <footer>
        <p>&copy; ${new Date().getFullYear()} ${site.title}</p>
      </footer>
    </div>

    <script src="/assets/js/scale.fix.js"></script>
    <script defer src="/assets/js/bg-effects.js?v=${BUILD_TS}"></script>

    <!-- 스크롤 시 상단 메뉴바 숨김/표시 스크립트 -->
    <script>
      var prevScrollpos = window.pageYOffset;
      window.onscroll = function() {
        var currentScrollPos = window.pageYOffset;
        if (currentScrollPos <= 10 || prevScrollpos > currentScrollPos) {
          document.querySelector('.top-menu').style.transform = "translateY(0)";
        } else {
          document.querySelector('.top-menu').style.transform = "translateY(-100%)";
        }
        prevScrollpos = currentScrollPos;
      }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({startOnLoad:true, theme:'neutral', securityLevel:'loose'});</script>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Publications renderer — reproduces _includes/publications.md
// ---------------------------------------------------------------------------

function renderPublications() {
  let html = `<h2 id="publications" style="margin: 2px 0px -15px;">Publications</h2>\n\n<div class="publications">\n<ol class="bibliography">\n`;

  for (const pub of publications) {
    html += `\n<li>\n<div class="pub-row">\n`;
    html += `  <div class="col-sm-3 abbr" style="position: relative;padding-right: 15px;padding-left: 15px;">\n`;
    if (pub.image) {
      html += `    <img src="${pub.image}" class="teaser img-fluid z-depth-1" style="width=100;height=40%">\n`;
      if (pub.conference_short) {
        html += `    <abbr class="badge">${pub.conference_short}</abbr>\n`;
      }
    }
    html += `  </div>\n`;
    html += `  <div class="col-sm-9" style="position: relative;padding-right: 15px;padding-left: 20px;">\n`;
    html += `      <div class="title"><a href="${pub.pdf}">${pub.title}</a></div>\n`;
    html += `      <div class="author">${pub.authors}</div>\n`;
    html += `      <div class="periodical"><em>${pub.conference}</em>\n      </div>\n`;
    html += `    <div class="links">\n`;
    if (pub.pdf) html += `      <a href="${pub.pdf}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">PDF</a>\n`;
    if (pub.code) html += `      <a href="${pub.code}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Code</a>\n`;
    if (pub.page) html += `      <a href="${pub.page}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">Project Page</a>\n`;
    if (pub.bibtex) html += `      <a href="${pub.bibtex}" class="btn btn-sm z-depth-0" role="button" target="_blank" style="font-size:12px;">BibTex</a>\n`;
    html += `    </div>\n  </div>\n</div>\n</li>\n<br>\n`;
  }

  html += `\n</ol>\n</div>\n`;
  return html;
}

// ---------------------------------------------------------------------------
// Services renderer — reproduces _includes/services.md
// ---------------------------------------------------------------------------

function renderServices() {
  return `<h2 id="services">Services</h2>

<h4 style="margin:0 10px 0;">Conference Reviewers</h4>

<ul style="margin:0 0 5px;">
  <li><autocolor>ICLR: 2025</autocolor></li>
</ul>

<h4 style="margin:0 10px 0;">Journal Reviewers</h4>

<ul style="margin:0 0 20px;">
  <li><a href="https://www.computer.org/csdl/journal/tp"><autocolor>IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI)</autocolor></a></li>
</ul>
`;
}

// ---------------------------------------------------------------------------
// Post scanning
// ---------------------------------------------------------------------------

function scanPosts() {
  const postsDir = resolve(ROOT, "_posts");
  const posts = [];

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (extname(entry) === ".md") {
        const raw = readFileSync(full, "utf-8");
        const { data, content } = matter(raw);

        // Parse date from front matter or filename
        let date;
        if (data.date) {
          date = new Date(data.date);
        } else {
          // Fallback: parse from filename YYYY-MM-DD-slug.md
          const match = basename(entry).match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+09:00`);
          } else {
            date = new Date();
          }
        }

        const categories = data.categories || [];
        const tags = data.tags || [];
        const title = data.title || basename(entry, ".md");
        const listed = data.listed || false;

        // URL pattern: /{cat0}/{cat1}/{YYYY}/{MM}/{DD}/{slug}.html
        // slug = filename without date prefix
        const slug = basename(entry, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
        const catPath = categories.join("/");
        const datePath = `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
        const url = catPath
          ? `/${catPath}/${datePath}/${slug}.html`
          : `/${datePath}/${slug}.html`;

        posts.push({
          title,
          date,
          categories,
          tags,
          listed,
          url,
          slug,
          markdownContent: content,
          srcPath: full,
        });
      }
    }
  }

  walk(postsDir);

  // Sort by date descending (newest first), same as Jekyll
  posts.sort((a, b) => b.date - a.date);

  return posts;
}

// ---------------------------------------------------------------------------
// Post HTML generation
// ---------------------------------------------------------------------------

function renderPostPage(post, prevPost, nextPost) {
  const htmlContent = marked.parse(post.markdownContent);

  // Categories badges
  const categoriesHtml = post.categories.length > 0
    ? post.categories.map((c) => `<span class="post-category">${c}</span>`).join("\n        ")
    : "";

  // Tags
  const tagsHtml = post.tags.length > 0
    ? `<div class="post-tags">\n      ${post.tags.map((t) => `<span class="post-tag">#${t}</span>`).join("\n      ")}\n    </div>`
    : "";

  // Prev/next nav — NOTE: Jekyll's previous/next is chronologically adjacent
  // In Jekyll, "previous" = older post, "next" = newer post
  const prevNav = prevPost
    ? `<a href="${prevPost.url}" class="post-nav-card post-nav-prev">
        <span class="post-nav-label">&larr; 이전 글</span>
        <span class="post-nav-title">${prevPost.title}</span>
      </a>`
    : `<span class="post-nav-card post-nav-placeholder"></span>`;

  const nextNav = nextPost
    ? `<a href="${nextPost.url}" class="post-nav-card post-nav-next">
        <span class="post-nav-label">다음 글 &rarr;</span>
        <span class="post-nav-title">${nextPost.title}</span>
      </a>`
    : `<span class="post-nav-card post-nav-placeholder"></span>`;

  const inner = `<article class="post-article">
  <!-- 뒤로가기 -->
  <a href="/posts" class="post-back">&larr; 목록으로</a>

  <!-- 포스트 헤더 -->
  <h1 class="post-title">${post.title}</h1>

  <div class="post-meta">
    <time datetime="${dateToXmlSchema(post.date)}">
      ${formatDateKR(post.date)}
    </time>
    ${categoriesHtml ? `\n        ${categoriesHtml}` : ""}
  </div>

  ${tagsHtml}

  <hr class="post-divider">

  <!-- 본문 -->
  <div class="post-content">
    ${htmlContent}
  </div>

  <hr class="post-divider">

  <!-- 이전/다음 글 네비게이션 -->
  <nav class="post-nav">
    ${prevNav}

    ${nextNav}
  </nav>
</article>`;

  return renderLayout(inner, { title: post.title, isPost: true });
}

// ---------------------------------------------------------------------------
// Posts listing page
// ---------------------------------------------------------------------------

function renderPostsListing(posts) {
  // Group posts by first category
  const groups = new Map();
  for (const p of posts) {
    const topic = p.categories[0] || "기타";
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(p);
  }

  let html = `<div class="post-list-page">\n  <h1 class="post-list-title">글 목록</h1>\n`;

  for (const [topic, topicPosts] of groups) {
    html += `\n    <section class="post-group">\n      <h2 class="post-group-title">${topic}</h2>\n`;

    // Sub-group by month (YYYY년 MM월)
    const monthGroups = new Map();
    for (const p of topicPosts) {
      const monthKey = `${p.date.getFullYear()}년 ${pad2(p.date.getMonth() + 1)}월`;
      if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
      monthGroups.get(monthKey).push(p);
    }

    for (const [monthTitle, monthPosts] of monthGroups) {
      html += `\n      <div class="post-month">\n        <h3 class="post-month-title">${monthTitle}</h3>\n        <ul class="post-list">\n`;

      for (const p of monthPosts) {
        const badges =
          p.categories.length > 1
            ? `\n                <span class="post-list-badges">\n${p.categories
                .slice(1)
                .map((c) => `                  <span class="post-list-category">${c}</span>`)
                .join("\n")}\n                </span>`
            : "";

        const dateStr = `${pad2(p.date.getMonth() + 1)}.${pad2(p.date.getDate())}`;
        html += `          <li class="post-list-item">
            <a href="${p.url}" class="post-list-link">
              <span class="post-list-link-title">${p.title}</span>${badges}
              <span class="post-list-date">${dateStr}</span>
            </a>
          </li>\n`;
      }

      html += `        </ul>\n      </div>\n`;
    }

    html += `    </section>\n`;
  }

  html += `</div>\n`;

  return renderLayout(html, { title: "글 목록", hideHeader: true, loadPostCss: true });
}

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------

function buildHomePage() {
  const raw = readSrc("index.md");
  const { content } = matter(raw);
  // index.md content is mostly raw HTML (inline script + landing sections)
  // Just pass it through marked (which preserves HTML blocks)
  const htmlContent = marked.parse(content);

  const extraHead = `<script>document.documentElement.classList.add('landing-page');</script>
  <link rel="stylesheet" href="/assets/css/landing.css">`;

  return renderLayout(htmlContent, { hideHeader: true, isHomepage: true, extraHead });
}

function buildAboutPage() {
  const raw = readSrc("about/index.md");
  const { content } = matter(raw);

  // Process includes: {% include publications.md %} and {% include services.md %}
  let md = content;
  md = md.replace(/\{%\s*include\s+publications\.md\s*%\}/g, renderPublications());
  md = md.replace(/\{%\s*include\s+services\.md\s*%\}/g, renderServices());

  const htmlContent = marked.parse(md);

  return renderLayout(htmlContent, {});
}

function buildPlaygroundPage() {
  const raw = readSrc("playground/index.md");
  const { data, content } = matter(raw);

  // Process Liquid-like template tags in the content
  let html = content;

  // Replace {{ site.playground_llm_api | jsonify }} etc.
  html = html.replace(
    /\{\{\s*site\.playground_llm_api\s*\|\s*jsonify\s*\}\}/g,
    JSON.stringify(site.playground_llm_api)
  );
  html = html.replace(
    /\{\{\s*site\.playground_turnstile_site_key\s*\|\s*jsonify\s*\}\}/g,
    JSON.stringify(site.playground_turnstile_site_key)
  );

  // Firebase config block
  const fb = site.playground_firebase;
  if (fb && fb.databaseURL) {
    html = html.replace(
      /\{\%\s*if\s+site\.playground_firebase\s+and\s+site\.playground_firebase\.databaseURL\s*!=\s*""\s*%\}([\s\S]*?)\{\%\s*endif\s*%\}/g,
      "$1"
    );
    html = html.replace(/\{\{\s*site\.playground_firebase\.apiKey\s*\|\s*jsonify\s*\}\}/g, JSON.stringify(fb.apiKey));
    html = html.replace(/\{\{\s*site\.playground_firebase\.authDomain\s*\|\s*jsonify\s*\}\}/g, JSON.stringify(fb.authDomain));
    html = html.replace(/\{\{\s*site\.playground_firebase\.databaseURL\s*\|\s*jsonify\s*\}\}/g, JSON.stringify(fb.databaseURL));
    html = html.replace(/\{\{\s*site\.playground_firebase\.projectId\s*\|\s*jsonify\s*\}\}/g, JSON.stringify(fb.projectId));
  } else {
    // Remove firebase blocks
    html = html.replace(
      /\{\%\s*if\s+site\.playground_firebase[\s\S]*?\{\%\s*endif\s*%\}/g,
      ""
    );
  }

  // Turnstile script conditional
  if (site.playground_turnstile_site_key) {
    html = html.replace(
      /\{\%\s*if\s+site\.playground_turnstile_site_key\s+and\s+site\.playground_turnstile_site_key\s*!=\s*""\s*%\}([\s\S]*?)\{\%\s*endif\s*%\}/g,
      "$1"
    );
  } else {
    html = html.replace(
      /\{\%\s*if\s+site\.playground_turnstile_site_key[\s\S]*?\{\%\s*endif\s*%\}/g,
      ""
    );
  }

  const extraHead = `<script>document.documentElement.classList.add('playground-page');</script>
  <link rel="stylesheet" href="/assets/css/playground.css">
  <script defer src="/assets/js/playground-world.js"></script>`;

  return renderLayout(html, { title: "Playground", extraHead });
}

// ---------------------------------------------------------------------------
// Static file copying
// ---------------------------------------------------------------------------

function copyStaticFiles() {
  // Copy assets/ → dist/assets/ (skip .scss files)
  const assetsSrc = resolve(ROOT, "assets");
  if (existsSync(assetsSrc)) {
    cpSync(assetsSrc, resolve(DIST, "assets"), {
      recursive: true,
      filter: (src) => !src.endsWith(".scss"),
    });
  }

  // Copy individual files
  for (const name of ["CNAME", "robots.txt"]) {
    const srcPath = resolve(ROOT, name);
    if (existsSync(srcPath)) {
      cpSync(srcPath, resolve(DIST, name));
    }
  }

  // Copy DGQ/ project page if it exists
  const dgqSrc = resolve(ROOT, "DGQ");
  if (existsSync(dgqSrc)) {
    cpSync(dgqSrc, resolve(DIST, "DGQ"), { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------

console.log("\n🔨 Building site...\n");

// 1. Clean & create dist
ensureDir(DIST);

// 2. Copy static files first
console.log("[1/5] Copying static files...");
copyStaticFiles();

// 3. Build static pages
console.log("[2/5] Building static pages...");
writeDist("index.html", buildHomePage());
writeDist("about/index.html", buildAboutPage());
writeDist("playground/index.html", buildPlaygroundPage());

// 4. Scan and build posts
console.log("[3/5] Scanning posts...");
const posts = scanPosts();
console.log(`     Found ${posts.length} posts`);

// 5. Build individual post pages
console.log("[4/5] Building post pages...");
for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  // Jekyll convention: previous = older (i+1), next = newer (i-1)
  const prevPost = i + 1 < posts.length ? posts[i + 1] : null;
  const nextPost = i - 1 >= 0 ? posts[i - 1] : null;

  const html = renderPostPage(post, prevPost, nextPost);
  // Remove leading slash for writeDist
  writeDist(post.url.slice(1), html);
}

// 6. Build posts listing page
console.log("[5/5] Building posts listing...");
writeDist("posts/index.html", renderPostsListing(posts));

// Summary
console.log(`\n✅ Build complete!`);
console.log(`   ${posts.length} posts`);
console.log(`   4 static pages (home, about, playground, posts)`);
console.log(`   Output: ${DIST}\n`);
