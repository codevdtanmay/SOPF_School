import app from "./src/app.js";
import connectDB from "./src/config/db.js";

export async function startServer(port = 3000) {
  await connectDB();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Backend running on port ${port}`);
      globalThis.__schoolMgmtKeepAlive ??= setInterval(() => {}, 60 * 60 * 1000);
      resolve({ server, port });
    });

    server.on("error", reject);
  });
}

// If server.js is run directly (npm run dev)
