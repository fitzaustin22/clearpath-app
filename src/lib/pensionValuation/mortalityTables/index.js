import { IRS_417E_2026_UNISEX } from './irs_417e_2026.js';
import { PUB_2010_UNISEX } from './pub_2010.js';
import { RP_2014_UNISEX } from './rp_2014.js';

const TABLES = {
  irs_417e: IRS_417E_2026_UNISEX,
  pub_2010: PUB_2010_UNISEX,
  rp_2014: RP_2014_UNISEX,
};

/**
 * Resolve a mortality-table name to its survival-probability array.
 * Per spec §7.4.6. Throws on unknown name — calc engine guards expect either
 * a usable table or a clear error at lookup time, never a silent undefined.
 *
 * @param {'irs_417e' | 'pub_2010' | 'rp_2014'} name
 * @returns {readonly number[]} — frozen array of p_x for ages 0–119
 */
export function lookupMortalityTable(name) {
  const table = TABLES[name];
  if (!table) {
    throw new Error(
      `Unknown mortality table: ${name}. Expected one of: ${Object.keys(TABLES).join(', ')}`
    );
  }
  return table;
}
