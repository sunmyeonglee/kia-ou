export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const fs = await import("fs");
    const path = await import("path");

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
}
