const express = require("express")
const functions = require("./admin/index")

const PORT = 3000;

const server = express()
  .get("/admin", (req, res) => functions.admin(req, res))
  .post("/admin", (req, res) => functions.admin(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
