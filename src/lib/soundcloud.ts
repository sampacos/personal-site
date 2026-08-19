export interface SoundCloudTrack {
  title: string;
  artist: string;
  url: string;
}

export async function getSoundCloudLikes(username = 'sam2445'): Promise<SoundCloudTrack[]> {
  try {
    const res = await fetch(`https://soundcloud.com/${username}/likes`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const noscriptMatch = html.match(/<noscript>([\s\S]*?)<\/noscript>/i);
    if (!noscriptMatch) return [];

    const articles = noscriptMatch[1].match(/<article>([\s\S]*?)<\/article>/gi) || [];
    const tracks: SoundCloudTrack[] = [];

    for (const art of articles) {
      const linkMatches = [...art.matchAll(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi)];
      if (linkMatches.length >= 1) {
        const trackLink = linkMatches.find(
          (m) => m[1] !== `/${username}` && !m[1].includes('/tags/') && m[1].includes('/'),
        );
        if (trackLink) {
          const url = `https://soundcloud.com${trackLink[1]}`;
          const title = trackLink[2]
            .replace(/&#x27;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
          const parts = trackLink[1].replace(/^\//, '').split('/');
          const artist = parts[0] || 'SoundCloud';
          tracks.push({ title, artist, url });
        }
      }
    }

    return tracks;
  } catch {
    return [];
  }
}
