// server.js
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

async function startServer() {
  await connectDB();

  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      console.log(`Backend running on port ${port}`);
      resolve({ server, port });
    });

    server.on("error", reject);
  });
}

export { startServer };