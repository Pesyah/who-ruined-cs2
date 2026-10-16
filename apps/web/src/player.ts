export function steamProfileUrl(steamId: string | null): string | null {
  return steamId && /^7656119\d{10}$/.test(steamId) ? `https://steamcommunity.com/profiles/${steamId}` : null;
}
