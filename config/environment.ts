import dotenv from 'dotenv';
import path from 'path';

const clientAlias = process.env.CLIENT_ALIAS?.toLowerCase();
const environment = process.env.ENVIRONMENT?.toLowerCase();

if (!clientAlias) {
  throw new Error('CLIENT_ALIAS is required. Example: c001');
}

if (!environment) {
  throw new Error('ENVIRONMENT is required. Example: dev');
}

const envFilePath = path.resolve(
  process.cwd(),
  'environments',
  `.env.${clientAlias}.${environment}`
);

dotenv.config({ path: envFilePath });

export const env = {
  clientAlias,
  environment,
  baseUrl: process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  envFilePath,
};