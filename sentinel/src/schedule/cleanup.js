/**
 * Cleanup scheduler
 *
 * Place to put actions that we want to happen at some point, but don't have to
 * happen in real-time (ie which would slow down a sentinel transition or other process)
 */
module.exports = {
  execute: cb => {
    cb();
  }
};
