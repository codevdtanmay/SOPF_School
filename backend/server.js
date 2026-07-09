import app from "./src/app.js";
import connectDB from "./src/config/db.js";

export async function startServer(port = 0) {
  await connectDB();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", () => {
      const actualPort = server.address().port;
      console.log(`Backend running on port ${actualPort}`);
      resolve({ server, port: actualPort });
    });

    server.on("error", reject);
  });
}

// If server.js is run directly (npm run dev)
