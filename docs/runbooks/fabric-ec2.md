# Fabric test-network on AWS EC2

Use this for Path A. Same AWS account as S3/KMS. **Do not** open peer ports to the internet. **Do not** set `LEDGER_ADAPTER=fabric` on Matrixly until the Gateway SDK is wired.

Cost: `t3.large` is on the order of **$0.08/hour**. Stop or terminate when you are done.

## 1. Region

Use the **same region** as the S3 bucket and KMS key (example `us-east-1`).

## 2. Key pair

EC2 → Key pairs → Create key pair

- Name: `matrixly-fabric-lab`
- Type: RSA
- Format: `.pem` (macOS/Linux/WSL) or `.ppk` (PuTTY)

Save the file as `~/.ssh/matrixly-fabric-lab.pem`:

```bash
chmod 400 ~/.ssh/matrixly-fabric-lab.pem
```

## 3. Security group

EC2 → Security groups → Create

- Name: `matrixly-fabric-lab-sg`
- Inbound:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | **My IP** only |

No inbound 7050/7051/9051. Fabric stays on the instance loopback. You SSH in and talk to `localhost:7051` there.

Outbound: default allow all.

## 4. Launch instance (console)

EC2 → Launch instance

| Field | Value |
|---|---|
| Name | `matrixly-fabric-lab` |
| AMI | **Ubuntu Server 24.04 LTS** (`ami` for amd64) |
| Architecture | 64-bit (x86) |
| Instance type | **t3.large** (2 vCPU, 8 GB). t3.medium will OOM. |
| Key pair | `matrixly-fabric-lab` |
| VPC | default is fine for a lab |
| Subnet | a **public** subnet (you need SSH) |
| Auto-assign public IP | Enable |
| Security group | `matrixly-fabric-lab-sg` |
| Storage | **30 GB** gp3 |

Under **Advanced details → User data**, paste:

```bash
#!/bin/bash
set -eux
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git curl jq ca-certificates gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu
echo '127.0.0.1 peer0.org1.example.com peer0.org2.example.com orderer.example.com' >> /etc/hosts
touch /var/lib/cloud/instance/docker-ready
```

Launch. Wait until **Status check = 2/2 checks passed** (often 1–2 minutes). User-data Docker install takes a few more minutes.

## 5. SSH

Copy the instance **Public IPv4**. From your laptop:

```bash
ssh -i ~/.ssh/matrixly-fabric-lab.pem ubuntu@PUBLIC_IP
```

Confirm Docker (if `permission denied`, log out and SSH again so `docker` group applies):

```bash
docker version
docker compose version
```

If Docker is not installed yet, wait and retry, or run the User data commands by hand.

## 6. Install Fabric test-network

```bash
git clone https://github.com/apchowdhury25/matrixly-blockchain.git
cd matrixly-blockchain
chmod +x scripts/fabric-lab-setup.sh
./scripts/fabric-lab-setup.sh
```

If the RAM prompt appears, you chose a smaller instance — stop, resize to **t3.large**, try again.

Expect:

- `peer version` → `2.5.16`
- Channel `trust`
- `peer0.org1.example.com` on **7051**
- Certs in `/home/ubuntu/matrixly-fabric-lab/`

## 7. Prove it (on the instance)

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
ls -l ~/matrixly-fabric-lab
source ~/matrixly-fabric-lab/env
echo "$FABRIC_PEER_ENDPOINT $FABRIC_MSP_ID $FABRIC_CHANNEL"
```

`source …/env` is only to inspect values. Do not export `LEDGER_ADAPTER=fabric` into the Grok preview.

## 8. Send this back (no PEM contents)

```
Phase 21 Fabric lab ready
EC2: t3.large, region=…
peer version: 2.5.16
channel: trust
docker: peer0.org1 :7051, orderer :7050
certs: /home/ubuntu/matrixly-fabric-lab
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_MSP_ID=Org1MSP
```

Keep the instance **running** until we wire the Gateway (certs are regenerated on every `./network.sh up`).

## 9. Stop vs terminate

| Action | When |
|---|---|
| **Stop** | Pause billing for compute; EBS still costs a little. Crypto on disk remains. After start, Docker containers are gone — SSH in and run `./scripts/fabric-lab-setup.sh` again. |
| **Terminate** | Lab over. Delete the key pair if unused. |

```bash
# on the instance, before stop:
cd ~/matrixly-blockchain
./scripts/fabric-lab-setup.sh down
```

## CLI alternative (optional)

```bash
# from a machine with AWS CLI + your lab key
aws ec2 run-instances \
  --region us-east-1 \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --instance-type t3.large \
  --key-name matrixly-fabric-lab \
  --security-group-ids sg-xxxxxxxx \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=matrixly-fabric-lab}]'
```

Replace `sg-xxxxxxxx` and region. User-data: `--user-data file://cloud-init.sh` with the same bash as step 4.

## What not to do

- Do not attach a public IP to port 7051.
- Do not put `user1-key.pem` in git or S3 public.
- Do not deploy `document-registry` yet (`go.mod` comes at implementation).
- Do not point Matrixly at this EC2 from the internet; we will either run the app **on this instance** later or use SSH tunnel:

```bash
ssh -i ~/.ssh/matrixly-fabric-lab.pem -L 7051:127.0.0.1:7051 ubuntu@PUBLIC_IP
```
