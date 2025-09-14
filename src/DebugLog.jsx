import React, { useState, useEffect } from "react";

export default function DebugLog() {
  const [logs, setLogs] = useState([]);

  // Helper to push new logs
  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    // Monkey-patch console methods
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;

    console.log = (...args) => {
      origLog(...args);
      addLog(args.join(" "));
    };

    console.error = (...args) => {
      origError(...args);
      addLog("❌ " + args.join(" "));
    };

    console.warn = (...args) => {
      origWarn(...args);
      addLog("⚠️ " + args.join(" "));
    };

    return () => {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        maxHeight: "40%",
        overflowY: "auto",
        background: "black",
        color: "#0f0",
        fontSize: "12px",
        padding: "4px",
        zIndex: 9999,
        whiteSpace: "pre-wrap",
      }}
    >
      {logs.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
