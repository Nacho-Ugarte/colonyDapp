#!/bin/bash

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-colony-network-build)
      SKIP_COLONY_NETWORK_BUILD=true
      ;;
    --skip-server-build)
      SKIP_SERVER_BUILD=true
      ;;
    --skip-subgraph-build)
      SKIP_SUBGRAPH_BUILD=true
      ;;
    --skip-graph-node-build)
      SKIP_GRAPH_NODE_BUILD=true
      ;;
    --skip-reputationMonitor-build)
      SKIP_REPUTATIONMONITOR=true
      ;;
    *)
      echo "Invalid argument: $1"
      exit 1
  esac
  shift
done

# Paths
LIB_PATH="src/lib"
ENV_FILE="./.env"

NETWORK="colonyNetwork"
SERVER="colonyServer"
SUBGRAPH="subgraph"
GRAPH_NODE="graph-node"
REPUTATIONMONITOR="reputationMonitor"

ROOT_PATH=$(pwd)

YARN="${ROOT_PATH}/node_modules/.bin/yarn"

log() {
  # Colors
  GREEN=`tput setaf 2`
  NC=`tput sgr0`
  # Weights
  BOLD=`tput bold`
  echo "${GREEN}${BOLD}$1${NC}"
}

warn() {
  # Colors
  RED=`tput setaf 3`
  NC=`tput sgr0`
  # Weights
  BOLD=`tput bold`
  echo
  echo "${RED}${BOLD}$1${NC}"
  echo
}

err() {
  # Colors
  RED=`tput setaf 1`
  NC=`tput sgr0`
  # Weights
  BOLD=`tput bold`
  echo
  echo "${RED}${BOLD}$1${NC}"
  echo
}

# Setup the dapp's env file
if [ -f "$ENV_FILE" ]; then
    warn "El archivo Dapp .env ya existe, omitiendo generarlo"
else
    log "Generando el alrchivo .env submodulo de \"Dapp's\" "
    cp .env.example .env
fi

# For the submodules that we don't track  changes for, make sure to remove the existing
# forder first, otherwise the git submodule update won't work
if [ -f "${ROOT_PATH}/${LIB_PATH}/${SUBGRAPH}/subgraph.yaml" ]; then
  log "Removiendo la carpeta submodulo '${SUBGRAPH}' "
  rm -Rf "${ROOT_PATH}/${LIB_PATH}/${SUBGRAPH}"
fi

# Update / re-pull submodules
log "Inicializar bibliotecas de submódulos"
git submodule update --init --recursive

if [ "$SKIP_COLONY_NETWORK_BUILD" != true ]
then
    # Build network
    log "Construyendo el submodulo '${NETWORK}'"
    cd "${ROOT_PATH}/${LIB_PATH}/${NETWORK}"
    $YARN --pure-lockfile
    DISABLE_DOCKER=true $YARN provision:token:contracts
    cd ${ROOT_PATH}
else
    warn "Omitiendo la provision del submodulo '${NETWORK}'"
fi

if [ "$SKIP_SERVER_BUILD" != true ]
then
    log "Construyendo el submodulo '${SERVER}'"
    cd "${ROOT_PATH}/${LIB_PATH}/${SERVER}"
    cp .env.example .env
    mkdir -p mongo-data
    npm install
    cd ${ROOT_PATH}
else
    warn "omitiendo la provision del submodulo '${SERVER}'"
fi

# Subgraph
if [ "$SKIP_SUBGRAPH_BUILD" != true ]
then
    err "Si es la primera vez que instala, \"@graphprotocol/graph-ts\" llevará mucho tiempo"
    log "Construyendo el submodulo '${SUBGRAPH}'"
    cd "${ROOT_PATH}/${LIB_PATH}/${SUBGRAPH}"
    log "Instalando el submodulo '${SUBGRAPH}'de node_modules"
    npm install
    cd ${ROOT_PATH}
else
    warn "Skipping '${SUBGRAPH}' submodule provision"
fi

# Graph Node
if [ "$SKIP_GRAPH_NODE_BUILD" != true ]
then
    log "Construyendo el submodulo '${GRAPH_NODE}'"
    cd "${ROOT_PATH}/${LIB_PATH}/${GRAPH_NODE}"
    log "Instalando el submodulo '${GRAPH_NODE}' de node_modules"
    npm install
    cd ${ROOT_PATH}
else
    warn "Omitiendo la provision del submodulo '${GRAPH_NODE}' "
fi

if [ "$SKIP_REPUTATIONMONITOR" != true ]
then
    log "Construyendo el submodulo '${REPUTATIONMONITOR}' "
    cd "${ROOT_PATH}/${LIB_PATH}/${REPUTATIONMONITOR}"
    log "Instalando el submodulo '${REPUTATIONMONITOR}' de node_modules"
    npm install
    cd ${ROOT_PATH}
else
    warn "Omitiendo las provisiones del submodulo '${REPUTATIONMONITOR}' "
fi