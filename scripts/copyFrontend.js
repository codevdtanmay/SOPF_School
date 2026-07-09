const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "frontend", "dist");
const destination = path.join(__dirname, "..", "backend", "dist");

// Delete old dist
if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
}

// Copy new dist
fs.cpSync(source, destination, { recursive: true });

console.log("✅ Frontend copied successfully to backend/dist");
