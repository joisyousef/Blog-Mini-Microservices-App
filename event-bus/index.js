const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

app.post("/events", async (req, res) => {
  const event = req.body;

  const services = [
    "http://localhost:4000/events", // posts service
    "http://localhost:4001/events", // comments service
    "http://localhost:4002/events", // query service
  ];

  for (let url of services) {
    try {
      await axios.post(url, event);
    } catch (err) {
      console.log(`Error sending event to ${url}`);
      console.log(err.message);
    }
  }

  res.send({ status: "OK" });
});

app.listen(4005, () => {
  console.log("Event Bus listening on 4005");
});
