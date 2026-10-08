import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupSearch() {
  console.log('Setting up pg_trgm and search vector...');

  try {
    // 1. Extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    
    // 2. Trigger function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION notes_search_vector_trigger() RETURNS trigger AS $$
      begin
        new."searchVector" :=
          setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(new.plaintext, '')), 'B');
        return new;
      end
      $$ LANGUAGE plpgsql;
    `);

    // 3. Trigger attachment
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS tsvectorupdate ON notes;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON notes FOR EACH ROW EXECUTE PROCEDURE notes_search_vector_trigger();
    `);

    // 4. Update existing rows so they get the search vector
    await prisma.$executeRawUnsafe(`
      UPDATE notes SET "searchVector" = 
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(plaintext, '')), 'B');
    `);

    // 5. Create GIN index on searchVector
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS notes_search_idx ON notes USING GIN ("searchVector");
    `);

    // 6. Create GIN index on title for fuzzy search
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS notes_title_trgm_idx ON notes USING gin (title gin_trgm_ops);
    `);

    console.log('Search setup complete.');
  } catch (err) {
    console.error('Error setting up search:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupSearch();
