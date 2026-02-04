import { APP, escapeRegExp } from "@oh-my-git/shared";

export function getBlockMarkers(kind: string, id: string): { start: string; end: string } {
  const marker = `${APP.managedTag}:${kind}:${id}`;
  return {
    start: `# >>> ${marker}`,
    end: `# <<< ${marker}`,
  };
}

export function upsertBlock(content: string, kind: string, id: string, body: string): string {
  const { start, end } = getBlockMarkers(kind, id);
  const block = `${start}\n${body.trimEnd()}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, "g");

  if (!content.trim()) {
    return `${block}\n`;
  }

  if (pattern.test(content)) {
    return `${content.replace(pattern, block).trimEnd()}\n`;
  }

  return `${content.trimEnd()}\n\n${block}\n`;
}

export function removeBlock(content: string, kind: string, id: string): string {
  const { start, end } = getBlockMarkers(kind, id);
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\n?`, "g");
  const next = content.replace(pattern, "").trimEnd();
  return next ? `${next}\n` : "";
}
