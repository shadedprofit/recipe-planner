import { RecipeSchema, type Recipe } from 'recipe-planner-shared';
import { getDb } from '../db/database';

export function saveRecipes(recipes: Recipe[]): void {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO recipes (id, payload) VALUES (@id, @payload)');
  const insertMany = db.transaction((rows: Recipe[]) => {
    for (const recipe of rows) {
      insert.run({ id: recipe.id, payload: JSON.stringify(recipe) });
    }
  });
  insertMany(recipes);
}

export function getRecipeById(id: string): Recipe | null {
  const db = getDb();
  const row = db.prepare('SELECT payload FROM recipes WHERE id = ?').get(id) as
    | { payload: string }
    | undefined;
  if (!row) return null;
  return RecipeSchema.parse(JSON.parse(row.payload));
}
