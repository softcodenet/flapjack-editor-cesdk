import { createClient } from "@supabase/supabase-js";
import fontsJSON from "./data/fonts.json";
import palettesJSON from "./data/palettes.json";
import usersJSON from "./data/users.json";

const supabaseURL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";

// Use the service role key to bypass the policy to manipulate test data
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const dbClient = createClient(supabaseURL, supabaseKey);

type Table = {
  name: string;
  data: unknown | unknown[];
};

const TABLES: Table[] = [
  {
    name: "fonts",
    data: fontsJSON,
  },
  {
    name: "palettes",
    data: palettesJSON,
  },
];
const usersData = usersJSON;

export async function resetUsers() {
  try {
    await clearUsers();
    await seedUsers();
  } catch (err) {
    console.error(err);
  }
}

/**
 * Seed the users to the database.
 * The user id is generated by Supabase. There is no way to set the static id using the current Supabase API.
 * We do not want to have invalid users while testing. The users should not be cleared or reset during the test.
 */
async function seedUsers() {
  for (const user of usersData) {
    const { error, data } = await dbClient.auth.admin.createUser({
      email_confirm: true,
      email: user.email,
      password: user.password,
    });
    if (error || !data) throw error;
    const { email, password, ...profiles } = user;
    await dbClient.from("profiles").update(profiles).eq("id", data.user.id);
  }
}

/**
 * Remove all the users in the database.
 * We have stored all the authentication data when setup the test environment {@see ../config/globalSetup.ts}.
 * We do not want to have invalid users while testing. The users must not be cleared or reset during the test.
 */
async function clearUsers() {
  await dbClient.from("profiles").delete({ count: "exact" }).neq("email", null);
  const users = await dbClient.auth.admin.listUsers();
  for (const user of users.data.users) {
    await dbClient.auth.admin.deleteUser(user.id);
  }
}

export async function seedDatabase() {
  try {
    await Promise.all(TABLES.map((table) => seedTable(table.name, table.data)));
  } catch (err) {
    console.error(err);
  }
}

export async function clearDatabase() {
  try {
    await dbClient.storage.emptyBucket("fonts");
    await Promise.all(TABLES.map((table) => clearTable(table.name)));
  } catch (err) {
    console.error(err);
  }
}

export async function resetDatabase() {
  await clearDatabase();
  await seedDatabase();
}

async function seedTable(tableName: string, tableData: unknown[] | unknown) {
  return dbClient.from(tableName).insert(tableData);
}

async function clearTable(tableName: string) {
  return dbClient.from(tableName).delete({ count: "exact" }).neq("id", 0);
}
