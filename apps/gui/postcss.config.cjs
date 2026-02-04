const path = require("node:path");
const tailwind = require("@tailwindcss/postcss");
const autoprefixer = require("autoprefixer");

module.exports = {
  plugins: [tailwind({ config: path.join(__dirname, "tailwind.config.cjs") }), autoprefixer],
};
