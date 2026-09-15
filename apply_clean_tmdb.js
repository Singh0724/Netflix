const fs = require('fs');
const cat = require('./catalogData.js');

// Clean high-res TMDB artwork (No pre-baked text, no duplicate badge artifacts)
const cleanTmdbAssets = {
  "Vishwanath & Sons": {
    backdrop: "https://image.tmdb.org/t/p/w780/nfNaAiiILjYRc2CKkId1ZfPTtlh.jpg",
    poster: "https://image.tmdb.org/t/p/w500/f5yXF2vBOxZcPxvw1P7kXXqOVFV.jpg"
  },
  "G.D.N": {
    backdrop: "https://image.tmdb.org/t/p/w780/hR0QpzOO2Gx1Lt7KxqKFWZvj5Vl.jpg",
    poster: "https://image.tmdb.org/t/p/w500/aAbvbKbNU6YyYDZ5ntSQcOygliw.jpg"
  },
  "The early spring": {
    backdrop: "https://image.tmdb.org/t/p/w780/oUFUvEMCBP80e4eYsfVfxC8n7ih.jpg",
    poster: "https://image.tmdb.org/t/p/w500/lGFngmJWMO4HTPcI0sUGKBAFqMe.jpg"
  },
  "Gandhari": {
    backdrop: "https://image.tmdb.org/t/p/w780/sT5WVT8LzvDwIbfy9BGXK0fvf3s.jpg",
    poster: "https://image.tmdb.org/t/p/w500/aF3IhwS1mrVfvM9OMXmTaXAT0l8.jpg"
  },
  "The Gentlemen": {
    backdrop: "https://image.tmdb.org/t/p/w780/yG1wltFmkX5c5ocACKfpX0tp3SY.jpg",
    poster: "https://image.tmdb.org/t/p/w500/tw3tzfXaSpmUZIB8ZNqNEGzMBCy.jpg"
  },
  "The Tudors": {
    backdrop: "https://image.tmdb.org/t/p/w780/cKsmzu5YpayNxc6Gs9KD8wyJV8M.jpg",
    poster: "https://image.tmdb.org/t/p/w500/7pdeNK1CUqj1yuG9VMDeynnq9xK.jpg"
  },
  "India's Got Latent": {
    backdrop: "https://image.tmdb.org/t/p/w780/3qS74RxSO4K9TaxSSHPHc1vCGFW.jpg",
    poster: "https://image.tmdb.org/t/p/w500/8jcdd5HqW4nhF2upVGFS0KJ6hdY.jpg"
  },
  "Chumbak": {
    backdrop: "https://image.tmdb.org/t/p/w780/2N1kH7314XUfMw80iLZh1d2UoHY.jpg",
    poster: "https://image.tmdb.org/t/p/w500/r2TJ9s9uhfxTssar1gBAWcxIXx7.jpg"
  },
  "Strong Girl Nam-soon": {
    backdrop: "https://image.tmdb.org/t/p/w780/6gyJwBbgFD0MYap1AFWQKOkve6D.jpg",
    poster: "https://image.tmdb.org/t/p/w500/rjkHORZvB5bnz7kH1PufFCKsX4I.jpg"
  },
  "WWE RAW": {
    backdrop: "https://image.tmdb.org/t/p/w780/90ceOXlFWCsqwk9W1dW0Ou4wPGn.jpg",
    poster: "https://image.tmdb.org/t/p/w500/f6xIVdQeAKVL8qZR1500MKUTtLe.jpg"
  },
  "Crew Girl": {
    backdrop: "https://image.tmdb.org/t/p/w780/lmtTtOjsIBxwKD7LsAD5eeyhq1g.jpg",
    poster: "https://image.tmdb.org/t/p/w500/jkPZW1iHNvlI6077NxSxwITa1tj.jpg"
  },
  "Fauda": {
    backdrop: "https://image.tmdb.org/t/p/w780/l7BDJsD2zRYHvu3G7qV1v7q5hoF.jpg",
    poster: "https://image.tmdb.org/t/p/w500/bc6XIKP1TrnugYMzIIUz9YCL8VM.jpg"
  },
  "Queen of Tears": {
    backdrop: "https://image.tmdb.org/t/p/w780/wcP3FsRLog4GNEs9PFrDKKQdcof.jpg",
    poster: "https://image.tmdb.org/t/p/w500/7ZXLZ3KYL3IVvsSHBZaHjcNQzNU.jpg"
  },
  "Avatar: The Last Airbender": {
    backdrop: "https://image.tmdb.org/t/p/w780/aVvRQJ2Ckhlym4uh0YGc166CUoP.jpg",
    poster: "https://image.tmdb.org/t/p/w500/lzZpWEaqzP0qVA5nkCc5ASbNcSy.jpg"
  }
};

// Clean Top 10 posters from TMDB
const cleanTop10Posters = {
  1408162: "https://image.tmdb.org/t/p/w500/f5yXF2vBOxZcPxvw1P7kXXqOVFV.jpg",
  1303331: "https://image.tmdb.org/t/p/w500/5d7hpbefNiuebl5eqP5cRrckVxs.jpg",
  1489543: "https://image.tmdb.org/t/p/w500/aAbvbKbNU6YyYDZ5ntSQcOygliw.jpg",
  1355228: "https://image.tmdb.org/t/p/w500/aF3IhwS1mrVfvM9OMXmTaXAT0l8.jpg",
  1423253: "https://image.tmdb.org/t/p/w500/vUEb8v8W5ANRXhydogbmjXfRfni.jpg"
};

function applyCleanArtwork(rows) {
  if (!rows) return;
  for (const row of rows) {
    if (row.isTop10) {
      for (const item of row.items || []) {
        if (cleanTop10Posters[item.id]) {
          item.posterUrl = cleanTop10Posters[item.id];
        }
      }
    } else {
      for (const item of row.items || []) {
        if (cleanTmdbAssets[item.title]) {
          item.backdropUrl = cleanTmdbAssets[item.title].backdrop;
          item.posterUrl = cleanTmdbAssets[item.title].backdrop; // Horizontal cards use clean backdrop
        }
      }
    }
  }
}

applyCleanArtwork(cat.homeRows);
applyCleanArtwork(cat.rows);

const output = "const MASTER_CATALOG = " + JSON.stringify(cat, null, 2) + ";\nmodule.exports = MASTER_CATALOG;\n";
fs.writeFileSync('catalogData.js', output);
console.log('Applied clean official TMDB artwork across all catalog data!');
