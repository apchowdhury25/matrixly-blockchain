# Path A — Fabric test-network lab

**AWS EC2 walkthrough (use this):** [fabric-ec2.md](fabric-ec2.md)

Run Fabric on a machine **you** control. The Grok preview VM has no Docker and ~4 GB RAM.

Pin **Fabric 2.5.16**. Channel `trust`. Do **not** set `LEDGER_ADAPTER=fabric` in Matrixly until the Gateway SDK is wired.

Helper: `scripts/fabric-lab-setup.sh`

```bash
chmod +x scripts/fabric-lab-setup.sh
./scripts/fabric-lab-setup.sh          # install + up + copy certs
./scripts/fabric-lab-setup.sh status
./scripts/fabric-lab-setup.sh down
```

Official tutorial: [Using the Fabric test network](https://hyperledger-fabric.readthedocs.io/en/release-2.5/test_network.html).
