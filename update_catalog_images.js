const fs = require('fs');

const cat = require('./catalogData.js');

// 1. Hero backdrop
cat.hero.backdropUrl = "/assets/exact/turning_point_hero.jpg";

// 2. Exact assets map for titles
const exactAssets = {
  "Vishwanath & Sons": {
    poster: "/assets/exact/vishwanath_and_sons.jpg",
    backdrop: "/assets/exact/vishwanath_and_sons.jpg"
  },
  "G.D.N": {
    poster: "/assets/exact/gdn.jpg",
    backdrop: "/assets/exact/gdn.jpg"
  },
  "The early spring": {
    poster: "/assets/exact/early_spring.jpg",
    backdrop: "/assets/exact/early_spring.jpg"
  },
  "Gandhari": {
    poster: "/assets/exact/gandhari.jpg",
    backdrop: "/assets/exact/gandhari_popover.jpg"
  },
  "The Gentlemen": {
    poster: "/assets/exact/gentlemen.jpg",
    backdrop: "/assets/exact/gentlemen.jpg"
  },
  "The Tudors": {
    poster: "/assets/exact/tudors.jpg",
    backdrop: "/assets/exact/tudors.jpg"
  },
  "India's Got Latent": {
    poster: "/assets/exact/indias_got_latent.jpg",
    backdrop: "/assets/exact/indias_got_latent.jpg"
  },
  "Chumbak": {
    poster: "/assets/exact/chumbak.jpg",
    backdrop: "/assets/exact/chumbak.jpg"
  },
  "Strong Girl Nam-soon": {
    poster: "/assets/exact/strong_girl_nam_soon.jpg",
    backdrop: "/assets/exact/strong_girl_nam_soon.jpg"
  },
  "WWE RAW": {
    poster: "/assets/exact/wwe_raw.jpg",
    backdrop: "/assets/exact/wwe_raw.jpg"
  },
  "Crew Girl": {
    poster: "/assets/exact/crew_girl.jpg",
    backdrop: "/assets/exact/crew_girl.jpg"
  },
  "Fauda": {
    poster: "/assets/exact/fauda_popover.jpg",
    backdrop: "/assets/exact/fauda_popover.jpg"
  },
  "Queen of Tears": {
    poster: "/assets/exact/queen_of_tears.jpg",
    backdrop: "/assets/exact/queen_of_tears.jpg"
  },
  "Avatar: The Last Airbender": {
    poster: "/assets/exact/avatar_airbender.jpg",
    backdrop: "/assets/exact/avatar_airbender.jpg"
  }
};

// Top 10 specific vertical posters
const top10Posters = {
  1408162: "/assets/exact/top10_1_vishwanath.jpg",
  1303331: "/assets/exact/top10_2_dhamaal_4.jpg",
  1489543: "/assets/exact/top10_3_gdn.jpg",
  1355228: "/assets/exact/top10_4_gandhari.jpg",
  1423253: "/assets/exact/top10_5_korean_kanakaraju.jpg"
};

// Update items in all rows
function updateRowItems(rows) {
  if (!rows) return;
  for (const row of rows) {
    if (row.isTop10) {
      for (const item of row.items || []) {
        if (top10Posters[item.id]) {
          item.posterUrl = top10Posters[item.id];
        }
      }
    } else {
      for (const item of row.items || []) {
        if (exactAssets[item.title]) {
          item.posterUrl = exactAssets[item.title].poster;
          item.backdropUrl = exactAssets[item.title].backdrop;
        }
      }
    }
  }
}

updateRowItems(cat.homeRows);
updateRowItems(cat.rows);

// Ensure genie card is in row 4 "we_think_youll_love"
const loveRow = (cat.rows || cat.homeRows).find(r => r.id === "we_think_youll_love");
if (loveRow && !loveRow.items.find(it => it.id === 9901)) {
  loveRow.items.splice(2, 0, {
    id: 9901,
    title: "Make A Wish",
    type: "movie",
    posterUrl: "/assets/exact/genie_make_a_wish.jpg",
    backdropUrl: "/assets/exact/genie_make_a_wish.jpg",
    maturityRating: "U/A 13+",
    duration: "1h 48m",
    matchPercentage: "95% Match",
    quality: "HD",
    audio: "5.1",
    genres: ["Fantasy", "Comedy", "Romantic"],
    language: "Korean",
    overview: "An ancient magical genie grants extraordinary wishes leading to humorous twists and unforeseen romance."
  });
}

// Write back formatted
const output = "const MASTER_CATALOG = " + JSON.stringify(cat, null, 2) + ";\nmodule.exports = MASTER_CATALOG;\n";
fs.writeFileSync('catalogData.js', output);
console.log('Successfully updated catalogData.js with exact assets and 100% fidelity!');
