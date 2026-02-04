export function extractPublicKeyMaterial(pubKey: string): string {
  const parts = pubKey.trim().split(/\s+/);
  if (parts.length < 2) return pubKey.trim();
  return `${parts[0]} ${parts[1]}`;
}
