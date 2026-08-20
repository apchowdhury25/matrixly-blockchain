package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// DocumentRegistry is the on-chain trust registry. It stores hashes and status,
// never original documents or unnecessary PII.
type DocumentRegistry struct {
	contractapi.Contract
}

type CredentialRecord struct {
	CredentialID   string `json:"credentialId"`
	CredentialHash string `json:"credentialHash"`
	DocumentHash   string `json:"documentHash"`
	IssuerDID      string `json:"issuerDid"`
	Status         string `json:"status"`
	IssuedAt       string `json:"issuedAt"`
	ExpiresAt      string `json:"expiresAt,omitempty"`
	Version        int    `json:"version"`
}

func (s *DocumentRegistry) RegisterCredential(ctx contractapi.TransactionContextInterface, payload string) error {
	var rec CredentialRecord
	if err := json.Unmarshal([]byte(payload), &rec); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	if rec.CredentialID == "" || rec.CredentialHash == "" || rec.DocumentHash == "" || rec.IssuerDID == "" {
		return fmt.Errorf("credentialId, hashes, and issuerDid are required")
	}
	existing, err := ctx.GetStub().GetState("CREDENTIAL:" + rec.CredentialID)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("credential already registered")
	}
	if rec.Status == "" {
		rec.Status = "ACTIVE"
	}
	if rec.Version == 0 {
		rec.Version = 1
	}
	bytes, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState("CREDENTIAL:"+rec.CredentialID, bytes); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("credential.registered", bytes)
}

func (s *DocumentRegistry) GetCredential(ctx contractapi.TransactionContextInterface, credentialID string) (*CredentialRecord, error) {
	bytes, err := ctx.GetStub().GetState("CREDENTIAL:" + credentialID)
	if err != nil {
		return nil, err
	}
	if bytes == nil {
		return nil, fmt.Errorf("not found")
	}
	var rec CredentialRecord
	if err := json.Unmarshal(bytes, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&DocumentRegistry{})
	if err != nil {
		panic(err)
	}
	if err := chaincode.Start(); err != nil {
		panic(err)
	}
}
