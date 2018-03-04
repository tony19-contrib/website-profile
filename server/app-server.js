const {startServer: polyserveStartServer} = require('polyserve');
const projectConfig = require('../polymer.json');
const chalk = require('chalk');
const cors = require('cors');
const path = require('path');

/**
 * Starts the front-end server in dev mode
 */
async function startServer({appPort, root, apiServerPort}) {
  const serverOptions = {
    compile: projectConfig.compile,
    entryPoint: projectConfig.entryPoint,
    basePath: projectConfig.basePath.replace(/(^\/|\/$)/g, ''),
    proxy: {
      path: 'b',
      target: `http://localhost:${apiServerPort}`
    },
    root: root || projectConfig.root,
    port: appPort,
  };

  const server = await polyserveStartServer(serverOptions, app => {
    setupUrlRewriter(app, serverOptions);
    insertLastRouteAsMiddleware(app);

    app.use(cors());
    insertLastRouteAsMiddleware(app);

    return app;
  });

  const serverAddress = server._connectionKey.replace(/^\d+:/, 'http://');
  console.log(chalk.gray(`app server root directory: ${path.join(process.cwd(), serverOptions.root)}`));
  console.log(`app listening on ${serverAddress}`)
}

function insertLastRouteAsMiddleware(app) {
  // XXX: polyserve currently installs a wildcard route that prevents
  // insertion of middleware, so move our newly created route to the
  // stack index right before the wildcard route.
  const indexOfWildcardRoute = app._router.stack.findIndex(r => r.route && r.route.path.match(/^\/?\*/g));
  if (indexOfWildcardRoute > -1) {
    const newRoute = app._router.stack.pop();
    app._router.stack.splice(indexOfWildcardRoute, 0, newRoute);
  }
}

function setupUrlRewriter(app, {basePath, root}) {
  const urlSearchRegex = new RegExp(`^/(${basePath}|${root})`);
  app.use((req, res, next) => {
    req.url = req.url.replace(urlSearchRegex, '');
    return next();
  });
}

module.exports = {
  startServer
};
