const fs = require('fs');
const cat = require('./catalogData.js');

cat.games = [
  {
    id: 9001,
    title: "Stranger Things: 1984",
    tagline: "Retro Pixel Adventure",
    type: "game",
    posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    category: "Action & Adventure",
    maturityRating: "12+",
    overview: "Join Hopper and the kids for action-packed missions around Hawkins and the Upside Down in this stylized retro adventure."
  },
  {
    id: 9002,
    title: "Squid Game: Unleashed",
    tagline: "Multiplayer Battle Royale",
    type: "game",
    posterUrl: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/oaGvjB0DvdurWhf9IhSJ15VvEhu.jpg",
    category: "Party Battle",
    maturityRating: "16+",
    overview: "Compete with friends or foes in chaotic high-stakes challenges inspired by the hit series."
  },
  {
    id: 9003,
    title: "Grand Theft Auto: San Andreas",
    tagline: "The Definitive Edition",
    type: "game",
    posterUrl: "https://image.tmdb.org/t/p/w500/yG1wltFmkX5c5ocACKfpX0tp3SY.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0Glq6Y9zkqb.jpg",
    category: "Open World",
    maturityRating: "18+",
    overview: "Take control of the streets across Los Santos, San Fierro, and Las Venturas in this remastered classic."
  },
  {
    id: 9004,
    title: "Dead Cells: Netflix Edition",
    tagline: "Roguevania Masterpiece",
    type: "game",
    posterUrl: "https://image.tmdb.org/t/p/w500/bc6XIKP1TrnugYMzIIUz9YCL8VM.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/l7BDJsD2zRYHvu3G7qV1v7q5hoF.jpg",
    category: "Action Rogue-lite",
    maturityRating: "16+",
    overview: "Explore a sprawling, ever-changing castle, vanquishing fearsome bosses in frenetic 2D combat."
  }
];

const output = "const MASTER_CATALOG = " + JSON.stringify(cat, null, 2) + ";\nmodule.exports = MASTER_CATALOG;\n";
fs.writeFileSync('catalogData.js', output);
console.log('Games updated successfully!');
