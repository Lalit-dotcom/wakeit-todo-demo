import express from "express";
import cors from "cors";
import pg from "pg";

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it in the Render dashboard (Environment tab).");
  process.exit(1);
}

// Render's *external* DB hostnames end with .render.com and need SSL.
// The *internal* URL (same region) does not.
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes(".render.com") ? { rejectUnauthorized: false } : undefined,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    done       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const app = express();
app.use(express.json());

// Optional: FRONTEND_URL="https://a.onrender.com,https://b.onrender.com". Unset = allow all.
const allowed = process.env.FRONTEND_URL?.split(",").map((s) => s.trim());
app.use(cors(allowed ? { origin: allowed } : undefined));

// WakeIt pings this route. It also touches the DB so the connection pool is warm.
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "db error" });
  }
});

app.get("/api/todos", async (_req, res) => {
  const { rows } = await pool.query("SELECT id, title, done FROM todos ORDER BY id");
  res.json(rows);
});

app.post("/api/todos", async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 200) {
    return res.status(400).json({ error: "title is required (max 200 chars)" });
  }
  const { rows } = await pool.query(
    "INSERT INTO todos (title) VALUES ($1) RETURNING id, title, done",
    [title],
  );
  res.status(201).json(rows[0]);
});

const idOf = (req) => (Number.isInteger(Number(req.params.id)) ? Number(req.params.id) : -1);

app.patch("/api/todos/:id", async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE todos SET done = $1 WHERE id = $2 RETURNING id, title, done",
    [Boolean(req.body?.done), idOf(req)],
  );
  if (!rows[0]) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.delete("/api/todos/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM todos WHERE id = $1", [idOf(req)]);
  if (!rowCount) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

// Express 5 forwards errors from async handlers here, so they become a clean 500.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Todo API listening on port ${PORT}`));
