#!/bin/bash
# Download and apply the official Guacamole PostgreSQL schema.
# This runs automatically when the guac-db container starts for the first time.

set -e

GUAC_VERSION="1.5.5"
SCHEMA_URL="https://raw.githubusercontent.com/apache/guacamole-client/${GUAC_VERSION}/extensions/guacamole-auth-jdbc/modules/guacamole-auth-jdbc-postgresql/schema"

echo "Downloading Guacamole schema for v${GUAC_VERSION}..."
curl -fsSL "${SCHEMA_URL}/001-create-schema.sql" | psql -U guacamole -d guacamole_db
curl -fsSL "${SCHEMA_URL}/002-create-admin-user.sql" | psql -U guacamole -d guacamole_db
echo "Guacamole schema initialised."
