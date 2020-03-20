const { assert } = require('chai');

const utils = require('./utils');
const db = require('../../../src/db');

const METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_METADATA_DOCUMENT = 'sentinel-meta-data';
const MIGRATION = 'normalise-metadata-doc';

describe.only('remove-empty-parents migration', function() {
  before(async () => utils.initDb([]));
  after(async () => utils.tearDown());

  const wipe = (dbRef, docName) => {
    return dbRef.get(docName)
      .then(doc => {
        doc._deleted = true;
        return dbRef.put(doc);
      })
      .catch(() => {});
  };

  it('works correctly on an empty db', () => {
    return wipe(db.sentinel, METADATA_DOCUMENT)
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(METADATA_DOCUMENT))
      .then(doc => {
        assert.equal(doc.transitions_seq, 0);
      });
  });

  it('works on old doc name on medic db', () => {
    return Promise.all([
      wipe(db.sentinel, METADATA_DOCUMENT),
      wipe(db.medic, OLD_METADATA_DOCUMENT)
    ])
      .then(() => db.medic.put({
        _id: OLD_METADATA_DOCUMENT,
        processed_seq: '1'
      }))
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(METADATA_DOCUMENT))
      .then(doc => {
        assert.equal(doc.transitions_seq, 1);
      });
  });

  it('works on new doc name on medic db', () => {
    return Promise.all([
      wipe(db.sentinel, METADATA_DOCUMENT),
      wipe(db.medic, METADATA_DOCUMENT)
    ])
      .then(() => db.medic.put({
        _id: METADATA_DOCUMENT,
        processed_seq: '2'
      }))
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(METADATA_DOCUMENT))
      .then(doc => {
        assert.equal(doc.transitions_seq, 2);
      });
  });
});
