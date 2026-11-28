import { randomBytes } from 'node:crypto';
import { connect, identifier } from './database-plan.mjs';

export async function applyDatabaseRoles(plan) {
  const admin = await connect(plan.admin);
  try {
    const authority = await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');
    if (!authority.rows[0]?.rolsuper) throw new Error('Local migration account must administer role isolation.');
    for (const service of Object.values(plan.services)) {
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [service.database]);
      if (!exists.rowCount) {
        if (service.database !== 'notebook_db') throw new Error(`${service.directory}: expected database is absent.`);
        await admin.query(`CREATE DATABASE ${identifier(service.database)} OWNER ${identifier(plan.admin.user)}`);
      }
      const role = await admin.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = $1', [service.role]);
      if (!role.rowCount) {
        if (!/^[a-f0-9]{64}$/.test(service.password)) throw new Error('Invalid staged role credential.');
        await admin.query(`CREATE ROLE ${identifier(service.role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${service.password}'`);
      } else if (Object.values(role.rows[0]).some(Boolean)) throw new Error(`${service.role}: existing role has administrative privileges; no automatic downgrade or rotation.`);
      const memberships = await admin.query('SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)', [service.role]);
      if (memberships.rowCount) throw new Error(`${service.role}: unexpected role membership.`);
    }
    const databases = await admin.query('SELECT datname FROM pg_database WHERE datallowconn');
    for (const { datname } of databases.rows) {
      await admin.query(`REVOKE CONNECT ON DATABASE ${identifier(datname)} FROM PUBLIC`);
      for (const service of Object.values(plan.services)) {
        if (service.database !== datname) await admin.query(`REVOKE CONNECT ON DATABASE ${identifier(datname)} FROM ${identifier(service.role)}`);
      }
    }
  } finally { await admin.end(); }
  for (const service of Object.values(plan.services)) {
    const client = await connect({ ...plan.admin, database: service.database });
    try {
      await client.query('BEGIN');
      await client.query(`REVOKE ALL ON DATABASE ${identifier(service.database)} FROM PUBLIC`);
      await client.query(`REVOKE ALL ON DATABASE ${identifier(service.database)} FROM ${identifier(service.role)}`);
      await client.query(`GRANT CONNECT ON DATABASE ${identifier(service.database)} TO ${identifier(service.role)}`);
      const schemas = await client.query("SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'");
      for (const { nspname } of schemas.rows) {
        const schema = identifier(nspname), role = identifier(service.role);
        await client.query(`REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC`);
        await client.query(`REVOKE ALL ON SCHEMA ${schema} FROM ${role}`);
        await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
        await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA ${schema} FROM PUBLIC`);
        await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${schema} FROM PUBLIC`);
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
        await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`);
        // Migration ledgers are owned by the migration account, not application
        // runtime. A broad existing-table grant above must not expose them.
        const ledgers = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename IN ('_prisma_migrations', 'workspacehub_schema_history', 'workspacehub_local_security_history')`, [nspname]);
        for (const { tablename } of ledgers.rows) {
          await client.query(`REVOKE ALL ON TABLE ${schema}.${identifier(tablename)} FROM ${role}`);
        }
        const owners = await client.query('SELECT DISTINCT pg_get_userbyid(relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1', [nspname]);
        for (const owner of new Set([plan.admin.user, ...owners.rows.map((row) => row.owner)])) {
          await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${identifier(owner)} IN SCHEMA ${schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
          await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${identifier(owner)} IN SCHEMA ${schema} GRANT USAGE, SELECT ON SEQUENCES TO ${role}`);
        }
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { await client.end(); }
  }
}

export async function verifyDatabaseRoles(plan) {
  const admin = await connect(plan.admin);
  const databases = (await admin.query('SELECT datname FROM pg_database WHERE datallowconn')).rows.map((row) => row.datname);
  await admin.end();
  for (const service of Object.values(plan.services)) {
    const migration = await connect({ ...plan.admin, database: service.database });
    const table = identifier(`__wh_role_probe_${randomBytes(6).toString('hex')}`);
    let runtime;
    try {
      // A newly created table/sequence verifies the actual migration owner's
      // default privileges, rather than explicitly granting this probe access.
      await migration.query(`CREATE TABLE public.${table} (id bigserial PRIMARY KEY, value text NOT NULL)`);
      runtime = await connect({ ...plan.admin, database: service.database, user: service.role, password: service.password });
      const role = await runtime.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user');
      if (Object.values(role.rows[0]).some(Boolean)) throw new Error(`${service.role}: administrative privilege check failed.`);
      const ledgers = await migration.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('_prisma_migrations', 'workspacehub_schema_history', 'workspacehub_local_security_history')");
      for (const { tablename } of ledgers.rows) {
        const access = await runtime.query('SELECT has_table_privilege(current_user, $1, $2) AS granted', [`public.${tablename}`, 'SELECT']);
        if (access.rows[0]?.granted) throw new Error(`${service.role}: migration ledger is readable by runtime.`);
      }
      await runtime.query('BEGIN');
      const inserted = await runtime.query(`INSERT INTO public.${table}(value) VALUES ('local-role-verification') RETURNING id`);
      await runtime.query(`UPDATE public.${table} SET value='verified' WHERE id=$1`, [inserted.rows[0].id]);
      const selected = await runtime.query(`SELECT value FROM public.${table} WHERE id=$1`, [inserted.rows[0].id]);
      if (selected.rows[0]?.value !== 'verified') throw new Error(`${service.role}: DML verification failed.`);
      await runtime.query(`DELETE FROM public.${table} WHERE id=$1`, [inserted.rows[0].id]);
      await runtime.query('ROLLBACK');
      let ddlDenied = false;
      try { await runtime.query(`CREATE TABLE public.${identifier(`__wh_denied_${randomBytes(6).toString('hex')}`)}(id int)`); }
      catch (error) { ddlDenied = error.code === '42501'; }
      if (!ddlDenied) throw new Error(`${service.role}: unexpected schema CREATE permission.`);
    } finally {
      if (runtime) await runtime.end();
      await migration.query(`DROP TABLE IF EXISTS public.${table}`);
      await migration.end();
    }
    for (const database of databases.filter((name) => name !== service.database)) {
      let other;
      let denied = false;
      try { other = await connect({ ...plan.admin, database, user: service.role, password: service.password }); }
      catch (error) { denied = error.code === '42501'; }
      finally { if (other) await other.end(); }
      if (!denied) throw new Error(`${service.role}: cross-database CONNECT isolation failed for ${database}.`);
    }
  }
}
