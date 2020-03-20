const db = require('../db');
const logger = require('../lib/logger');

const METADATA_DOCUMENT = '_local/sentinel-meta-data';

// If you need to store something new add it here to set a default
const METADATA_TEMPLATE = {
  _id: METADATA_DOCUMENT,
  transitions_seq: 0
};

const getMetaData = () => {
  return db.sentinel.get(METADATA_DOCUMENT)
    .then(doc => Object.assign({}, METADATA_TEMPLATE, doc));
};

const getTransitionSeq = () => {
  return getMetaData()
    .then(doc => doc.transitions_seq)
    .catch(err => {
      logger.error('Error getting meta data: %o', err);
      throw err;
    });
};

// Strategy to make writes thread safe.
//
// Writes get "queued" onto changes, the callback queued into callbacks, then a
// write is attempted. Inside one "atomic" block we take all queued changes and
// their callbacks and write them
//
// If there are two writes one after the other in the execution stack the first
// one will go for getMetadata in writeMaybe, which lets the second one write
// to changes and callbacks and queue up to call getMetadata as well. Whichever
// one gets it first will "take" the changes and callbacks into its local instance
// of that block and use them. The second one will find no changes to write and
// backs out.
let changes = {};
let callbacks = [];

const writeMaybe = () => {
  return getMetaData()
    .then(doc => {
      // If another "thread" has performed the write just backout
      if (!Object.keys(changes)) {
        return;
      }

      // hold the callbacks as ours so we can wipe the shared location
      const heldCallbacks = callbacks;
      callbacks = [];

      const writes = Object.assign({}, doc, changes);
      changes = {};

      return db.sentinel.put(writes)
        .then(() => undefined)
        .catch(err => err)
        .then(err => heldCallbacks.forEach(cb => cb(err)));
    });
};

const update = (key, value) => {
  return new Promise((resolve, reject) => {
    if (changes[key]) {
      return reject(
        Error(`Tried to write ${key} with '${value}' but val '${changes[key]}' already queued`));
    }

    changes[key] = value;
    callbacks.push((err) => err ? reject(err) : resolve());

    writeMaybe();
  });
};


module.exports = {
  getTransitionSeq: () => getTransitionSeq(),
  updateTransitionSeq: seq => update('transitions_seq', seq),
  _update: update
};
