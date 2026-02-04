export function generateKeyHash(length = 5): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      output += alphabet[bytes[i] % alphabet.length];
    }
    return output;
  }
  for (let i = 0; i < length; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}
