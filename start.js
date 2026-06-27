import handler from './dist/server/server.js';

const PORT = process.env.PORT || 3000;

// Criar servidor HTTP simples com o handler Nitro
const server = await handler.listen({ port: PORT, host: '0.0.0.0' });

console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
