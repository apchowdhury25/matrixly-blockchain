#!/usr/bin/env bash
# Path A: Hyperledger Fabric 2.5 test-network lab for Matrixly Trust.
# Run on a machine YOU control (8 GB RAM, Docker). Not the Grok preview VM.
#
# Usage:
#   chmod +x scripts/fabric-lab-setup.sh
#   ./scripts/fabric-lab-setup.sh          # install + up + copy certs
#   ./scripts/fabric-lab-setup.sh down     # stop network
#   ./scripts/fabric-lab-setup.sh status   # docker + channel check
set -euo pipefail

FABRIC_VERSION="${FABRIC_VERSION:-2.5.16}"
CA_VERSION="${CA_VERSION:-1.5.17}"
CHANNEL="${FABRIC_CHANNEL:-trust}"
FABRIC_HOME="${FABRIC_HOME:-$HOME/fabric}"
SAMPLES="$FABRIC_HOME/fabric-samples"
NETWORK="$SAMPLES/test-network"
SECRETS="${MATRIXLY_FABRIC_SECRETS:-$HOME/matrixly-fabric-lab}"
INSTALL_SH="https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing '$1'. Install it, then re-run." >&2
    exit 1
  }
}

mem_check() {
  local kb
  kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "$kb" -gt 0 && "$kb" -lt 7000000 ]]; then
    echo "WARNING: this machine has ~$((kb/1024)) MB RAM. Fabric test-network wants ~8 GB." >&2
    echo "Continue anyway? [y/N]"
    read -r ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] || exit 1
  fi
}

hosts_hint() {
  if grep -q 'peer0.org1.example.com' /etc/hosts 2>/dev/null; then
    echo "hosts: peer0.org1.example.com already present"
    return
  fi
  echo
  echo "Add these lines to /etc/hosts (sudo required):"
  cat <<'EOF'
127.0.0.1 peer0.org1.example.com
127.0.0.1 peer0.org2.example.com
127.0.0.1 orderer.example.com
EOF
  echo
  echo "Apply now with sudo? [y/N]"
  read -r ans
  if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
    sudo tee -a /etc/hosts >/dev/null <<'EOF'
127.0.0.1 peer0.org1.example.com
127.0.0.1 peer0.org2.example.com
127.0.0.1 orderer.example.com
EOF
  fi
}

install_fabric() {
  need curl
  need git
  need docker
  docker compose version >/dev/null
  mkdir -p "$FABRIC_HOME"
  cd "$FABRIC_HOME"
  if [[ ! -x ./install-fabric.sh ]]; then
    curl -sSLO "$INSTALL_SH"
    chmod +x install-fabric.sh
  fi
  if [[ ! -d "$SAMPLES" ]]; then
    ./install-fabric.sh --fabric-version "$FABRIC_VERSION" --ca-version "$CA_VERSION" docker binary samples
  else
    echo "fabric-samples already at $SAMPLES"
  fi
  export PATH="$SAMPLES/bin:$PATH"
  export FABRIC_CFG_PATH="$SAMPLES/config"
  peer version
}

copy_certs() {
  local org1="$NETWORK/organizations/peerOrganizations/org1.example.com"
  mkdir -p "$SECRETS"
  cp "$org1/peers/peer0.org1.example.com/tls/ca.crt" "$SECRETS/org1-tls-ca.crt"
  cp "$org1/users/User1@org1.example.com/msp/signcerts/"*.pem "$SECRETS/user1-cert.pem"
  local key
  key="$(ls "$org1/users/User1@org1.example.com/msp/keystore/"* | head -1)"
  cp "$key" "$SECRETS/user1-key.pem"
  chmod 600 "$SECRETS/user1-key.pem"
  cat >"$SECRETS/env" <<EOF
# Do not export into Matrixly preview until Gateway SDK is wired.
# After every './network.sh up' re-run this setup so certs match new crypto.
export LEDGER_ADAPTER=fabric
export FABRIC_PEER_ENDPOINT=localhost:7051
export FABRIC_MSP_ID=Org1MSP
export FABRIC_CHANNEL=$CHANNEL
export FABRIC_CHAINCODE=document-registry
export FABRIC_TLS_ROOT_CERT=$SECRETS/org1-tls-ca.crt
export FABRIC_CLIENT_CERT=$SECRETS/user1-cert.pem
export FABRIC_CLIENT_KEY=$SECRETS/user1-key.pem
export FABRIC_TIMEOUT_MS=15000
EOF
  chmod 600 "$SECRETS/env"
  echo "Certs and env written to $SECRETS"
}

bring_up() {
  export PATH="$SAMPLES/bin:$PATH"
  export FABRIC_CFG_PATH="$SAMPLES/config"
  cd "$NETWORK"
  ./network.sh down || true
  ./network.sh up createChannel -c "$CHANNEL"
  copy_certs
  docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
  echo
  echo "Channel: $CHANNEL"
  echo "Peer Gateway: localhost:7051  MSP: Org1MSP"
  echo "Do not deploy document-registry until go.mod is added (implementation step)."
}

status() {
  docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' || true
  if [[ -d "$NETWORK" ]]; then
    export PATH="$SAMPLES/bin:$PATH"
    export FABRIC_CFG_PATH="$SAMPLES/config"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID=Org1MSP
    export CORE_PEER_ADDRESS=localhost:7051
    export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
    peer channel list || true
  fi
  ls -l "$SECRETS" 2>/dev/null || echo "No certs yet at $SECRETS"
}

down() {
  if [[ -d "$NETWORK" ]]; then
    cd "$NETWORK"
    ./network.sh down
  fi
}

cmd="${1:-up}"
case "$cmd" in
  up)
    mem_check
    install_fabric
    hosts_hint
    bring_up
    ;;
  down) down ;;
  status) status ;;
  certs) copy_certs ;;
  *)
    echo "Usage: $0 [up|down|status|certs]" >&2
    exit 1
    ;;
esac
