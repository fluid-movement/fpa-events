# Remote Functions Setup Guide

This document explains how we've implemented Svelte 5's remote functions for type-safe data fetching in this project.

## What are Remote Functions?

Remote functions are Svelte 5's experimental feature for type-safe communication between client and server. They allow you to:

- Call server-side code from anywhere in your app (components, other functions, etc.)
- Maintain full type safety from database to UI
- Avoid the need for separate API routes or `+page.server.ts` files
- Use the same function whether rendering on server or client

## Configuration

Remote functions are enabled in `svelte.config.js`:

```javascript
export default {
  kit: {
    experimental: {
      remoteFunctions: true
    }
  },
  compilerOptions: {
    experimental: {
      async: true  // Optional: enables await in templates
    }
  }
};
```

## Project Structure

Remote functions are defined in `.remote.ts` or `.remote.js` files:

```
src/
├── lib/
│   └── events.remote.ts      # Remote functions for events
└── routes/
    └── events/
        └── +page.svelte      # Page using remote functions
```

## Example: Fetching All Events

### 1. Define the Remote Function

Create `src/lib/events.remote.ts`:

```typescript
import { query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';

export const getAllEvents = query(async () => {
  const { locals } = getRequestEvent();
  const db = locals.db;
  
  return await db.select().from(events).all();
});
```

### 2. Use in Component

In `src/routes/events/+page.svelte`:

```svelte
<script lang="ts">
  import { getAllEvents } from '$lib/events.remote';
  
  const eventsQuery = getAllEvents();
</script>

{#if eventsQuery.error}
  <p>Error: {eventsQuery.error.message}</p>
{:else if eventsQuery.loading}
  <p>Loading...</p>
{:else if eventsQuery.current}
  <ul>
    {#each eventsQuery.current as event (event.id)}
      <li>{event.name}</li>
    {/each}
  </ul>
{/if}
```

## Query Properties

Remote queries return an object with these properties:

- `loading` - Boolean indicating if the query is in progress
- `error` - Error object if the query failed
- `current` - The current data returned by the query
- `refresh()` - Method to re-fetch the data

## Alternative: Using `await` in Templates

If you enable `compilerOptions.experimental.async`, you can use `await` directly:

```svelte
<ul>
  {#each await getAllEvents() as event (event.id)}
    <li>{event.name}</li>
  {/each}
</ul>
```

When using `await`, the nearest `<svelte:boundary>` will handle loading and error states.

## Types of Remote Functions

### 1. `query` - Read data

```typescript
export const getPost = query(v.string(), async (slug) => {
  // Fetch and return data
  return post;
});
```

### 2. `form` - Handle form submissions

```typescript
export const createPost = form(
  v.object({
    title: v.string(),
    content: v.string()
  }),
  async (data) => {
    // Process form data
  }
);
```

### 3. `command` - Execute actions

```typescript
export const deletePost = command(v.string(), async (id) => {
  // Perform action
});
```

### 4. `prerender` - Prerender static data

```typescript
export const getStaticPosts = prerender(async () => {
  // Fetched at build time
  return posts;
});
```

## Validation

Use Standard Schema libraries like Valibot or Zod for validation:

```typescript
import * as v from 'valibot';
import { query } from '$app/server';

export const getPost = query(v.string(), async (slug) => {
  // slug is validated as string before this runs
});
```

## Accessing Request Context

Use `getRequestEvent()` to access SvelteKit's request context:

```typescript
import { getRequestEvent } from '$app/server';

export const getUser = query(async () => {
  const { locals, cookies } = getRequestEvent();
  // Access locals.db, cookies, etc.
});
```

## Benefits

1. **No API Routes Needed** - Remote functions generate endpoints automatically
2. **Type Safety** - Full TypeScript support from DB to UI
3. **Works Everywhere** - Call from any component, server or client
4. **Progressive Enhancement** - Forms work without JavaScript
5. **Optimistic Updates** - Easy to implement with `withOverride()`
6. **Single-Flight Mutations** - Refresh only what changed

## Test Data

We've added test data in `scripts/seed-test-data.sql`. To populate your local database:

```bash
bunx wrangler d1 execute DB --local --file=scripts/seed-test-data.sql
```

## Running the App

```bash
bun run dev
```

Then visit http://localhost:8788/events to see the events list.

## Next Steps

- Add more remote functions for creating, updating, and deleting events
- Implement form functions for user input
- Add validation schemas for all data
- Create command functions for non-form actions
- Use `prerender` for static data like categories or tags

## Resources

- [SvelteKit Remote Functions Docs](https://svelte.dev/docs/kit/remote-functions)
- [Standard Schema](https://standardschema.dev/)
- [Valibot](https://valibot.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)