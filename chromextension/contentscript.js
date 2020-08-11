console.log("=== Happy Cans Developer Chrome Extension (START) ===")
var s = document.createElement("script")
s.src = "https://storage.googleapis.com/code-happycansnow-com/servreq/proto.js"
s.onload = function() {
  console.log("=== Happy Cans Developer Chrome Extension (SUCCESS) ===")
}
document.lastChild.appendChild(s)
