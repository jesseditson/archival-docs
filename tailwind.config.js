/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.liquid", "./layout/*.liquid"],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "976px",
      xl: "1440px",
    },
    colors: {
      blue: "#1fb6ff",
      purple: "rgb(167, 106, 207)",
      pink: "#ff49db",
      "pink-light": "rgb(259, 251, 249)",
      "teal-dark": "#008080",
      peach: "#FDEFE9",
      orange: "#ff7849",
      green: "#13ce66",
      yellow: "#ffc82c",
      "gray-dark": "#273444",
      gray: "rgb(230,230,230)",
      "gray-light": "rgb(240,240,240)",
    },
    fontFamily: {
      "section-title": ["paradigm-pro", "sans-serif"],
      sans: ["nunito-sans", "sans-serif"],
      header: ["lorimer-no-2", "serif"],
      mono: ["ff-nuvo-mono-web-pro", "monospace"],
    },
    extend: {},
  },
  plugins: [],
};
