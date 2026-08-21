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

type DIDRecord struct {
	DID                string `json:"did"`
	DocumentHash       string `json:"documentHash"`
	PublicKeyMultibase string `json:"publicKeyMultibase"`
	Status             string `json:"status"`
	ControllerDID      string `json:"controllerDid,omitempty"`
}

type IssuerRecord struct {
	IssuerID           string `json:"issuerId"`
	IssuerDID          string `json:"issuerDid"`
	Name               string `json:"name"`
	Status             string `json:"status"`
	PublicKeyMultibase string `json:"publicKeyMultibase"`
}

func (s *DocumentRegistry) RegisterDID(ctx contractapi.TransactionContextInterface, payload string) error {
	var rec DIDRecord
	if err := json.Unmarshal([]byte(payload), &rec); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	if rec.DID == "" || rec.DocumentHash == "" || rec.PublicKeyMultibase == "" {
		return fmt.Errorf("did, documentHash, and publicKeyMultibase are required")
	}
	existing, err := ctx.GetStub().GetState("DID:" + rec.DID)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("DID already registered")
	}
	if rec.Status == "" {
		rec.Status = "ACTIVE"
	}
	bytes, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState("DID:"+rec.DID, bytes); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("did.registered", bytes)
}

func (s *DocumentRegistry) GetDID(ctx contractapi.TransactionContextInterface, did string) (*DIDRecord, error) {
	bytes, err := ctx.GetStub().GetState("DID:" + did)
	if err != nil {
		return nil, err
	}
	if bytes == nil {
		return nil, fmt.Errorf("not found")
	}
	var rec DIDRecord
	if err := json.Unmarshal(bytes, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (s *DocumentRegistry) RegisterIssuer(ctx contractapi.TransactionContextInterface, payload string) error {
	var rec IssuerRecord
	if err := json.Unmarshal([]byte(payload), &rec); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	if rec.IssuerDID == "" || rec.PublicKeyMultibase == "" {
		return fmt.Errorf("issuerDid and publicKeyMultibase are required")
	}
	key := "ISSUER:" + rec.IssuerDID
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("issuer already registered")
	}
	if rec.Status == "" {
		rec.Status = "ACTIVE"
	}
	if rec.IssuerID == "" {
		rec.IssuerID = rec.IssuerDID
	}
	bytes, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(key, bytes); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("issuer.registered", bytes)
}

func (s *DocumentRegistry) GetIssuer(ctx contractapi.TransactionContextInterface, issuerDID string) (*IssuerRecord, error) {
	bytes, err := ctx.GetStub().GetState("ISSUER:" + issuerDID)
	if err != nil {
		return nil, err
	}
	if bytes == nil {
		return nil, fmt.Errorf("not found")
	}
	var rec IssuerRecord
	if err := json.Unmarshal(bytes, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

type DocumentAnchor struct {
	DocumentHash string `json:"documentHash"`
	CredentialID string `json:"credentialId,omitempty"`
	IssuerDID    string `json:"issuerDid"`
}

func (s *DocumentRegistry) RegisterDocumentAnchor(ctx contractapi.TransactionContextInterface, payload string) error {
	var rec DocumentAnchor
	if err := json.Unmarshal([]byte(payload), &rec); err != nil {
		return fmt.Errorf("invalid payload: %w", err)
	}
	if rec.DocumentHash == "" || rec.IssuerDID == "" {
		return fmt.Errorf("documentHash and issuerDid are required")
	}
	existing, err := ctx.GetStub().GetState("DOCUMENT:" + rec.DocumentHash)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("document hash already anchored")
	}
	bytes, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState("DOCUMENT:"+rec.DocumentHash, bytes); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("document.anchored", bytes)
}

func (s *DocumentRegistry) GetDocumentAnchor(ctx contractapi.TransactionContextInterface, documentHash string) (*DocumentAnchor, error) {
	bytes, err := ctx.GetStub().GetState("DOCUMENT:" + documentHash)
	if err != nil {
		return nil, err
	}
	if bytes == nil {
		return nil, fmt.Errorf("not found")
	}
	var rec DocumentAnchor
	if err := json.Unmarshal(bytes, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
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
