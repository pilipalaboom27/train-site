const app = document.getElementById("app");
const sidebarNav = document.getElementById("sidebar-nav");
const breadcrumb = document.getElementById("breadcrumb");
const lectureToggle = document.getElementById("lecture-toggle");
const { chapters, course, resources, stages } = window.siteContent;

const lectureModeKey = "workbuddy-course-lecture-mode";
let searchTerm = "";
let chapterNavObserver = null;

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linkAttrs(href) {
  return href.startsWith("#")
    ? `href="${escapeHtml(href)}"`
    : `href="${escapeHtml(href)}" target="_blank" rel="noreferrer"`;
}

function renderPrompt(prompt, label = "示例 Prompt") {
  if (!prompt) return "";
  return `
    <div class="prompt-box">
      <div class="prompt-box__header">
        <span>${escapeHtml(label)}</span>
        <button class="ghost-button" data-copy="${escapeHtml(prompt)}">复制</button>
      </div>
      <pre>${escapeHtml(prompt)}</pre>
    </div>
  `;
}

function renderChips(items) {
  if (!items?.length) return "";
  return `<div class="chip-row">${items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderBulletList(items) {
  if (!items?.length) return "";
  return `<ul class="bullet-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderOrderedList(items) {
  if (!items?.length) return "";
  return `<ol class="ordered-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function renderLinks(links) {
  if (!links?.length) return "";
  return `
    <div class="resource-links">
      ${links
        .map((link) => `<a class="resource-link" ${linkAttrs(link.href)}>${escapeHtml(link.label)}</a>`)
        .join("")}
    </div>
  `;
}

function renderTable(tableData) {
  if (!tableData) return "";
  const caption = tableData.caption ? `<div class="table-caption">${escapeHtml(tableData.caption)}</div>` : "";
  const headers = (tableData.headers ?? []).map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = (tableData.rows ?? [])
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `
    ${caption}
    <div class="table-wrapper">
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
    </div>
  `;
}

function renderLabeledBlock(label, content) {
  if (!content) return "";
  return `
    <div class="content-block">
      <div class="content-block__label">${escapeHtml(label)}</div>
      ${content}
    </div>
  `;
}

function renderTextSection(section) {
  const paragraphs = (section.paragraphs ?? [])
    .map((paragraph) => `<p class="body-copy">${escapeHtml(paragraph)}</p>`)
    .join("");
  const bullets = renderBulletList(section.bullets);
  const extra = section.extra ? `<p class="body-copy">${escapeHtml(section.extra)}</p>` : "";
  const templates = (section.templates ?? [])
    .map((template) => {
      const label = template.label ? `<div class="section-label template-label">${escapeHtml(template.label)}</div>` : "";
      return label + renderPrompt(template.content, "可复制模板");
    })
    .join("");
  return paragraphs + bullets + extra + templates + renderTable(section.table) + renderLinks(section.links);
}

function renderCardsSection(section) {
  if (!section.cards?.length) return "";
  return `
    <div class="cards-grid">
      ${section.cards
        .map(
          (card) => `
            <article class="card-simple">
              <div class="card-simple__title">${escapeHtml(card.title)}</div>
              <div class="card-simple__content">${escapeHtml(card.content)}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInterfaceMapSection(section) {
  const regions = section.regions ?? [];
  if (!regions.length) return "";
  return `
    ${section.intro ? `<p class="body-copy">${escapeHtml(section.intro)}</p>` : ""}
    <div class="interface-map">
      <div class="interface-map__mock" aria-hidden="true">
        <div class="interface-map__sidebar">任务列表</div>
        <div class="interface-map__main">
          <div class="interface-map__topbar">顶部任务栏</div>
          <div class="interface-map__chat">对话区</div>
          <div class="interface-map__input">输入栏</div>
        </div>
        <div class="interface-map__result">结果区</div>
      </div>
      <div class="interface-map__cards">
        ${regions
          .map(
            (region, index) => `
              <article class="interface-card">
                <div class="interface-card__index">${String(index + 1).padStart(2, "0")}</div>
                <div>
                  <h3>${escapeHtml(region.title)}</h3>
                  <p>${escapeHtml(region.description)}</p>
                  ${region.tip ? `<span>${escapeHtml(region.tip)}</span>` : ""}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderBasicSection(section) {
  const detailCards = [
    ["我当时遇到的问题是", section.problem],
    ["什么时候会用到", section.audience],
    ["可以什么时候用", section.useWhen],
    ["什么时候先别用", section.avoidWhen],
    ["做完应该看到什么", section.expected],
    ["放到业务里长这样", section.businessExample],
  ];

  return `
    <div class="detail-grid">
      ${detailCards
        .map(
          ([label, value]) => `
            <div class="detail-card">
              <div class="detail-card__label">${escapeHtml(label)}</div>
              <p>${escapeHtml(value)}</p>
            </div>
          `
        )
        .join("")}
    </div>
    ${renderLabeledBlock("操作前准备什么", renderBulletList(section.prepare))}
    ${renderLabeledBlock("一步一步怎么做", renderOrderedList(section.steps))}
    ${
      section.demo
        ? `<div class="practice-panel">
            <div class="section-label">最小 Demo</div>
            <h2>${escapeHtml(section.demo.title)}</h2>
            ${renderPrompt(section.demo.prompt)}
          </div>`
        : ""
    }
    ${renderLabeledBlock("常见错误", renderBulletList(section.mistakes))}
    ${renderLinks(section.links)}
  `;
}

function renderAdvancedSection(section) {
  return `
    <div class="detail-grid detail-grid--two">
      <div class="detail-card">
        <div class="detail-card__label">我什么时候需要这个</div>
        <p>${escapeHtml(section.problem)}</p>
      </div>
      <div class="detail-card">
        <div class="detail-card__label">放到业务里是这样的</div>
        <p>${escapeHtml(section.business)}</p>
      </div>
    </div>
    ${renderLabeledBlock("适合什么场景", renderBulletList(section.scenarios))}
    ${renderLabeledBlock("我是这样开始的", renderOrderedList(section.start))}
    ${renderLabeledBlock("踩过的坑", renderBulletList(section.pitfalls))}
    ${renderLinks(section.links)}
  `;
}

function renderCaseSection(section) {
  return `
    <div class="case-intro">
      <p class="body-copy">${escapeHtml(section.scenario)}</p>
      <p class="case-audience">${escapeHtml(section.audience)}</p>
    </div>
    ${renderLabeledBlock("前置能力要求", renderChips(section.prerequisites))}
    ${renderLabeledBlock("涉及 WorkBuddy 模块", renderChips(section.modules))}
    ${renderLabeledBlock("我准备了什么材料", renderBulletList(section.inputs))}
    ${renderLabeledBlock("我是这样一步步做的", renderOrderedList(section.steps))}
    ${renderPrompt(section.prompt, "完整 Prompt")}
    ${renderLabeledBlock("我追问了什么", renderBulletList(section.followups))}
    ${renderLabeledBlock("怎么验收结果", renderBulletList(section.validation))}
    ${renderLabeledBlock("最终交付了什么", `<p class="body-copy">${escapeHtml(section.deliverable)}</p>`)}
    ${renderLabeledBlock("我踩过的坑", renderBulletList(section.pitfalls))}
  `;
}

function renderFaqSection(section) {
  if (!section.items?.length) return "";
  return `
    <div class="faq-list">
      ${section.items
        .map(
          (item, index) => `
            <details class="faq-item" ${index < 2 ? "open" : ""}>
              <summary>${escapeHtml(item.q)}</summary>
              <p>${escapeHtml(item.a)}</p>
              <span>${escapeHtml(item.ref)}</span>
            </details>
          `
        )
        .join("")}
    </div>
  `;
}

function renderResourceLinksSection(section) {
  if (!section.links?.length) return "";
  return `
    <div class="resource-list">
      ${section.links
        .map(
          (link) => `
            <a class="resource-item" ${linkAttrs(link.href)}>
              <span class="resource-item__title">${escapeHtml(link.label)}</span>
              <span class="resource-item__note">${escapeHtml(link.note)}</span>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSection(section) {
  switch (section.type) {
    case "text":
      return renderTextSection(section);
    case "table":
      return renderTable(section);
    case "steps":
      return renderOrderedList(section.steps);
    case "list":
      return renderBulletList(section.items);
    case "cards":
      return renderCardsSection(section);
    case "interface-map":
      return renderInterfaceMapSection(section);
    case "basic":
      return renderBasicSection(section);
    case "advanced":
      return renderAdvancedSection(section);
    case "case":
      return renderCaseSection(section);
    case "faq":
      return renderFaqSection(section);
    case "resource-links":
      return renderResourceLinksSection(section);
    default:
      return "";
  }
}

function renderHome() {
  const entryChapters = chapters.filter((chapter) => ["chapter-1", "chapter-2", "chapter-3", "chapter-4"].includes(chapter.id));
  const journeySteps = [
    {
      number: "01",
      title: "快速上手",
      text: "跟着做一遍，5 分钟看到第一个成果。从环境准备到验收结果，一条路走完。",
      href: "#/chapter/chapter-1",
    },
    {
      number: "02",
      title: "用到再看",
      text: "碰到哪个问题，翻到哪一页。不用从头读到尾，用到什么学什么。",
      href: "#/chapter/chapter-2",
    },
    {
      number: "03",
      title: "照搬你的业务",
      text: "我的案例改成你的场景。政策解读、数据分析、周报、汇报、会议纪要，拿来就能改。",
      href: "#/chapter/chapter-3",
    },
  ];

  const safetyBanner = course.safetyBanner;

  return `
    <section class="hero panel">
      <div class="hero__copy">
        <div class="eyebrow">Experience Sharing</div>
        <h1 class="display-title">${escapeHtml(course.title)}</h1>
        <h2 class="display-subtitle">${escapeHtml(course.subtitle)}</h2>
        <p class="lead">${escapeHtml(course.description)}</p>
        <p class="hero__statement">${escapeHtml(course.statement)}</p>
        <div class="hero__actions">
          <a class="primary-button" href="#/chapter/chapter-1/1-2">5 分钟做出第一个东西</a>
          <a class="secondary-button" href="#/chapter/chapter-1">先看一眼它是干什么的</a>
        </div>
      </div>
      <div class="hero__panel">
        <div class="hero__panel-title">看完这个你至少能做到</div>
        <div class="hero-focus-list">
          <span>会提任务</span>
          <span>会验收结果</span>
          <span>会用到业务里</span>
        </div>
      </div>
    </section>

    ${safetyBanner ? `
    <section class="panel safety-banner">
      <div class="safety-banner__title">${escapeHtml(safetyBanner.title)}</div>
      <ul class="safety-banner__list">
        ${safetyBanner.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
    ` : ""}

    <section class="panel">
      <div class="section-label">我是这样走过来的</div>
      <div class="learning-steps">
        ${journeySteps
          .map(
            (step) => `
              <a class="learning-step" href="${escapeHtml(step.href)}">
                <span class="learning-step__number">${escapeHtml(step.number)}</span>
                <span class="learning-step__title">${escapeHtml(step.title)}</span>
                <span class="learning-step__text">${escapeHtml(step.text)}</span>
              </a>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel">
      <div class="section-label">快速入口</div>
      <div class="card-grid">
        ${entryChapters
          .map(
            (chapter) => `
              <a class="nav-card" href="#/chapter/${escapeHtml(chapter.id)}">
                <span class="nav-card__kicker">${escapeHtml(chapter.stage ?? "")}</span>
                <span class="nav-card__title">${escapeHtml(chapter.title)}</span>
                <span class="nav-card__summary">${escapeHtml(chapter.intro ?? "进入继续阅读。")}</span>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderChapterNav(chapter, activeSectionId) {
  if (!chapter.sections?.length) return "";
  const items = chapter.sections
    .map((section) => {
      const href = `#/chapter/${chapter.id}/${section.id}`;
      const active = section.id === activeSectionId ? " is-active" : "";
      return `<a class="chapter-nav__link${active}" href="${href}" data-section="${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`;
    })
    .join("");
  return `
    <nav class="chapter-nav" aria-label="本章节目录">
      <div class="chapter-nav__title">本章目录</div>
      ${items}
    </nav>
  `;
}

function renderChapter(chapter, activeSectionId) {
  const sectionsHtml = chapter.sections
    .map(
      (section) => `
        <article id="section-${escapeHtml(section.id)}" class="panel section-panel${section.id === activeSectionId ? " section-active" : ""}">
          <h2 class="section-heading">${escapeHtml(section.title)}</h2>
          ${renderSection(section)}
        </article>
      `
    )
    .join("");

  return `
    <section class="article-header panel">
      ${chapter.stage ? `<div class="eyebrow">${escapeHtml(chapter.stage)}</div>` : ""}
      <h1>${escapeHtml(chapter.title)}</h1>
      ${chapter.intro ? `<p class="lead">${escapeHtml(chapter.intro)}</p>` : ""}
    </section>
    <div class="chapter-layout">
      <div class="chapter-layout__content">${sectionsHtml}</div>
      ${renderChapterNav(chapter, activeSectionId)}
    </div>
  `;
}

function renderResources() {
  return `
    <section class="article-header panel">
      <div class="eyebrow">Resources</div>
      <h1>资料页：精选参考链接</h1>
      <p class="lead">这里不做素材仓库，只保留听众会后真正会点开的官方资料、Prompt 方法和本站速查入口。</p>
    </section>
    <section class="resource-section-list">
      ${resources
        .map(
          (group) => `
            <article class="panel resource-panel">
              <div class="section-label">${escapeHtml(group.title)}</div>
              <div class="resource-list">
                ${group.items
                  .map(
                    (item) => `
                      <a class="resource-item" ${linkAttrs(item.href)}>
                        <span class="resource-item__title">${escapeHtml(item.label)}</span>
                        <span class="resource-item__note">${escapeHtml(item.note)}</span>
                      </a>
                    `
                  )
                  .join("")}
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function buildNavTree() {
  return [
    {
      group: "开始",
      items: [
        { type: "home", id: "", title: "首页" },
      ],
    },
    {
      group: "快速上手",
      items: [
        { type: "chapter", id: "chapter-1", title: "先动手做个东西" },
      ],
    },
    {
      group: "实用技巧",
      items: [
        { type: "chapter", id: "chapter-2", title: "用到什么学什么" },
      ],
    },
    {
      group: "场景实战",
      items: [
        { type: "chapter", id: "chapter-3", title: "我的真实业务故事" },
      ],
    },
    {
      group: "速查附录",
      items: [
        { type: "chapter", id: "chapter-4", title: "遇到问题再来翻" },
        { type: "page", id: "resources", title: "资料页" },
      ],
    },
  ];
}

function isActive(route, itemId, type) {
  const normalizedRoute = route.replace(/^#\/?/, "");
  if (type === "home") return normalizedRoute === "";
  if (type === "chapter") {
    const expected = "chapter/" + itemId;
    return normalizedRoute === expected || normalizedRoute.startsWith(expected + "/");
  }
  return normalizedRoute === itemId;
}

function renderSidebar(route) {
  const tree = buildNavTree();
  const normalizedRoute = route === "" ? "" : route.replace(/^#\/?/, "");

  sidebarNav.innerHTML = tree
    .map(
      (group) => `
        <section class="nav-group" data-group="${escapeHtml(group.group)}">
          <div class="nav-group__title">${escapeHtml(group.group)}</div>
          ${group.items
            .map((item) => {
              const href = item.type === "home" ? "#/" : item.type === "chapter" ? "#/chapter/" + item.id : "#/" + item.id;
              const active = isActive(normalizedRoute, item.id, item.type);
              return `<a class="nav-link${active ? " is-active" : ""}" href="${href}">${escapeHtml(item.title)}</a>`;
            })
            .join("")}
        </section>
      `
    )
    .join("");

  applySidebarSearchFilter();
}

function applySidebarSearchFilter() {
  if (!searchTerm) return;
  const term = searchTerm.toLowerCase();
  sidebarNav.querySelectorAll(".nav-group").forEach((group) => {
    let hasVisible = false;
    group.querySelectorAll(":scope > .nav-link").forEach((link) => {
      const matches = link.textContent.toLowerCase().includes(term);
      link.style.display = matches ? "" : "none";
      if (matches) hasVisible = true;
    });
    group.style.display = hasVisible ? "" : "none";
  });
}

function clearHighlights() {
  document.querySelectorAll("mark.search-highlight").forEach((mark) => {
    mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
  });
  document.querySelectorAll("span.search-highlight-wrapper").forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
}

function highlightContent(term) {
  if (!term) return;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  const toReplace = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (regex.test(node.textContent)) toReplace.push(node);
    regex.lastIndex = 0;
  }
  toReplace.forEach((node) => {
    const span = document.createElement("span");
    span.className = "search-highlight-wrapper";
    span.innerHTML = node.textContent.replace(regex, '<mark class="search-highlight">$1</mark>');
    node.parentNode.replaceChild(span, node);
  });
}

function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim();
    clearHighlights();
    renderSidebar(getRoute());
    if (searchTerm) highlightContent(searchTerm);
  });
}

const pagerOrder = [
  { id: "", title: "首页", href: "#/" },
  ...chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    href: "#/chapter/" + chapter.id,
  })),
  { id: "resources", title: "资料页", href: "#/resources" },
];

function getPagerId(route) {
  const clean = route.replace(/^#\/?/, "");
  if (clean === "" || clean === "resources") return clean;
  if (clean.startsWith("chapter/")) return clean.split("/")[1] ?? clean;
  return clean;
}

function renderPager(route) {
  const currentId = getPagerId(route);
  const index = pagerOrder.findIndex((item) => item.id === currentId);
  const prev = index > 0 ? pagerOrder[index - 1] : null;
  const next = index >= 0 && index < pagerOrder.length - 1 ? pagerOrder[index + 1] : null;

  return `
    <div class="pager">
      ${
        prev
          ? `<a class="pager__item" href="${escapeHtml(prev.href)}">
              <span class="pager__label">上一页</span>
              <span class="pager__title">${escapeHtml(prev.title)}</span>
            </a>`
          : `<span class="pager__item pager__item--ghost"></span>`
      }
      ${
        next
          ? `<a class="pager__item pager__item--next" href="${escapeHtml(next.href)}">
              <span class="pager__label">下一页</span>
              <span class="pager__title">${escapeHtml(next.title)}</span>
            </a>`
          : `<span class="pager__item pager__item--ghost"></span>`
      }
    </div>
  `;
}

function getRoute() {
  return location.hash.replace(/^#\/?/, "").trim();
}

function render() {
  const route = getRoute();
  const parts = route.split("/").filter(Boolean);
  let html = "";
  let title = "首页";

  if (route === "") {
    html = renderHome();
  } else if (parts[0] === "chapter") {
    const chapterId = parts[1];
    const sectionId = parts.slice(2).join("/");
    if (chapterId === "start") {
      title = "首页";
      html = renderHome();
    } else {
      const chapter = chapters.find((item) => item.id === chapterId);
      if (chapter) {
        title = chapter.title;
        html = renderChapter(chapter, sectionId);
      }
    }
  } else if (route === "resources") {
    title = "资料页";
    html = renderResources();
  }

  if (!html) {
    title = "未找到";
    html = `
      <section class="article-header panel">
        <div class="eyebrow">Not Found</div>
        <h1>这个页面还没有准备好</h1>
        <p class="lead">你可以先返回首页，或者从左侧导航重新进入。</p>
        <a class="primary-button" href="#/">返回首页</a>
      </section>
    `;
  }

  app.innerHTML = html + renderPager(route);
  breadcrumb.textContent = title;
  renderSidebar(route);
  window.scrollTo({ top: 0, behavior: "auto" });

  if (searchTerm) highlightContent(searchTerm);

  if (parts[0] === "chapter" && parts.length >= 3) {
    const sectionId = parts.slice(2).join("/");
    requestAnimationFrame(() => {
      const el = document.getElementById("section-" + sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  initChapterNavSpy();
}

function toggleLectureMode() {
  const current = document.body.classList.toggle("lecture-mode");
  localStorage.setItem(lectureModeKey, current ? "1" : "0");
  lectureToggle.textContent = current ? "退出投屏模式" : "投屏模式";
}

function initLectureMode() {
  const enabled = localStorage.getItem(lectureModeKey) === "1";
  if (enabled) {
    document.body.classList.add("lecture-mode");
    lectureToggle.textContent = "退出投屏模式";
  }
}

function initChapterNavSpy() {
  if (chapterNavObserver) chapterNavObserver.disconnect();

  const nav = document.querySelector(".chapter-nav");
  const sections = document.querySelectorAll(".section-panel");
  if (!nav || !sections.length) return;

  const links = nav.querySelectorAll(".chapter-nav__link");
  chapterNavObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (!visible.length) return;
      const top = visible.reduce((best, entry) => (entry.intersectionRatio > best.intersectionRatio ? entry : best));
      const sectionId = top.target.id.replace(/^section-/, "");
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("data-section") === sectionId);
      });
    },
    { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  sections.forEach((section) => chapterNavObserver.observe(section));
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;

  const text = button.getAttribute("data-copy") ?? "";
  const original = button.getAttribute("data-original") ?? button.textContent;
  if (!button.hasAttribute("data-original")) button.setAttribute("data-original", original);

  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = button.getAttribute("data-original") ?? original;
    }, 1200);
  } catch {
    button.textContent = "复制失败";
  }
});

window.addEventListener("hashchange", render);
lectureToggle.addEventListener("click", toggleLectureMode);

initLectureMode();
initSearch();
render();
