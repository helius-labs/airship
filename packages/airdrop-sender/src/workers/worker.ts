addEventListener("message", (e) => {
  if (e.data === "hello") {
    postMessage("hiya!");
  }
});
