Compile the fixture with comments and TypeScript declarations removed so that
the generated lines differ from the source lines:

```console
pnpm exec tsc --ignoreConfig test/line-numbers/fixtures/provider/source.ts --module nodenext --target es2022 --sourceMap --removeComments --noCheck --outDir test/line-numbers/fixtures/provider/compiled
```
