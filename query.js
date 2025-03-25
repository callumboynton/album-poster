const params = new URLSearchParams(window.location.search);
const clientId = params.get("clientId");
const clientSecret = params.get("clientSecret");

let accessToken;

async function getAuthSession() {
  try {
    if (!clientId || !clientSecret) {
      throw new Error("no client id or secret provided");
    }

    const rawAuth = `${clientId}:${clientSecret}`;

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams("grant_type=client_credentials"),
      headers: {
        Authorization: `Basic ${btoa(rawAuth)}`,
      },
    });

    const data = await response.json();
    accessToken = data.access_token;
  } catch (e) {
    console.error(`Error fetching Spotify auth - ${e}`);
  }
}

async function findAlbumHref(query) {
  try {
    if (!accessToken) await getAuthSession();

    const response = await fetch(
      `https://api.spotify.com/v1/search?type=album&q=${query}&market=GB&limit=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    return data.albums.items[0].href;
  } catch (e) {
    console.error(`Error fetching Spotify album - ${e}`);
  }
}

async function findAlbumArtwork(query) {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?entity=album&term=${query}&country=GB&limit=1`,
      { method: "GET" }
    );
    const data = await response.json();

    // https://a5.mzstatic.com/us/r1000/0/Music221/v4/f6/15/d0/f615d0ab-e0c4-575d-907e-1cc084642357/24UMGIM61704.rgb.jpg

    let rawUrl = data.results[0].artworkUrl100;
    rawUrl = rawUrl
      .split("https://is1-ssl.mzstatic.com/image/thumb/")[1]
      .split("/100x100bb.jpg")[0];

    return `https://a5.mzstatic.com/us/r1000/0/${rawUrl}`;
  } catch (e) {
    console.warn(
      `Error fetching iTunes album artwork, falling back to Spotify artwork - ${e}`
    );
  }
}

async function getAlbumData(href) {
  try {
    if (!accessToken) await getAuthSession();

    const response = await fetch(href, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.error(`Error fetching Spotify album - ${e}`);
  }
}

async function parseAlbum(album) {
  let artwork = await findAlbumArtwork(
    `${album.name} - ${album.artists[0].name}`
  );
  if (!artwork) {
    const bestQuality = album.images.reduce(
      (max, img) => (img.height > max.height ? img : max),
      album.images[0]
    );
    artwork = bestQuality.url;
  }

  const duration = formatMs(
    album.tracks.items.reduce((a, v) => a + v.duration_ms, 0)
  ).split(":");

  const highestDisc = album.tracks.items.reduce(
    (max, t) => Math.max(max, t.disc_number),
    0
  );
  const hasMultipleDiscs = highestDisc > 1;

  let trackNames = album.tracks.items.map(
    (t) => `<p>
        <strong>${t.track_number.toString().padStart(2, "0")}.</strong> ${
      t.name
    } (${formatMs(t.duration_ms)})
      </p>`
  );

  if (hasMultipleDiscs) {
    const groupedTracks = album.tracks.items.reduce((acc, t) => {
      acc[t.disc_number] = acc[t.disc_number] || [];
      acc[t.disc_number].push(t);
      return acc;
    }, {});
    trackNames = Object.entries(groupedTracks).map(
      ([disc, tracks]) => `
      <div class="disc">
        <h3>${disc.padStart(2, "0")}</h3>
        <div class="tracks">
          ${tracks
            .map(
              (t) => `<p><strong>${t.track_number
                .toString()
                .padStart(2, "0")}.</strong> 
              ${t.name} (${formatMs(t.duration_ms)})</p>`
            )
            .join("")}
        </div>
      </div>`
    );
  }

  return {
    name: album.name,
    artist: album.artists[0].name.toUpperCase(),
    released: new Date(album.release_date)
      .toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
      .toUpperCase(),
    label: album.label,
    duration: `${duration[0]} MINUTES, ${duration[1]} SECONDS`,
    trackNames,
    artwork,
  };
}

function formatMs(ms) {
  const minutes = Math.floor(ms / 60000).toString();
  const seconds = Math.floor((ms % 60000) / 1000).toString();

  return `${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
}

function rgbToHex(r, g, b) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
