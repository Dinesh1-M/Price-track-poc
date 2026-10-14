-- UNVERIFIED migration draft. Review and execute only in an approved SQL Server test environment.
-- Mirrors the local core projections; not the complete normalized enterprise data model.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
CREATE TABLE dbo.schema_migrations(version int NOT NULL PRIMARY KEY);
CREATE TABLE dbo.application_state(id int NOT NULL PRIMARY KEY CHECK(id=1), revision bigint NOT NULL, payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1));
CREATE TABLE dbo.pricing_cases(id nvarchar(80) NOT NULL PRIMARY KEY, opportunity_id nvarchar(200) NOT NULL UNIQUE, account nvarchar(200) NOT NULL, payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1));
CREATE TABLE dbo.pricing_versions(id nvarchar(80) NOT NULL PRIMARY KEY, case_id nvarchar(80) NOT NULL REFERENCES dbo.pricing_cases(id), number int NOT NULL, snapshot nvarchar(max) NOT NULL CHECK(ISJSON(snapshot)=1), payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1), CONSTRAINT UQ_pricing_version_number UNIQUE(case_id,number));
CREATE TABLE dbo.audit_events(id nvarchar(80) NOT NULL PRIMARY KEY, payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1));
CREATE TABLE dbo.integration_messages(id nvarchar(80) NOT NULL PRIMARY KEY, idempotency_key nvarchar(300) NOT NULL UNIQUE, payload nvarchar(max) NOT NULL CHECK(ISJSON(payload)=1));
INSERT INTO dbo.schema_migrations(version) VALUES(1);
COMMIT TRANSACTION;
GO
CREATE TRIGGER dbo.immutable_version_snapshot ON dbo.pricing_versions AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.id=d.id WHERE i.snapshot COLLATE Latin1_General_100_BIN2 <> d.snapshot COLLATE Latin1_General_100_BIN2)
 THROW 51000, 'Submitted snapshot is immutable', 1;
END;
GO
CREATE TRIGGER dbo.immutable_audit ON dbo.audit_events AFTER UPDATE, DELETE AS
BEGIN
 THROW 51001, 'Audit is append-only', 1;
END;
GO
