const target = `http://localhost:${process.env.API_PORT ?? 3000}`;

export default {
  '/api': { target, secure: false },
  '/auth': { target, secure: false },
};
