import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

const socket = io("http://localhost:5000");

function App() {

  const [metrics, setMetrics] = useState({
    cpu: 0,
    ram: 0,
    disk: 0
  });

  const [history, setHistory] = useState([]);

  const [alerts, setAlerts] = useState([]);

  // Remove browser spacing
  useEffect(() => {

    document.body.style.margin = "0";
    document.body.style.background = "#020617";
    document.body.style.overflow = "hidden";

  }, []);

  // Load PostgreSQL history
  useEffect(() => {

    const fetchMetrics = async () => {

      try {

        const response = await fetch(
          "http://localhost:5000/metrics"
        );

        const data = await response.json();

        const formatted = data
          .reverse()
          .map((item) => ({
            cpu: Number(item.cpu),
            ram: Number(item.ram),
            disk: Number(item.disk),

            time: new Date(
              item.created_at
            ).toLocaleTimeString()
          }));

        setHistory(formatted);

      } catch (error) {

        console.log(
          "Fetch Metrics Error:",
          error
        );

      }

    };

    fetchMetrics();

  }, []);

  // Live Metrics
  useEffect(() => {

    socket.on("metrics", (data) => {

      const cpu = Number(data.cpu);
      const ram = Number(data.ram);
      const disk = Number(data.disk);

      setMetrics(data);

      // Alerts
      const newAlerts = [];

      if (cpu > 80) {

        newAlerts.push({
          type: "CPU",
          message: "🔴 High CPU Usage"
        });

      }

      if (ram > 90) {

        newAlerts.push({
          type: "RAM",
          message: "🟠 High RAM Usage"
        });

      }

      if (disk > 85) {

        newAlerts.push({
          type: "DISK",
          message: "🟡 High Disk Usage"
        });

      }

      setAlerts(newAlerts);

      // Smooth Chart
      setHistory((prev) => {

        const last = prev[prev.length - 1];

        const smoothCpu = last
          ? ((last.cpu + cpu) / 2).toFixed(2)
          : cpu;

        const smoothRam = last
          ? ((last.ram + ram) / 2).toFixed(2)
          : ram;

        const smoothDisk = last
          ? ((last.disk + disk) / 2).toFixed(2)
          : disk;

        const updated = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),

            cpu: Number(smoothCpu),
            ram: Number(smoothRam),
            disk: Number(smoothDisk)
          }
        ];

        return updated.slice(-20);

      });

    });

    return () => socket.off("metrics");

  }, []);

  return (

    <div style={styles.dashboard}>

      {/* Header */}
      <div style={styles.header}>

        <div>

          <p style={styles.smallText}>
            INFRAWATCH · LIVE
          </p>

          <h1 style={styles.title}>
            System Monitor
          </h1>

        </div>

        <div style={styles.liveBox}>
          🟢 Live Metrics
        </div>

      </div>

      {/* Alerts */}
      {
        alerts.length > 0 && (

          <div style={styles.alertContainer}>

            {
              alerts.map((alert, index) => (

                <div
                  key={index}
                  style={styles.alertBox}
                >
                  {alert.message}
                </div>

              ))
            }

          </div>

        )
      }

      {/* Metric Cards */}
      <div style={styles.cards}>

        <MetricCard
          title="CPU"
          value={metrics.cpu}
          color="#00c8ff"
        />

        <MetricCard
          title="RAM"
          value={metrics.ram}
          color="#00ff99"
        />

        <MetricCard
          title="DISK"
          value={metrics.disk}
          color="#ffb800"
        />

      </div>

      {/* Chart */}
      <div style={styles.chartBox}>

        <h2 style={styles.chartTitle}>
          Performance Timeline
        </h2>

        <ResponsiveContainer
          width="100%"
          height={240}
        >

          <AreaChart data={history}>

            <defs>

              <linearGradient
                id="cpu"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#00c8ff"
                  stopOpacity={0.35}
                />

                <stop
                  offset="95%"
                  stopColor="#00c8ff"
                  stopOpacity={0}
                />
              </linearGradient>

              <linearGradient
                id="ram"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#00ff99"
                  stopOpacity={0.35}
                />

                <stop
                  offset="95%"
                  stopColor="#00ff99"
                  stopOpacity={0}
                />
              </linearGradient>

              <linearGradient
                id="disk"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#ffb800"
                  stopOpacity={0.35}
                />

                <stop
                  offset="95%"
                  stopColor="#ffb800"
                  stopOpacity={0}
                />
              </linearGradient>

            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
            />

            <XAxis
              dataKey="time"
              minTickGap={35}
              tick={{
                fill: "#64748b",
                fontSize: 9
              }}
            />

            <YAxis
              domain={[0, 100]}
              tick={{
                fill: "#64748b",
                fontSize: 9
              }}
            />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#00c8ff"
              fill="url(#cpu)"
              strokeWidth={2}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="ram"
              stroke="#00ff99"
              fill="url(#ram)"
              strokeWidth={2}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="disk"
              stroke="#ffb800"
              fill="url(#disk)"
              strokeWidth={2}
              isAnimationActive={false}
            />

          </AreaChart>

        </ResponsiveContainer>

      </div>

    </div>

  );
}

function MetricCard({ title, value, color }) {

  return (

    <div
      style={{
        ...styles.card,
        borderTop: `2px solid ${color}`
      }}
    >

      <p style={styles.cardTitle}>
        {title}
      </p>

      <h1
        style={{
          ...styles.cardValue,
          color
        }}
      >
        {Number(value).toFixed(1)}%
      </h1>

      <div style={styles.progressBar}>

        <div
          style={{
            ...styles.progress,
            width: `${value}%`,
            background: color
          }}
        />

      </div>

    </div>

  );
}

const styles = {

  dashboard: {
    height: "100vh",
    background: "#020617",
    color: "white",
    padding: "18px 24px",
    fontFamily: "Arial",
    overflow: "hidden"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px"
  },

  smallText: {
    color: "#38bdf8",
    fontSize: "11px",
    letterSpacing: "3px"
  },

  title: {
    fontSize: "34px",
    marginTop: "10px",
    marginBottom: "0",
    color: "#ffffff",
    fontWeight: "700"
  },

  liveBox: {
    background:
      "linear-gradient(90deg, #064e3b, #065f46)",

    color: "#4ade80",
    padding: "10px 16px",
    borderRadius: "30px",
    fontSize: "13px",
    fontWeight: "600"
  },

  alertContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },

  alertBox: {
    background: "#3f0000",
    color: "#ff8080",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #ff4d4d"
  },

  cards: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",

    gap: "18px"
  },

  card: {
    background: "#0f172a",
    padding: "18px",
    borderRadius: "16px"
  },

  cardTitle: {
    color: "#94a3b8",
    fontSize: "13px",
    marginBottom: "10px"
  },

  cardValue: {
    fontSize: "30px",
    marginBottom: "15px"
  },

  progressBar: {
    height: "6px",
    background: "#1e293b",
    borderRadius: "10px",
    overflow: "hidden"
  },

  progress: {
    height: "100%"
  },

  chartBox: {
    background: "#0f172a",
    marginTop: "18px",
    padding: "18px",
    borderRadius: "16px"
  },

  chartTitle: {
    marginBottom: "14px",
    color: "#38bdf8",
    fontSize: "20px"
  }

};

export default App;