#!/usr/bin/env node

const kill = require('tree-kill');
const chalk = require('chalk');
const { spawn } = require("child_process");
const path = require('path');

const { PID_FILE } = require('./paths');

/*
 * Take down the docker containers that were put up by grap-node's docker-compose
 * graph-node, postgres, ipfs
 */
const downWithDockerCompose = async () => {
  await new Promise((resolve, reject) => {
    const stopProcess = spawn('docker-compose', ['stop', 'ipfs', 'postgres', 'graph-node'], {
      cwd: path.resolve(__dirname, '..', 'src/lib/graph-node/docker')
    });

    stopProcess.stdout.pipe(process.stdout);
    stopProcess.stderr.pipe(process.stderr);

    stopProcess.on('exit', errorCode => {
      if (errorCode) {
        /*original es: docker-compose "stop" process exited with code ${errorCode} */
        return reject(new Error(`El proceso de docker-compose "detener" salio el con código ${errorCode}`));
      }
      resolve();
    });
  });
  /*
   * Removed stopped docker containers
   */
  await new Promise((resolve, reject) => {
    const removeProcess = spawn('docker-compose', ['rm', '-f'], {
      cwd: path.resolve(__dirname, '..', 'src/lib/graph-node/docker')
    });

    removeProcess.stdout.pipe(process.stdout);
    removeProcess.stderr.pipe(process.stderr);

    removeProcess.on('exit', errorCode => {
      if (errorCode) {
        /*Original : docker-compose "rm" process exited with code ${errorCode}  */
        return reject(new Error(`El proceso docker-compose "rm" salio con el codigo ${errorCode}`));
      }
      resolve();
    });
  });
}

const killPromise = (pidName, pid) => {
  console.info(`Matando "${pidName}" (${pid})`);
  return new Promise((resolve, reject) => {
    kill(pid, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(pid);
    });
  });
};

const teardown = async () => {
  console.info('Cerrando todo...');
  let pids;
  try {
    pids = require(PID_FILE);
  } catch (e) {
    console.log(e);
    return console.log('Archivo PID no encontrado. Por favor termina el proceso manualmente.');
  }
  await Promise.all(Object.keys(pids).map(name => killPromise(name, pids[name])));

  /*
   * We only need cleanup if the start script also started graph-node
   * This happed, most likely, by starting the "heavy" dev script
   */
  if (!!pids['graph-node']) {
    console.log();
    console.log('Bajando el nodo "graph-node"\' instancias de docker...');
    console.log(chalk.yellowBright('Tenga en cuenta que esto puede llevar más tiempo, dependiendo de su máquina,'));
    console.log(chalk.yellowBright('y podría terminar después de que el proceso del nodo haya existido.'));
    await downWithDockerCompose();
  }
};

teardown().then(() => {

  console.info(chalk.bold.green('desmontaje hecho.'));
  process.exit(0);

}).catch(caughtError => {

  console.error('Error al derribar');
  console.error(caughtError);
  process.exit(1);

});
