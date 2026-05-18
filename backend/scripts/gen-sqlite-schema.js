const fs = require('fs');
const path = require('path');

function main() {
  const root = path.join(__dirname, '..');
  const srcPath = path.join(root, 'prisma', 'schema.prisma');
  const outDir = path.join(root, 'generated');
  const outPath = path.join(outDir, 'schema.sqlite.prisma');

  const src = fs.readFileSync(srcPath, 'utf8');
  let out = src;

  // Switch provider to sqlite
  out = out.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');

  // SQLite does not support scalar lists; store tags as Json array instead
  out = out.replace(
    /tags\s+String\[\]\s*\/\/ For search and filtering/g,
    'tags       Json // tags array (sqlite-compatible)'
  );

  // Remove Postgres-only native type annotations
  out = out.replace(/\s+@db\.Decimal\(10, 2\)/g, '');
  out = out.replace(/\s+@db\.Text\b/g, '');

  // Point generator output to a separate sqlite client folder
  out = out.replace(
    /generator\s+client\s*\{([\s\S]*?)\}/m,
    (block) => {
      if (block.includes('output')) return block;
      return block.replace(/\}\s*$/, `  output   = "../generated/sqlite-client"\n}\n`);
    }
  );

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, out, 'utf8');
  process.stdout.write(outPath);
}

main();
