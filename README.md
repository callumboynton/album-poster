# Album Poster Generator

## Installation

This can be ran statically, or under deployment. A [Spotify application](https://developer.spotify.com/documentation/web-api/tutorials/getting-started) is required to use this application.

## Usage

When accessing the site, please use the below queries;

- `clientId`: this is your Spotify application client id.
- `clientSecret`: this is your Spotify application client secret.
- `q`: this is your query (i.e. "ASTROWORLD"). This does not need to be too specific, but for specific albums, I would recommend including the full album name and artist.

Upon image load, the function `capturePoster()` will be invoked, which will generate an image in A2 Poster format, and open the image in a new tab.
