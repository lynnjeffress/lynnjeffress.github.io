import { Marked } from "marked";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const OUT = "_site";
const SITE = {
  name: "Lynn Jeffress",
  description: "Poems and short stories by Lynn Jeffress, a writer in Brooklyn, New York.",
};
const NAV = [
  { href: "/writing/", label: "Writing" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
];
const KINDS = { poem: "Poems", story: "Stories" };

const prose = new Marked();
const verse = new Marked({ breaks: true });

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFile(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (match) {
    for (const line of match[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) meta[kv[1]] = kv[2].replace(/^["'](.*)["']$/, "$1");
    }
    body = match[2];
  }
  return { meta, body, slug: path.basename(file, ".md") };
}

// Leading spaces in a poem are indentation, not a code block.
function renderPoem(body) {
  const indented = body.replace(/^ +/gm, (s) => "&nbsp;".repeat(s.length));
  return verse.parse(indented);
}

function formatDate(date) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function layout({ title, description = SITE.description, current, body, bodyClass = "" }) {
  const pageTitle = title ? `${escape(title)} | ${SITE.name}` : SITE.name;
  const nav = NAV.map(
    (n) =>
      `<a href="${n.href}"${current === n.href ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("\n        ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&display=swap">
  <link rel="stylesheet" href="/style.css">
</head>
<body class="${bodyClass}">
  <header class="site-header">
    <a class="wordmark" href="/">${SITE.name}</a>
    <nav aria-label="Main">
        ${nav}
    </nav>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <p>Brooklyn, New York</p>
  </footer>
</body>
</html>
`;
}

function writePage(route, html) {
  const file = path.join(OUT, route, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function loadWriting() {
  return fs
    .readdirSync("writing")
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseFile(path.join("writing", f)))
    .filter((p) => p.meta.draft !== "true")
    .map((p) => ({
      ...p,
      title: p.meta.title || p.slug,
      kind: KINDS[p.meta.kind] ? p.meta.kind : "poem",
      date: p.meta.date || "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function entry(p) {
  const date = formatDate(p.date);
  return `      <li>
        <a href="/writing/${p.slug}/">${escape(p.title)}</a>
        ${date ? `<time datetime="${p.date}">${date}</time>` : ""}
      </li>`;
}

function writingList(pieces) {
  if (!pieces.length) return `    <p class="empty">New work is on its way.</p>`;
  const groups = Object.keys(KINDS)
    .map((k) => [k, pieces.filter((p) => p.kind === k)])
    .filter(([, list]) => list.length);
  if (groups.length === 1) {
    return `    <ul class="entries">\n${groups[0][1].map(entry).join("\n")}\n    </ul>`;
  }
  return groups
    .map(
      ([k, list]) => `    <section class="group">
      <h2>${KINDS[k]}</h2>
      <ul class="entries">
${list.map(entry).join("\n")}
      </ul>
    </section>`
    )
    .join("\n");
}

function buildWriting(pieces) {
  writePage(
    "writing",
    layout({
      title: "Writing",
      current: "/writing/",
      body: `    <h1>Writing</h1>\n${writingList(pieces)}`,
    })
  );

  pieces.forEach((p, i) => {
    const newer = pieces[i - 1];
    const older = pieces[i + 1];
    const html = p.kind === "poem" ? renderPoem(p.body) : prose.parse(p.body);
    const date = formatDate(p.date);
    const pager = [
      older ? `<a class="older" href="/writing/${older.slug}/">${escape(older.title)}</a>` : "",
      newer ? `<a class="newer" href="/writing/${newer.slug}/">${escape(newer.title)}</a>` : "",
    ].join("");
    writePage(
      `writing/${p.slug}`,
      layout({
        title: p.title,
        description: p.meta.description || `${p.title}, by ${SITE.name}.`,
        current: "/writing/",
        bodyClass: `piece ${p.kind}`,
        body: `    <article>
      <h1>${escape(p.title)}</h1>
      ${date ? `<time datetime="${p.date}">${date}</time>` : ""}
      <div class="text">
${html}
      </div>
    </article>
    <nav class="pager" aria-label="More writing">
      <a class="back" href="/writing/">All writing</a>
      ${pager}
    </nav>`,
      })
    );
  });
}

function buildPages() {
  for (const f of fs.readdirSync("pages").filter((f) => f.endsWith(".md"))) {
    const p = parseFile(path.join("pages", f));
    const route = `/${p.slug}/`;
    writePage(
      p.slug,
      layout({
        title: p.meta.title,
        description: p.meta.description,
        current: route,
        body: `    <h1>${escape(p.meta.title || p.slug)}</h1>\n    <div class="text">\n${prose.parse(p.body)}    </div>`,
      })
    );
  }
}

function buildHome(pieces) {
  const recent = pieces.slice(0, 5);
  writePage(
    "",
    layout({
      bodyClass: "home",
      body: `    <h1 class="name">${SITE.name}</h1>
    <p class="intro">Poems and short stories from Brooklyn, New York.</p>
${
  recent.length
    ? `    <section class="recent">
      <h2>Recent work</h2>
      <ul class="entries">
${recent.map(entry).join("\n")}
      </ul>
      <a class="more" href="/writing/">All writing</a>
    </section>`
    : ""
}`,
    })
  );
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync("static", OUT, { recursive: true });
  const pieces = loadWriting();
  buildHome(pieces);
  buildWriting(pieces);
  buildPages();
  fs.writeFileSync(
    path.join(OUT, "404.html"),
    layout({
      title: "Page not found",
      body: `    <h1>Page not found</h1>\n    <p>This page doesn't exist. Try the <a href="/writing/">writing</a> page instead.</p>`,
    })
  );
  console.log(`Built ${pieces.length} pieces into ${OUT}/`);
}

function serve(port = 8000) {
  const types = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
  http
    .createServer((req, res) => {
      let file = path.join(OUT, decodeURIComponent(req.url.split("?")[0]));
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        return res.end(fs.readFileSync(path.join(OUT, "404.html")));
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(fs.readFileSync(file));
    })
    .listen(port, () => console.log(`Serving at http://localhost:${port}`));

  let timer;
  for (const dir of ["writing", "pages", "static"]) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(build, 100);
    });
  }
}

build();
if (process.argv.includes("--serve")) serve();
