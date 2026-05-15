const PROXY_CONFIG = {
  "/api": {
    "target": process.env.DOCKER_ENV === 'true' ? "http://mf-billar-backend:3000" : "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
};

module.exports = PROXY_CONFIG;
