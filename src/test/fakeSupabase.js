// A small in-memory stand-in for the supabase-js client, for route tests.
//
// It implements only the calls the Stripe routes make against public.users:
//
//   .from('users').select(cols).eq(col, value).maybeSingle()
//   .from('users').update(changes).eq(col, value)
//   .from('users').insert(row)
//   .from('users').upsert(row, { onConflict: 'id' })
//
// Results have the same { data, error } shape supabase-js returns. Anything else
// throws, so a route that starts using a new call fails loudly here instead of
// passing against a fake that does not model it.

const UNIQUE_COLUMNS = ['id', 'email']

export function createFakeSupabase(initialRows = []) {
  const rows = initialRows.map((row) => ({ ...row }))
  const failures = {}

  function fail(operation) {
    const message = failures[operation]
    return message ? { data: null, error: { message } } : null
  }

  function conflict(row, ignoreId) {
    return UNIQUE_COLUMNS.find((column) =>
      rows.some((other) => other.id !== ignoreId && row[column] != null && other[column] === row[column]),
    )
  }

  function from(table) {
    if (table !== 'users') throw new Error(`fakeSupabase: unexpected table "${table}"`)

    return {
      select() {
        const filters = []
        const query = {
          eq(column, value) {
            filters.push([column, value])
            return query
          },
          async maybeSingle() {
            const failed = fail('select')
            if (failed) return failed
            const matches = rows.filter((row) => filters.every(([column, value]) => row[column] === value))
            if (matches.length > 1) {
              return { data: null, error: { message: 'more than one row returned' } }
            }
            return { data: matches[0] ? { ...matches[0] } : null, error: null }
          },
        }
        return query
      },

      update(changes) {
        return {
          async eq(column, value) {
            const failed = fail('update')
            if (failed) return failed
            for (const row of rows) {
              if (row[column] === value) Object.assign(row, changes)
            }
            return { data: null, error: null }
          },
        }
      },

      async insert(row) {
        const failed = fail('insert')
        if (failed) return failed
        const column = conflict(row)
        if (column) {
          return { data: null, error: { message: `duplicate key value violates unique constraint on ${column}` } }
        }
        if (row.email == null) {
          return { data: null, error: { message: 'null value in column "email" violates not-null constraint' } }
        }
        rows.push({ tier: 'free', stripe_customer_id: null, stripe_subscription_id: null, subscription_status: null, ...row })
        return { data: null, error: null }
      },

      async upsert(row, options) {
        if (options?.onConflict !== 'id') throw new Error('fakeSupabase: upsert expects { onConflict: "id" }')
        const failed = fail('upsert')
        if (failed) return failed
        const existing = rows.find((other) => other.id === row.id)
        if (!existing) return this.insert(row)
        const column = conflict(row, row.id)
        if (column) {
          return { data: null, error: { message: `duplicate key value violates unique constraint on ${column}` } }
        }
        Object.assign(existing, row)
        return { data: null, error: null }
      },
    }
  }

  return {
    client: { from },
    // The current row for a user id, or undefined.
    row(id) {
      const found = rows.find((row) => row.id === id)
      return found ? { ...found } : undefined
    },
    rows() {
      return rows.map((row) => ({ ...row }))
    },
    // Makes every later call of one operation ('select', 'update', 'insert' or
    // 'upsert') return an error, the way an outage would.
    failOn(operation, message = 'simulated database failure') {
      failures[operation] = message
    },
  }
}
