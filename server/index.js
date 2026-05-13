const pool = require("./db");

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const si = require("systeminformation");

require("dotenv").config();

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 5000;

// Store latest metrics globally
let latestMetrics = {
  cpu: 0,
  ram: 0,
  disk: 0,
  timestamp: new Date()
};

// Home Route
app.get("/", (req, res) => {
  res.send("InfraWatch Backend Running");
});

// Historical Metrics API
app.get("/metrics", async (req, res) => {

  try {

    const result = await pool.query(
      `
        SELECT *
        FROM metrics
        ORDER BY created_at DESC
        LIMIT 20
      `
    );

    res.json(result.rows);

  } catch (error) {

    console.log("Fetch Metrics Error:", error);

    res.status(500).json({
      error: "Failed to fetch metrics"
    });

  }

});

// SINGLE global telemetry collector
setInterval(async () => {

  try {

    const cpu = await si.currentLoad();

    const memory = await si.mem();

    const disk = await si.fsSize();

    const cpuUsage = Number(
      cpu.currentLoad.toFixed(2)
    );

    const ramUsage = Number(
      (
        (memory.used / memory.total) * 100
      ).toFixed(2)
    );

    const diskUsage = Number(
      disk[0].use.toFixed(2)
    );

    latestMetrics = {
      cpu: cpuUsage,
      ram: ramUsage,
      disk: diskUsage,
      timestamp: new Date()
    };

    // Save to PostgreSQL
    await pool.query(
      `
        INSERT INTO metrics (cpu, ram, disk)
        VALUES ($1, $2, $3)
      `,
      [cpuUsage, ramUsage, diskUsage]
    );

    // Broadcast to ALL connected clients
    io.emit("metrics", latestMetrics);

    console.log("Metrics Updated");

  } catch (error) {

    console.log(
      "Telemetry Error:",
      error
    );

  }

}, 5000);

// Socket Connection
io.on("connection", (socket) => {

  console.log("Client Connected");

  // Send latest metrics immediately
  socket.emit("metrics", latestMetrics);

  socket.on("disconnect", () => {

    console.log("Client Disconnected");

  });

});

// Start Server
server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});