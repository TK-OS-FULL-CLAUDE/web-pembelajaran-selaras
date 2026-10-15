// Versi mammoth siap-pakai untuk browser memakai tipe yang sama dengan paket utamanya.
declare module "mammoth/mammoth.browser.js" {
  const mammoth: typeof import("mammoth");
  export = mammoth;
}
