#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');
const fs = require('fs');
const args = require('minimist')(process.argv);
const chalk = require('chalk');
var sudo = require('sudo-prompt');
const fetchRetry = require('@adobe/node-fetch-retry');

const startGanache = require('./start_ganache');
const deployContracts = require('./deploy_contracts');

const { PID_FILE } = require('./paths');
const { getStaticDevResource, injectEnvironmentVariables } = require('./utils');

injectEnvironmentVariables('NODE_ENV');

const processes = [];

const addProcess = (name, startFn) => {
  processes.push({ name, startFn });
};

addProcess('ganache', startGanache);

addProcess('truffle', () =>
  new Promise((resolve, reject) => {
    const contractProcess = deployContracts();
    contractProcess.on(
      'exit',
      code =>
        code ? reject(new Error('Contract deployment failed')) : resolve(contractProcess),
    );
    contractProcess.on('error', reject);
  })
);

addProcess('oracle', async () => {
  const networkAddress = require('../src/lib/colonyNetwork/etherrouter-address.json').etherRouterAddress;
  const minerProcess = spawn('node', ['node_modules/.bin/babel-node', '--presets', '@babel/preset-env', 'src/lib/colonyNetwork/packages/reputation-miner/bin/index.js', '--minerAddress', '0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4', '--syncFrom', '1', '--colonyNetworkAddress', networkAddress, '--oracle', '--auto', '--dbPath', 'src/lib/colonyNetwork/packages/reputation-miner/reputationStates.sqlite', '--oraclePort', '3002', '--processingDelay', '1'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });

  if (args.foreground) {
    minerProcess.stdout.pipe(process.stdout);
    minerProcess.stderr.pipe(process.stderr);
  }
  minerProcess.on('error', error => {
    minerProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
  });
  await waitOn({ resources: ['tcp:3002'] });
  return minerProcess;
});

addProcess('reputationMonitor', async () => {
  const networkAddress = require('../src/lib/colonyNetwork/etherrouter-address.json').etherRouterAddress;
  const monitorProcess = spawn('node', ['src/lib/reputationMonitor/index.js', networkAddress], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });

  if (args.foreground) {
    monitorProcess.stdout.pipe(process.stdout);
    monitorProcess.stderr.pipe(process.stderr);
  }
  monitorProcess.on('error', error => {
    monitorProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
  });
  await waitOn({ resources: ['tcp:3001'] });

  return monitorProcess;
});

addProcess('db', async () => {
  const dbProcess = spawn('npm', ['run', 'db:start'], {
    cwd: path.resolve(__dirname, '..', 'src/lib/colonyServer'),
    stdio: 'pipe',
  });
  if (args.foreground) {
    dbProcess.stdout.pipe(process.stdout);
    dbProcess.stderr.pipe(process.stderr);
  }
  dbProcess.on('error', e => {
    console.error(e);
    dbProcess.kill();
  });
  await waitOn({ resources: ['tcp:27018'] });
  const cleanProcess = spawn('npm', ['run', 'db:clean'], {
    cwd: path.resolve(__dirname, '..', 'src/lib/colonyServer'),
    stdio: 'pipe',
  });
  if (args.foreground) {
    cleanProcess.stdout.pipe(process.stdout);
    cleanProcess.stderr.pipe(process.stderr);
  }
  /*Original: new Error(`Clean process exited with code ${cleanCode}`)); */
  await new Promise((resolve, reject) => {
    cleanProcess.on('exit', cleanCode => {
      if (cleanCode) {
        dbProcess.kill();
        return reject(new Error(`Proceso limpio terminado con código ${cleanCode}`));
      }
      const setupProcess = spawn('npm', ['run', 'db:setup'], {
        cwd: path.resolve(__dirname, '..', 'src/lib/colonyServer'),
      });
      setupProcess.on('exit', setupCode => {
        if (setupCode) {
          dbProcess.kill();
          /* Original: Setup process exited with code */
          return reject(new Error(`Proceso de configuración terminado con código ${setupCode}`));
        }
        resolve();
      });
    });
  });
  return dbProcess;
});

addProcess('server', async () => {
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.resolve(__dirname, '..', 'src/lib/colonyServer'),
    stdio: 'pipe',
  });
  if (args.foreground) {
    serverProcess.stdout.pipe(process.stdout);
    serverProcess.stderr.pipe(process.stderr);
  }
  serverProcess.on('error', e => {
    serverProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
  });
  await waitOn({ resources: ['tcp:3000'] });
  return serverProcess;
});

addProcess('graph-node', async () => {
  await new Promise(resolve => {
    console.log(); // New line
    /*Original: Cleaning up the old graph-node docker data folder. For this we need', chalk.bold.red('ROOT'), '' */
    console.log('Limpieza de la antigua carpeta de datos de la ventana acoplable del nodo gráfico. Para esto necesitamos', chalk.bold.red('ROOT'), 'permissions');
    sudo.exec(`rm -Rf ${path.resolve(__dirname, '..', 'src/lib/graph-node/docker/data')}`, {name: 'GraphNodeCleanup'},
      function (error) {
        if (error) {
          /*Orignal log:  */
          throw new Error(`El proceso de limpieza del nodo gráfico falló: ${error}`);
        };
        resolve();
      }
    );
  });

  await new Promise((resolve, reject) => {
    const setupProcess = spawn('node', ['./setup_graph_node.js'], {
      cwd: path.resolve(__dirname),
    });

    console.log(); // New line
    /*Original log: Setting up docker-compose with the local environment ...  */
    console.log('Configurando la composicion de docker con el entorno local...');

    if (args.foreground) {
      setupProcess.stdout.pipe(process.stdout);
      setupProcess.stderr.pipe(process.stderr);
    }

    setupProcess.on('exit', errorCode => {
      if (errorCode) {
        /*Original log:  Setup process exited with code*/
        return reject(new Error(`El proceso de configuración terminado con código ${errorCode}`));
      }
      resolve();
    });
  });

  const graphNodeProcess = spawn('docker-compose', ['up'], {
    cwd: path.resolve(__dirname, '..', 'src/lib/graph-node/docker'),
  });

  if (args.foreground) {
    graphNodeProcess.stdout.pipe(process.stdout);
    graphNodeProcess.stderr.pipe(process.stderr);
  }

  graphNodeProcess.on('error', error => {
    graphNodeProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
  });

  return graphNodeProcess;
});

addProcess('subgraph', async () => {

  /*
   * Wait for the
   */
  await fetchRetry('http://localhost:8000', {
    retryOptions: {
      /*
       * Max try time of 5 minutes
       * If it's not up by now we should just give up...
       */
      retryMaxDuration: 300000,  // 5m retry max duration
      /*
       * Wait a second before retrying
       */
      retryInitialDelay: 5000,
      /*
       * Don't backoff, just keep hammering
       */
      retryBackoff: 1.0
    }
  });

  await new Promise((resolve, reject) => {
    const codeGenProcess = spawn('npm', ['run', 'codegen'], {
      cwd: path.resolve(__dirname, '..', 'src/lib/subgraph'),
    });

    console.log(); // New line
    /*Original log: Generating subgraph types and schema ... */
    console.log('Generando tipos de subgrafos y esquemas...');

    if (args.foreground) {
      codeGenProcess.stdout.pipe(process.stdout);
      codeGenProcess.stderr.pipe(process.stderr);
    }

    codeGenProcess.on('exit', errorCode => {
      if (errorCode) {
        /*Original log: Codegen process exited with code */
        return reject(new Error(`El proceso Codegen finalizo con el código ${errorCode}`));
      }
      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    const createLocalProcess = spawn('npm', ['run', 'create-local'], {
      cwd: path.resolve(__dirname, '..', 'src/lib/subgraph'),
    });

    console.log(); // New line
    /*Original log: Creating a local subgraph instance ... */
    console.log('Creando una instancia de subgrafo local...');

    if (args.foreground) {
      createLocalProcess.stdout.pipe(process.stdout);
      createLocalProcess.stderr.pipe(process.stderr);
    }

    createLocalProcess.on('exit', errorCode => {
      if (errorCode) {
         /*Original log: Create local process exited with code ${errorCode} */
        return reject(new Error(`Crear proceso local salido con código ${errorCode}`));
      }
      resolve();
    });
  });

  const deployLocalProcess = spawn('npm', ['run', 'deploy-local'], {
    cwd: path.resolve(__dirname, '..', 'src/lib/subgraph'),
  });

  console.log(); // New line
  /*Original log: Deploying the local subgraph instance ... */
  console.log('Desplegando la instancia de subgrafo local...');

  if (args.foreground) {
    deployLocalProcess.stdout.pipe(process.stdout);
    deployLocalProcess.stderr.pipe(process.stderr);
  }

  deployLocalProcess.on('error', error => {
    deployLocalProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
  });

  return deployLocalProcess;
});

addProcess('webpack', () =>
  new Promise((resolve, reject) => {
    let webpackArgs = ['run', 'webpack'];
    const webpackProcess = spawn('npm', webpackArgs, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });
    webpackProcess.stdout.on('data', chunk => {
      if (chunk.includes('Compiled successfully')) resolve(webpackProcess);
    });
    if (args.foreground) {
      webpackProcess.stdout.pipe(process.stdout);
      webpackProcess.stderr.pipe(process.stderr);
    }
    webpackProcess.on('error', error => {
      webpackProcess.kill();
    /*
     * @NOTE Just stop the startup orchestration process is something goes wrong
     */
    console.error(error);
    process.exit(1);
    });
  })
);

const pids = {};
const startAll = async () => {
  const startSerial = processes.reduce((promise, process) => {
    if (`skip-${process.name}` in args) {
      console.info(chalk.yellow(`Skipping ${process.name}`));
      return promise;
    };
    return promise
      .then(() => {
        console.log(); // New line before logging the process start
        console.info(chalk.bold.green(`Starting ${process.name}...`));
        return process.startFn();
      })
      .then(proc => {
        pids[process.name] = proc.pid;
        fs.writeFileSync(PID_FILE, JSON.stringify(pids));
      });
  }, Promise.resolve(true));

  try {
    await startSerial;
  } catch (caughtError) {
    console.info(chalk.redBright('El inicio de la pila falló.'));
    console.info(chalk.redBright(caughtError.message));
    process.exit(1);
  }

  console.log(); // New line
  console.info(chalk.bold.green('La pila se inició con éxito.'));

  console.log(); // New line
  console.log('------------------------------------------------------------');
  console.log(); // New line
  console.log(chalk.bold('Recursos de desarrollo disponibles:'));
  console.log(); // New line
  Object.keys(pids)
    .map(pidName => getStaticDevResource(pidName)
      .map(({ desc, res }) =>
        console.log(`* ${desc}:`, chalk.greenBright(res)),
      ),
    );
  if (!pids.webpack) {
    getStaticDevResource('webpack').map(({ desc, res }) =>
      console.log(chalk.dim(`* ${desc} (después de empezar 'webpack'):`), chalk.gray(res)),
    );
  }
  console.log(); // New line
  console.log('------------------------------------------------------------');
};

process.on('SIGINT', () => {
  spawn(path.resolve(__dirname, 'stop_all.js'), {
    detached: true,
    stdio: 'inherit',
  });
  process.exit(0);
});

startAll().catch(caughtError => {
  console.error('Error al iniciar');
  console.error(caughtError);
  process.exit(1);
});
