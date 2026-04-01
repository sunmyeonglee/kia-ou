import fs from "fs";
import path from "path";

export async function register() {
  const dirs = [
    path.join(process.cwd(), "data", "logs"),
    path.join(process.cwd(), "public", "images"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
