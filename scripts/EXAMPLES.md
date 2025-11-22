# Drizzle Seed Examples

Common patterns and examples for extending the seed script.

## Table of Contents

- [Basic Customization](#basic-customization)
- [Custom Generators](#custom-generators)
- [Weighted Distributions](#weighted-distributions)
- [Relationships](#relationships)
- [Date Handling](#date-handling)
- [Conditional Data](#conditional-data)
- [Custom IDs](#custom-ids)

---

## Basic Customization

### Change the Number of Records

```typescript
await seed(db, schema).refine((f) => ({
  users: {
    count: 500,  // Create 500 users instead of 100
  },
  events: {
    count: 200,  // Create 200 events
  }
}));
```

### Use Different Seed for Random Data

```typescript
// Same data every time with seed: 42
await seed(db, schema, { seed: 42 }).refine((f) => ({ ... }));

// Different data with a different seed
await seed(db, schema, { seed: 99 }).refine((f) => ({ ... }));

// Random data every time (no seed)
await seed(db, schema).refine((f) => ({ ... }));
```

---

## Custom Generators

### Custom Email Domains

```typescript
users: {
  columns: {
    email: f.email({ domain: 'example.com' })  // All emails @example.com
  }
}
```

### Custom Phone Number Format

```typescript
users: {
  columns: {
    phone: f.phoneNumber({ template: '+1 (###) ###-####' })
  }
}
```

### Custom Arrays of Values

```typescript
events: {
  columns: {
    type: f.valuesFromArray({ 
      values: ['conference', 'workshop', 'meetup', 'webinar'] 
    }),
    priority: f.valuesFromArray({ 
      values: ['low', 'medium', 'high', 'urgent'] 
    })
  }
}
```

---

## Weighted Distributions

### 80/20 Split

```typescript
users: {
  columns: {
    // 80% free tier, 20% premium
    tier: f.weightedRandom([
      { weight: 0.8, value: f.default({ defaultValue: 'free' }) },
      { weight: 0.2, value: f.default({ defaultValue: 'premium' }) }
    ])
  }
}
```

### Multiple Weighted Options

```typescript
events: {
  columns: {
    // 50% small, 30% medium, 15% large, 5% extra-large
    capacity: f.weightedRandom([
      { weight: 0.5, value: f.int({ minValue: 10, maxValue: 50 }) },
      { weight: 0.3, value: f.int({ minValue: 51, maxValue: 100 }) },
      { weight: 0.15, value: f.int({ minValue: 101, maxValue: 200 }) },
      { weight: 0.05, value: f.int({ minValue: 201, maxValue: 500 }) }
    ])
  }
}
```

### Nullable Fields with Weights

```typescript
events: {
  columns: {
    // 70% have a picture, 30% don't
    picture: f.weightedRandom([
      { weight: 0.3, value: f.default({ defaultValue: null }) },
      { weight: 0.7, value: f.valuesFromArray({ values: ['/img1.jpg', '/img2.jpg'] }) }
    ])
  }
}
```

---

## Relationships

### Fixed Number of Related Records

```typescript
users: {
  count: 50,
  with: {
    posts: 10  // Each user gets exactly 10 posts
  }
}
```

### Variable Number (Array)

```typescript
users: {
  with: {
    // Each user gets 5, 10, 15, or 20 posts (equal chance)
    posts: [5, 10, 15, 20]
  }
}
```

### Weighted Related Records

```typescript
events: {
  with: {
    schedules: [
      { weight: 0.5, count: [2, 3] },      // 50% chance: 2-3 schedules
      { weight: 0.3, count: [4, 5, 6] },   // 30% chance: 4-6 schedules
      { weight: 0.2, count: [7, 8, 9, 10] } // 20% chance: 7-10 schedules
    ]
  }
}
```

### Multiple Relationships

```typescript
events: {
  with: {
    schedules: [2, 3, 4],
    eventMagicLinks: 1,
    eventUsers: [10, 15, 20, 25]  // Each event has 10-25 attendees
  }
}
```

---

## Date Handling

### Recent Dates

```typescript
events: {
  columns: {
    createdAt: f.date({
      minDate: '2024-01-01',
      maxDate: '2024-12-31'
    })
  }
}
```

### Past Year

```typescript
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

events: {
  columns: {
    createdAt: f.date({
      minDate: oneYearAgo.toISOString().split('T')[0],
      maxDate: new Date().toISOString().split('T')[0]
    })
  }
}
```

### Future Dates

```typescript
const today = new Date();
const nextYear = new Date();
nextYear.setFullYear(nextYear.getFullYear() + 1);

events: {
  columns: {
    startDate: f.date({
      minDate: today.toISOString().split('T')[0],
      maxDate: nextYear.toISOString().split('T')[0]
    })
  }
}
```

### Ensuring End After Start

```typescript
// Note: drizzle-seed doesn't have built-in logic for this
// You may need to handle this in your schema defaults or post-processing
events: {
  columns: {
    startDate: f.date({ minDate: '2024-01-01', maxDate: '2024-12-31' }),
    // For endDate, you might need custom logic after seeding
    endDate: f.date({ minDate: '2024-01-01', maxDate: '2024-12-31' })
  }
}
```

---

## Conditional Data

### Optional Fields

```typescript
users: {
  columns: {
    // 20% have a middle name, 80% don't
    middleName: f.weightedRandom([
      { weight: 0.8, value: f.default({ defaultValue: null }) },
      { weight: 0.2, value: f.firstName() }
    ]),
    
    // 30% have a bio, 70% don't
    bio: f.weightedRandom([
      { weight: 0.7, value: f.default({ defaultValue: null }) },
      { weight: 0.3, value: f.loremIpsum() }
    ])
  }
}
```

### Status-Based Logic

```typescript
eventUser: {
  columns: {
    status: f.weightedRandom([
      { weight: 0.6, value: f.valuesFromArray({ values: ['confirmed'] }) },
      { weight: 0.2, value: f.valuesFromArray({ values: ['pending'] }) },
      { weight: 0.15, value: f.valuesFromArray({ values: ['maybe'] }) },
      { weight: 0.05, value: f.valuesFromArray({ values: ['cancelled'] }) }
    ]),
    
    // You could add conditional logic here based on status
    // but drizzle-seed doesn't support cross-column dependencies
  }
}
```

---

## Custom IDs

### Sequential IDs

```typescript
import { createHash } from 'crypto';

function generateId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(6, '0')}`;
}

users: {
  columns: {
    id: f.default({
      defaultValue: (ctx) => generateId('user', ctx.rowIndex)
      // Produces: user_000001, user_000002, etc.
    })
  }
}
```

### Hash-Based IDs

```typescript
function generateHashId(prefix: string, index: number): string {
  const hash = createHash('sha256')
    .update(`${prefix}-${index}`)
    .digest('hex');
  return hash.substring(0, 16);
}

events: {
  columns: {
    id: f.default({
      defaultValue: (ctx) => generateHashId('event', ctx.rowIndex)
    })
  }
}
```

### UUID-style IDs

```typescript
import { randomUUID } from 'crypto';

users: {
  columns: {
    id: f.default({
      defaultValue: () => randomUUID()
    })
  }
}
```

---

## Complete Custom Example

Here's a complete example combining multiple patterns:

```typescript
import { seed } from 'drizzle-seed';
import { createHash } from 'crypto';

function generateId(prefix: string, index: number): string {
  const hash = createHash('sha256').update(`${prefix}-${index}`).digest('hex');
  return hash.substring(0, 16);
}

await seed(db, schema, { seed: 42 }).refine((f) => ({
  users: {
    count: 200,
    columns: {
      id: f.default({
        defaultValue: (ctx) => generateId('user', ctx.rowIndex)
      }),
      name: f.fullName(),
      email: f.email(),
      role: f.weightedRandom([
        { weight: 0.85, value: f.default({ defaultValue: 'user' }) },
        { weight: 0.10, value: f.default({ defaultValue: 'moderator' }) },
        { weight: 0.05, value: f.default({ defaultValue: 'admin' }) }
      ]),
      bio: f.weightedRandom([
        { weight: 0.6, value: f.default({ defaultValue: null }) },
        { weight: 0.4, value: f.loremIpsum() }
      ]),
      verified: f.weightedRandom([
        { weight: 0.7, value: f.default({ defaultValue: true }) },
        { weight: 0.3, value: f.default({ defaultValue: false }) }
      ])
    }
  },
  
  events: {
    count: 100,
    columns: {
      id: f.default({
        defaultValue: (ctx) => generateId('event', ctx.rowIndex)
      }),
      name: f.valuesFromArray({
        values: [
          'Tech Conference 2024',
          'Developer Meetup',
          'Product Launch',
          'Workshop: Advanced TypeScript'
        ]
      }),
      capacity: f.weightedRandom([
        { weight: 0.4, value: f.int({ minValue: 20, maxValue: 50 }) },
        { weight: 0.4, value: f.int({ minValue: 51, maxValue: 100 }) },
        { weight: 0.2, value: f.int({ minValue: 101, maxValue: 500 }) }
      ]),
      location: f.city(),
      description: f.loremIpsum(),
      featured: f.weightedRandom([
        { weight: 0.9, value: f.default({ defaultValue: false }) },
        { weight: 0.1, value: f.default({ defaultValue: true }) }
      ])
    },
    with: {
      schedules: [
        { weight: 0.5, count: [2, 3] },
        { weight: 0.3, count: [4, 5] },
        { weight: 0.2, count: [6, 7, 8] }
      ]
    }
  }
}));
```

---

## Tips and Tricks

1. **Use meaningful seed values**: `seed: 42` is reproducible, useful for testing
2. **Start small**: Test with `count: 10` first, then scale up
3. **Check constraints**: Make sure your weights add up to 1.0
4. **Use realistic data**: Better for demos and testing edge cases
5. **Document your choices**: Comment why you chose specific distributions

## Learn More

- [Main README](./README.md) - Full documentation
- [Quick Start](./QUICK-START.md) - Get started in 3 steps
- [Drizzle Seed Docs](https://orm.drizzle.team/docs/seed-overview) - Official documentation