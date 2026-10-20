import initSqlJs from 'sql.js'
import { getDbVersion } from '../KoboDB'

describe('getDbVersion', () => {
  it('returns the version stored in the DbVersion table', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run('CREATE TABLE DbVersion (version INTEGER); INSERT INTO DbVersion VALUES (176);')

    expect(getDbVersion(db)).toBe(176)
    db.close()
  })

  it('returns null when the DbVersion table is absent', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()

    expect(getDbVersion(db)).toBeNull()
    db.close()
  })

  it('returns null when the DbVersion table is empty', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run('CREATE TABLE DbVersion (version INTEGER);')

    expect(getDbVersion(db)).toBeNull()
    db.close()
  })
})
