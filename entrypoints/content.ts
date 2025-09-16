export default defineContentScript({
  matches: ["http://*", "https://*"],
  main() {
    console.log("Hello content.");
  },
});
