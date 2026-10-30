// app.js
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create table if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY,
        todo TEXT,
        priority TEXT,
        status TEXT
      );
    `);

    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// Utility helpers for query conditions
const hasStatus = (query) => query.status !== undefined;
const hasPriority = (query) => query.priority !== undefined;
const hasStatusAndPriority = (query) =>
  query.status !== undefined && query.priority !== undefined;

// API 1
// GET /todos/?status=TO%20DO
// GET /todos/?priority=HIGH
// GET /todos/?priority=HIGH&status=IN%20PROGRESS
// GET /todos/?search_q=Play
app.get("/todos/", async (request, response) => {
  const { status, priority, search_q = "" } = request.query;
  let getTodosQuery = "";

  switch (true) {
    case hasStatusAndPriority(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE status = '${status}' AND priority = '${priority}';`;
      break;
    case hasStatus(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE status = '${status}';`;
      break;
    case hasPriority(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE priority = '${priority}';`;
      break;
    default:
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%';`;
  }

  const todos = await db.all(getTodosQuery);
  response.send(todos);
});

// API 2
// GET /todos/:todoId/
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

// API 3
// POST /todos/
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;
  const createTodoQuery = `
    INSERT INTO
      todo (id, todo, priority, status)
    VALUES
      (${id}, '${todo}', '${priority}', '${status}');`;
  await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

// API 4
// PUT /todos/:todoId/
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo } = request.body;

  let updateColumn = "";
  let updateQuery = "";

  if (status !== undefined) {
    updateColumn = "Status Updated";
    updateQuery = `
      UPDATE todo
      SET status = '${status}'
      WHERE id = ${todoId};`;
  } else if (priority !== undefined) {
    updateColumn = "Priority Updated";
    updateQuery = `
      UPDATE todo
      SET priority = '${priority}'
      WHERE id = ${todoId};`;
  } else if (todo !== undefined) {
    updateColumn = "Todo Updated";
    updateQuery = `
      UPDATE todo
      SET todo = '${todo}'
      WHERE id = ${todoId};`;
  }

  await db.run(updateQuery);
  response.send(updateColumn);
});

// API 5
// DELETE /todos/:todoId/
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;