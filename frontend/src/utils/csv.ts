const EMAIL_RE = /[^\s,;"'<>]+@[^\s,;"'<>]+\.[A-Za-z]{2,}/g;

/** Pull every valid-looking email out of free text or a CSV, de-duplicated. */
export function extractEmails(text: string): string[] {
  return Array.from(new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase())));
}

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsText(file);
  });
