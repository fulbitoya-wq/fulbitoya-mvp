export function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  const blocks = withInline.split(/\n\n+/);
  return blocks
    .map((block) => {
      const trim = block.trim();
      if (trim.startsWith("## ")) {
        return `<h2>${trim.slice(3)}</h2>`;
      }
      if (trim.startsWith("# ")) {
        return `<h2>${trim.slice(2)}</h2>`;
      }
      if (trim.startsWith("- ")) {
        const items = trim
          .split("\n")
          .filter((l) => l.startsWith("- "))
          .map((l) => `<li>${l.slice(2)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${trim.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
