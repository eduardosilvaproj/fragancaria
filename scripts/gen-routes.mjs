// Regenera src/routeTree.gen.ts usando @tanstack/router-generator.
import { Generator } from '@tanstack/router-generator';

const config = {
  target: 'react',
  routesDirectory: './src/routes',
  generatedRouteTree: './src/routeTree.gen.ts',
  quoteStyle: 'single',
  semicolons: false,
  disableLogging: false,
  routeFileIgnorePrefix: '-',
  indexToken: 'index',
  routeToken: 'route',
  addExtensions: false,
  disableTypes: false,
};

const generator = new Generator({
  config,
  root: process.cwd(),
});
await generator.run();
console.log('routeTree.gen.ts regenerated');
