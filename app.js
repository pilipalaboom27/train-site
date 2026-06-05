const app = document.getElementById("app");
const sidebarNav = document.getElementById("sidebar-nav");
const breadcrumb = document.getElementById("breadcrumb");
const lectureToggle = document.getElementById("lecture-toggle");

const { chapters, course, resources } = window.siteContent;
const lectureModeKey = "workbuddy-course-lecture-mode";
let searchTerm = "";
let currentRoute = null;
const routeScrollPositions = new Map();

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(text) {
  const codeTokens = [];
  const linkTokens = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE_${codeTokens.length}@@`;
    codeTokens.push(`<code>${code}</code>`);
    return token;
  });

  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
      const href = url.replaceAll("&amp;", "&");
      const token = `@@LINK_${linkTokens.length}@@`;
      linkTokens.push(`<a ${linkAttrs(href)}>${label}</a>`);
      return token;
    })
    .replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, (_, url) => {
      const href = url.replaceAll("&amp;", "&");
      const token = `@@LINK_${linkTokens.length}@@`;
      linkTokens.push(`<a ${linkAttrs(href)}>${url}</a>`);
      return token;
    })
    .replace(/(^|[\s（(])((?:https?:\/\/)[^\s<>"'，。；、）)]+)/g, (match, prefix, url) => {
      const href = url.replaceAll("&amp;", "&");
      const token = `@@LINK_${linkTokens.length}@@`;
      linkTokens.push(`<a ${linkAttrs(href)}>${url}</a>`);
      return `${prefix}${token}`;
    });

  linkTokens.forEach((link, index) => {
    html = html.replaceAll(`@@LINK_${index}@@`, link);
  });
  codeTokens.forEach((code, index) => {
    html = html.replaceAll(`@@CODE_${index}@@`, code);
  });
  return html;
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
        <span>${renderInline(label)}</span>
        <button class="ghost-button" data-copy="${escapeHtml(prompt)}">复制</button>
      </div>
      <pre>${escapeHtml(prompt)}</pre>
    </div>
  `;
}

function renderBulletList(items) {
  if (!items?.length) return "";
  return `<ul class="bullet-list">${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
}

function renderOrderedList(items) {
  if (!items?.length) return "";
  return `<ol class="ordered-list">${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
}

function renderChips(items) {
  if (!items?.length) return "";
  return `<div class="chip-row">${items.map((item) => `<span class="chip">${renderInline(item)}</span>`).join("")}</div>`;
}

function renderLinks(links) {
  if (!links?.length) return "";
  return `
    <div class="resource-links">
      ${links.map((link) => `<a class="resource-link" ${linkAttrs(link.href)}>${renderInline(link.label)}</a>`).join("")}
    </div>
  `;
}

function renderTable(tableData) {
  if (!tableData) return "";
  const caption = tableData.caption ? `<div class="table-caption">${renderInline(tableData.caption)}</div>` : "";
  const headers = (tableData.headers ?? []).map((header) => `<th>${renderInline(header)}</th>`).join("");
  const rows = (tableData.rows ?? [])
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
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
      <div class="content-block__label">${renderInline(label)}</div>
      <div class="content-block__body">${content}</div>
    </div>
  `;
}

function renderStructuredBlock(block) {
  if (!block) return "";
  const paragraphs = (block.paragraphs ?? []).map((paragraph) => `<p class="body-copy">${renderInline(paragraph)}</p>`).join("");
  const prompt = block.prompt ? renderPrompt(block.prompt, block.promptLabel ?? "可复制模板") : "";
  const quote = block.quote ? `<blockquote class="quote-block">${renderInline(block.quote)}</blockquote>` : "";
  return renderLabeledBlock(block.label, paragraphs + renderBulletList(block.bullets) + renderTable(block.table) + prompt + quote);
}

function renderTextSection(section) {
  const paragraphs = (section.paragraphs ?? []).map((paragraph) => `<p class="body-copy">${renderInline(paragraph)}</p>`).join("");
  const blocks = (section.blocks ?? []).map(renderStructuredBlock).join("");
  const templates = (section.templates ?? [])
    .map((template) => {
      const label = template.label ? `<div class="section-label template-label">${renderInline(template.label)}</div>` : "";
      const context = template.context ? `<p class="body-copy">${renderInline(template.context)}</p>` : "";
      const tip = template.tip ? `<p class="body-copy muted-copy">${renderInline(template.tip)}</p>` : "";
      return label + context + renderPrompt(template.content, "可复制模板") + tip;
    })
    .join("");
  return paragraphs + renderBulletList(section.bullets) + renderTable(section.table) + blocks + templates + renderLinks(section.links);
}

function renderCardsSection(section) {
  if (!section.cards?.length) return "";
  return `
    <div class="cards-grid">
      ${section.cards
        .map(
          (card) => `
            <article class="card-simple">
              <div class="card-simple__title">${renderInline(card.title)}</div>
              <div class="card-simple__content">${renderInline(card.content)}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBasicSection(section) {
  const detailCards = [
    ["这节解决什么问题", section.problem],
    ["什么时候用", section.useWhen],
    ["先别什么时候用", section.avoidWhen],
    ["做完应该看到什么", section.expected],
  ].filter(([, value]) => value);

  return `
    <div class="detail-grid">
      ${detailCards
        .map(
          ([label, value]) => `
            <div class="detail-card">
              <div class="detail-card__label">${renderInline(label)}</div>
              <p>${renderInline(value)}</p>
            </div>
          `
        )
        .join("")}
    </div>
    ${renderLabeledBlock("先理解这一步", (section.explanation ?? []).map((item) => `<p class="body-copy">${renderInline(item)}</p>`).join(""))}
    ${renderLabeledBlock("操作前准备", renderBulletList(section.prepare))}
    ${renderLabeledBlock("一步一步怎么做", renderOrderedList(section.steps))}
    ${renderLabeledBlock("现场重点看什么", renderBulletList(section.observation))}
    ${renderLabeledBlock("做到什么算完成", renderBulletList(section.doneCriteria))}
    ${
      section.demo
        ? `<div class="practice-panel">
            <div class="section-label">最小 Demo</div>
            <h2>${renderInline(section.demo.title)}</h2>
            ${renderPrompt(section.demo.prompt)}
          </div>`
        : ""
    }
    ${renderLabeledBlock("常见错误", renderBulletList(section.mistakes))}
    ${renderLabeledBlock("业务里可以这样用", section.businessExample ? `<p class="body-copy">${renderInline(section.businessExample)}</p>` : "")}
    ${renderLinks(section.links)}
  `;
}

function renderAdvancedSection(section) {
  return `
    <div class="advanced-layout">
    <div class="detail-grid detail-grid--two">
      <div class="detail-card">
        <div class="detail-card__label">它解决什么问题</div>
        <p>${renderInline(section.problem)}</p>
      </div>
      <div class="detail-card">
        <div class="detail-card__label">放到工作里长这样</div>
        <p>${renderInline(section.business)}</p>
      </div>
    </div>
    ${renderLabeledBlock("先理解它", (section.explanation ?? []).map((item) => `<p class="body-copy">${renderInline(item)}</p>`).join(""))}
    ${renderLabeledBlock("适合场景", renderBulletList(section.scenarios))}
    ${renderLabeledBlock("先不要用在这些情况", renderBulletList(section.whenNot))}
    ${renderLabeledBlock("怎么开始", renderOrderedList(section.start))}
    ${renderLabeledBlock("做完怎么验收", renderBulletList(section.acceptance))}
    ${renderLabeledBlock("踩坑提醒", renderBulletList(section.pitfalls))}
    ${renderLinks(section.links)}
    </div>
  `;
}

function renderCaseSection(section) {
  return `
    <div class="case-intro">
      <p class="body-copy">${renderInline(section.scenario)}</p>
      <p class="case-audience">${renderInline(section.audience)}</p>
    </div>
    ${renderLabeledBlock("为什么这个案例适合演示", section.background ? `<p class="body-copy">${renderInline(section.background)}</p>` : "")}
    ${renderLabeledBlock("学完哪些基础页就能做", renderChips(section.prerequisites))}
    ${renderLabeledBlock("涉及 WorkBuddy 模块", renderChips(section.modules))}
    ${renderLabeledBlock("输入材料准备", renderBulletList(section.inputs))}
    ${renderLabeledBlock("推荐操作步骤", renderOrderedList(section.steps))}
    ${renderPrompt(section.prompt, "完整 Prompt")}
    ${renderLabeledBlock("追问 Prompt", renderBulletList(section.followups))}
    ${renderLabeledBlock("结果验收要点", renderBulletList(section.validation))}
    ${renderLabeledBlock("人工复核重点", renderBulletList(section.reviewFocus))}
    ${renderLabeledBlock("最终交付长什么样", `<p class="body-copy">${renderInline(section.deliverable)}</p>`)}
    ${renderLabeledBlock("最容易踩的坑", renderBulletList(section.pitfalls))}
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
              <summary>${renderInline(item.q)}</summary>
              <p>${renderInline(item.a)}</p>
              ${item.ref ? `<span>${renderInline(item.ref)}</span>` : ""}
            </details>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStepsSection(section) {
  return renderOrderedList(section.steps);
}

function renderSection(section) {
  switch (section.type) {
    case "cards":
      return renderCardsSection(section);
    case "table":
      return renderTable(section);
    case "basic":
      return renderBasicSection(section);
    case "advanced":
      return renderAdvancedSection(section);
    case "case":
      return renderCaseSection(section);
    case "faq":
      return renderFaqSection(section);
    case "steps":
      return renderStepsSection(section);
    case "text":
    default:
      return renderTextSection(section);
  }
}

function renderHome() {
  return `
    <section class="hero panel">
      <div class="hero__copy">
        <div class="eyebrow">WorkBuddy Tutorial</div>
        <h1 class="display-title">${renderInline(course.title)}</h1>
        <h2 class="display-subtitle">${renderInline(course.subtitle)}</h2>
        <p class="lead">${renderInline(course.description)}</p>
        <p class="hero__statement">${renderInline(course.statement)}</p>
        <div class="hero__actions">
          <a class="primary-button" href="#/chapter/chapter-2">先学会提任务</a>
          <a class="secondary-button" href="#/chapter/chapter-1">先认识 WorkBuddy</a>
        </div>
      </div>
      <div class="hero__panel">
        <div class="hero__panel-title">看完这份分享，你至少能做到</div>
        <div class="hero-focus-list">
          ${(course.outcomes ?? []).map((item) => `<span>${renderInline(item)}</span>`).join("")}
        </div>
      </div>
    </section>

    <section class="panel">
      <h2 class="section-heading home-section-title">循序渐进的学习路线</h2>
      <div class="learning-steps">
        ${(course.journey ?? [])
          .map(
            (step) => `
              <a class="learning-step" href="${escapeHtml(step.href)}">
                <span class="learning-step__number">${renderInline(step.number)}</span>
                <span class="learning-step__title">${renderInline(step.title)}</span>
                <span class="learning-step__text">${renderInline(step.text)}</span>
              </a>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel">
      <h2 class="section-heading home-section-title">章节入口</h2>
      <div class="card-grid">
        ${chapters
          .map(
            (chapter) => `
              <a class="nav-card" href="#/chapter/${escapeHtml(chapter.id)}">
                <span class="nav-card__kicker">${renderInline(chapter.group ?? "")}</span>
                <span class="nav-card__title">${renderInline(chapter.title)}</span>
                <span class="nav-card__summary">${renderInline(chapter.intro ?? "进入继续阅读。")}</span>
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
  return `
    <nav class="chapter-nav" aria-label="本章目录">
      <div class="chapter-nav__title">本章目录</div>
      ${chapter.sections
        .map((section) => {
          const active = section.id === activeSectionId ? " is-active" : "";
          return `<a class="chapter-nav__link${active}" href="#/chapter/${escapeHtml(chapter.id)}/${escapeHtml(section.id)}">${renderInline(section.title)}</a>`;
        })
        .join("")}
    </nav>
  `;
}

function renderAdvancedChapterMap(chapter) {
  const advancedSections = (chapter.sections ?? []).filter((section) => section.type === "advanced");
  if (!advancedSections.length || !["chapter-5", "chapter-6"].includes(chapter.id)) return "";

  const chapterMeta =
    chapter.id === "chapter-5"
      ? {
          eyebrow: "Capability Map",
          title: "先看能力地图，再看单个功能",
          note: "这一章不是要一次性打开所有高级能力，而是先判断任务卡在哪里，再选择最轻量的增强方式。",
          summary: ["先解决空白页", "再沉淀常用能力", "最后引入专业视角和资料"],
        }
      : {
          eyebrow: "Connection Map",
          title: "先判断连接边界，再考虑自动执行",
          note: "这一章的重点不是配置越多越好，而是确认外部系统、远程触发和自动化是否真的能降低重复劳动。",
          summary: ["先确认授权范围", "再跑通低风险闭环", "最后自动化稳定流程"],
        };

  return `
    <section class="advanced-map panel">
      <div class="advanced-map__header">
        <div>
          <div class="section-label">${renderInline(chapterMeta.eyebrow)}</div>
          <h2>${renderInline(chapterMeta.title)}</h2>
        </div>
        <p>${renderInline(chapterMeta.note)}</p>
      </div>
      <div class="advanced-map__rail">
        ${advancedSections
          .map((section, index) => {
            const title = section.title.split(/[：:]/)[0] || section.title;
            return `
              <a class="advanced-map__item" href="#/chapter/${escapeHtml(chapter.id)}/${escapeHtml(section.id)}">
                <span class="advanced-map__number">${String(index + 1).padStart(2, "0")}</span>
                <span class="advanced-map__title">${renderInline(title)}</span>
              </a>
            `;
          })
          .join("")}
      </div>
      <div class="advanced-map__summary">
        ${chapterMeta.summary.map((item) => `<span>${renderInline(item)}</span>`).join("")}
      </div>
      <div class="advanced-index" aria-label="进阶能力速览">
        ${advancedSections
          .map((section, index) => {
            const title = section.title.split(/[：:]/)[0] || section.title;
            const firstScenario = section.scenarios?.[0] ?? "按当前任务判断";
            const firstStep = section.start?.[0] ?? "先用低风险任务试一次";
            return `
              <a class="advanced-index__row" href="#/chapter/${escapeHtml(chapter.id)}/${escapeHtml(section.id)}">
                <span class="advanced-index__number">${String(index + 1).padStart(2, "0")}</span>
                <span class="advanced-index__name">${renderInline(title)}</span>
                <span class="advanced-index__problem">${renderInline(section.problem ?? "")}</span>
                <span class="advanced-index__meta">
                  <span><strong>适合</strong>${renderInline(firstScenario)}</span>
                  <span><strong>先试</strong>${renderInline(firstStep)}</span>
                </span>
              </a>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderChapter(chapter, activeSectionId) {
  const isAdvancedChapter = ["chapter-5", "chapter-6"].includes(chapter.id);
  const sectionsHtml = chapter.sections
    .map(
      (section) => `
        <article id="section-${escapeHtml(section.id)}" class="panel section-panel${section.id === activeSectionId ? " section-active" : ""}">
          <h2 class="section-heading">${renderInline(section.title)}</h2>
          ${renderSection(section)}
        </article>
      `
    )
    .join("");

  return `
    <section class="article-header panel${isAdvancedChapter ? " article-header--advanced" : ""}">
      ${chapter.group ? `<div class="eyebrow">${renderInline(chapter.group)}</div>` : ""}
      <h1>${renderInline(chapter.title)}</h1>
      ${chapter.intro ? `<p class="lead">${renderInline(chapter.intro)}</p>` : ""}
    </section>
    ${renderAdvancedChapterMap(chapter)}
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
      <h1>延伸阅读：保留必要资料</h1>
      <p class="lead">这里不做大而全的资料仓库，只保留会后真正可能用到的本地材料、官方文档、科研写作与 Skill 资源。</p>
    </section>
    <section class="resource-section-list">
      ${resources
        .map(
          (group) => `
            <article class="panel resource-panel">
              <div class="section-label">${renderInline(group.title)}</div>
              <div class="resource-list">
                ${group.items
                  .map((item) => {
                    const summary = item.summary ?? item.note ?? "会后按需查阅。";
                    const useCase = item.useCase ?? item.note ?? "";
                    return `
                      <article class="resource-item">
                        <div class="resource-item__top">
                          <span class="resource-item__type">${renderInline(item.type ?? "资源")}</span>
                          <a class="resource-item__title" ${linkAttrs(item.href)}>${renderInline(item.label)}</a>
                        </div>
                        <p class="resource-item__summary">${renderInline(summary)}</p>
                        ${useCase ? `<p class="resource-item__use"><span>适用：</span>${renderInline(useCase)}</p>` : ""}
                        <a class="resource-item__link" ${linkAttrs(item.href)}>打开资源</a>
                      </article>
                    `;
                  })
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
  const groups = [];
  chapters.forEach((chapter) => {
    const groupName = chapter.group ?? "教程";
    let group = groups.find((item) => item.group === groupName);
    if (!group) {
      group = { group: groupName, items: [] };
      groups.push(group);
    }
    group.items.push({ type: "chapter", id: chapter.id, title: chapter.title });
  });
  return [
    { group: "开始", items: [{ type: "home", id: "", title: "首页" }] },
    ...groups,
    { group: "资料", items: [{ type: "page", id: "resources", title: "延伸阅读" }] },
  ];
}

function getRoute() {
  return location.hash.replace(/^#\/?/, "").trim();
}

function isActive(route, itemId, type) {
  if (type === "home") return route === "";
  if (type === "chapter") {
    const expected = "chapter/" + itemId;
    return route === expected || route.startsWith(expected + "/");
  }
  return route === itemId;
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

function renderSidebar(route) {
  sidebarNav.innerHTML = buildNavTree()
    .map(
      (group) => `
        <section class="nav-group">
          <div class="nav-group__title">${renderInline(group.group)}</div>
          ${group.items
            .map((item) => {
              const href = item.type === "home" ? "#/" : item.type === "chapter" ? "#/chapter/" + item.id : "#/" + item.id;
              const active = isActive(route, item.id, item.type);
              return `<a class="nav-link${active ? " is-active" : ""}" href="${escapeHtml(href)}">${renderInline(item.title)}</a>`;
            })
            .join("")}
        </section>
      `
    )
    .join("");
  applySidebarSearchFilter();
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

function getPagerOrder() {
  return [
    { id: "", title: "首页", href: "#/" },
    ...chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, href: "#/chapter/" + chapter.id })),
    { id: "resources", title: "延伸阅读", href: "#/resources" },
  ];
}

function getPagerId(route) {
  if (route === "" || route === "resources") return route;
  if (route.startsWith("chapter/")) return route.split("/")[1] ?? route;
  return route;
}

function renderPager(route) {
  const order = getPagerOrder();
  const index = order.findIndex((item) => item.id === getPagerId(route));
  const prev = index > 0 ? order[index - 1] : null;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
  return `
    <div class="pager">
      ${
        prev
          ? `<a class="pager__item" href="${escapeHtml(prev.href)}"><span class="pager__label">上一页</span><span class="pager__title">${renderInline(prev.title)}</span></a>`
          : `<span class="pager__item pager__item--ghost"></span>`
      }
      ${
        next
          ? `<a class="pager__item pager__item--next" href="${escapeHtml(next.href)}"><span class="pager__label">下一页</span><span class="pager__title">${renderInline(next.title)}</span></a>`
          : `<span class="pager__item pager__item--ghost"></span>`
      }
    </div>
  `;
}

function renderBreadcrumb(route) {
  if (!breadcrumb) return;
  if (!route) {
    breadcrumb.textContent = "首页";
    return;
  }
  if (route === "resources") {
    breadcrumb.textContent = "延伸阅读";
    return;
  }
  const [, chapterId] = route.split("/");
  const chapter = chapters.find((item) => item.id === chapterId);
  breadcrumb.textContent = chapter?.title ?? "教程";
}

function renderApp() {
  const route = getRoute();
  saveCurrentRouteScroll();
  clearHighlights();
  let html = "";
  if (route === "") {
    html = renderHome();
  } else if (route === "resources") {
    html = renderResources();
  } else if (route.startsWith("chapter/")) {
    const [, chapterId, sectionId] = route.split("/");
    const chapter = chapters.find((item) => item.id === chapterId);
    html = chapter ? renderChapter(chapter, sectionId) : renderHome();
  } else {
    html = renderHome();
  }
  app.innerHTML = html + renderPager(route);
  renderSidebar(route);
  renderBreadcrumb(route);
  if (searchTerm) highlightContent(searchTerm);
  currentRoute = route;
  requestAnimationFrame(() => {
    if (currentRoute !== route) return;
    restoreRouteScroll(route);
    setTimeout(() => {
      if (currentRoute === route) restoreRouteScroll(route);
    }, 0);
    setTimeout(() => {
      if (currentRoute === route) restoreRouteScroll(route);
    }, 80);
    setTimeout(() => {
      if (currentRoute === route) restoreRouteScroll(route);
    }, 320);
  });
}

function saveCurrentRouteScroll() {
  if (currentRoute === null) return;
  routeScrollPositions.set(currentRoute, window.scrollY);
}

function restoreRouteScroll(route) {
  const sectionId = route.startsWith("chapter/") ? route.split("/")[2] : null;
  const target = sectionId ? document.getElementById("section-" + CSS.escape(sectionId)) : null;
  if (target) {
    withInstantScroll(() => target.scrollIntoView({ behavior: "auto", block: "start" }));
    return;
  }

  jumpToScrollPosition(routeScrollPositions.get(route) ?? 0);
}

function jumpToScrollPosition(top) {
  withInstantScroll(() => window.scrollTo({ top, behavior: "auto" }));
}

function withInstantScroll(callback) {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  callback();
  requestAnimationFrame(() => {
    root.style.scrollBehavior = previousScrollBehavior;
  });
}

function initCopyButtons() {
  app.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      const oldText = button.textContent;
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = oldText;
      }, 1200);
    } catch {
      button.textContent = "复制失败";
    }
  });
}

function applyLectureMode(enabled) {
  document.body.classList.toggle("lecture-mode", enabled);
  if (lectureToggle) lectureToggle.textContent = enabled ? "退出讲解" : "讲解模式";
}

function initLectureToggle() {
  const enabled = localStorage.getItem(lectureModeKey) === "1";
  applyLectureMode(enabled);
  lectureToggle?.addEventListener("click", () => {
    const next = !document.body.classList.contains("lecture-mode");
    localStorage.setItem(lectureModeKey, next ? "1" : "0");
    applyLectureMode(next);
  });
}

window.addEventListener("hashchange", renderApp);
initSearch();
initCopyButtons();
initLectureToggle();
renderApp();
