const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  mode: "production",
  devtool: "inline-source-map",
  entry: {
    "service-worker": path.resolve(__dirname, "src", "service-worker.ts"),
    "scripts/content-script": path.resolve(
      __dirname,
      "src",
      "scripts",
      "content-script.ts"
    ),
    "popup/popup": path.resolve(__dirname, "src", "popup", "popup.ts"),
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: false,
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/manifest.json", to: "." },
        { from: "src/styles", to: "styles" },
        { from: "src/popup/popup.css", to: "popup" },
        { from: "src/assets", to: "assets" },
      ],
    }),
    new HtmlWebpackPlugin({
      chunks: ["popup/popup"],
      filename: "popup/popup.html",
      template: path.resolve(__dirname, "src", "popup", "popup.html"),
    }),
  ],
};
