#!/bin/sh
# Publishes only the built files to the gh-pages branch, as a fresh orphan commit.
# The source stays private: Pages must never point at main.
set -e
cd "$(dirname "$0")/.."
deno task ci
if find dist -name '*.map' -o -name '*.ts' | grep -q .; then
  echo "dist/ contains source maps or source. Refusing to publish."
  exit 1
fi
remote="$(git remote get-url origin)"
deploy="$(mktemp -d)"
cp -R dist/. "$deploy"
touch "$deploy/.nojekyll"
cd "$deploy"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy built files"
git push -qf "$remote" gh-pages
rm -rf "$deploy"
