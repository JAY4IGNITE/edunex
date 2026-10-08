# Data Provenance

Every ingested dataset should eventually have:

- dataset ID
- source name
- source type
- source reference
- license/status
- acquisition date
- version if verified
- original file/schema
- transformation history
- canonical mapping
- validation result
- ingestion run ID

Unknown provenance must be explicitly recorded as:

`UNKNOWN — REQUIRES VERIFICATION`

The system must not silently manufacture provenance information.
