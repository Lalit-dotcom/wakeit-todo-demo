import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type Todo = { id: number; title: string; done: boolean };

const sec = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)} s`);

export default function TodoApp({ wakeit, ready }: { wakeit: boolean; ready: boolean }) {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedAtMs, setLoadedAtMs] = useState<number | null>(null); // since page open
  const [addMs, setAddMs] = useState<number | null>(null); // click -> saved

  // Load the list as soon as the backend is usable.
  // Without WakeIt, `ready` is always true, so this fetch goes out immediately and hangs during a cold start.
  useEffect(() => {
    if (!ready) return;
    fetch(`${API}/api/todos`)
      .then((r) => r.json())
      .then((data: Todo[]) => {
        setTodos(data);
        setLoadedAtMs(performance.now()); // performance.now() counts from page open
      })
      .catch(() => setError("Could not load todos."));
  }, [ready]);

  async function add() {
    const text = title.trim();
    if (!text) return;
    const t0 = performance.now();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      if (!r.ok) throw new Error();
      const created: Todo = await r.json();
      setTodos((prev) => [...(prev ?? []), created]);
      setTitle("");
      setAddMs(performance.now() - t0);
    } catch {
      setError("Could not save the todo.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(todo: Todo) {
    const r = await fetch(`${API}/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    if (r.ok) setTodos((prev) => prev?.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)) ?? null);
  }

  async function remove(todo: Todo) {
    const r = await fetch(`${API}/api/todos/${todo.id}`, { method: "DELETE" });
    if (r.ok) setTodos((prev) => prev?.filter((t) => t.id !== todo.id) ?? null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-zinc-50 p-6 font-sans text-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Todo list</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            wakeit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          WakeIt: {wakeit ? "ON" : "OFF"}
        </span>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!ready}
          maxLength={200}
          placeholder={ready ? "What needs doing?" : "Server is waking up..."}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:bg-zinc-100"
        />
        <button
          type="submit"
          disabled={!ready || busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {busy ? "Saving..." : "Add"}
        </button>
      </form>

      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-zinc-200 bg-white p-2">
        {todos === null ? (
          <p className="p-4 text-sm text-zinc-500">
            {ready ? "Loading todos..." : "Waiting for the server. The list will load automatically."}
          </p>
        ) : todos.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">Nothing yet. Add your first todo.</p>
        ) : (
          <ul>
            {todos.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2 last:border-0">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
                <span className={`flex-1 text-sm ${t.done ? "text-zinc-400 line-through" : ""}`}>{t.title}</span>
                <button onClick={() => remove(t)} className="text-xs text-zinc-400 hover:text-red-600">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-4 rounded-lg bg-zinc-100 p-3 font-mono text-xs text-zinc-600">
        <div>List visible at: {sec(loadedAtMs)} after page open</div>
        <div>Last add took: {sec(addMs)}</div>
      </footer>
    </main>
  );
}
