
# Database Schema Setup

This document explains how to set up the **Beneficiary Backend Database Schema** in PostgreSQL.

---

## 1. Schema File

The schema is defined in:  
[`./db/schema.pgsql`](../../db/schema.pgsql)

This file contains:
- Table definitions  
- Indexes  
- Constraints  
- Relationships  

---

## 2. Applying the Schema

### 2.1 Using pgAdmin

1. Open pgAdmin at [http://localhost:8082](http://localhost:8082)  
2. Login with credentials from `environment.env`  
   - **Email**: `PGADMIN_DEFAULT_EMAIL`  
   - **Password**: `PGADMIN_DEFAULT_PASSWORD`  
3. Connect to the `Postgres` server  
4. Right-click on the database (`uba_beneficiary_mw`) → **Query Tool**  
5. Load and execute `schema.pgsql`

---

### 2.2 Using psql CLI

Run the following command (from the project root):

```bash
docker exec -i <postgres_container_name> psql -U postgres -d uba_beneficiary_mw < ./db/schema.pgsql
````

Replace `<postgres_container_name>` with the container name (`docker ps` to check).

---

## 3. Verifying Schema

After running the script:

* Tables should be visible in pgAdmin under `uba_beneficiary_mw → Schemas → public → Tables`
* Indexes can be found under each table’s **Indexes** section

---

## 4. Schema Updates

If schema changes are required:

1. Update `schema.pgsql` file
2. Re-run the script as described above






