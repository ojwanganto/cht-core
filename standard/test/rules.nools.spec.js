var Nools = require('nools');
var assert = require('chai').assert;
const parseRules = require('medic-nootils/src/node/test-utils').parseRules;

const now = new Date();
const MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
const MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
const DAYS_IN_PNC = 42;
const WEEKS = 7;  // days per week

// TODO instead of including calls to `Date.now()` in our test data, we should
// instead set the date at the start of a test script, and progress it during
// the script as we require.  This will require replacement of all `new Date()`
// calls in individual rulesets to use e.g. `Utils.date()`.  This refactoring is
// not complicated.

describe('Standard Configuration', function() {
  var flow, session, Contact;
  const TEST_USER = {
    parent: {
      type: 'health_center',
      use_cases: 'anc pnc imm'
    },
  };

  beforeEach(function() {
    var rules = parseRules(
      __dirname + '/../rules.nools.js',
      __dirname + '/../tasks.json',
      { user:TEST_USER });
    flow = rules.flow;
    session = rules.session;

    Contact = flow.getDefined('Contact');
  });

  afterEach(function() {
    flow = null;
    session = null;
    Contact = null;
    Nools.deleteFlows();
  });

  describe('Birth not at facility', function() {
    // given
    var person = {
      "type": "person",
      "name": "Zoe",
      "date_of_birth": "1990-09-01",
      "reported_date": Date.now(),
      "_id": "contact-1"
    };

    var deliveryReport = {
      "_id":"report-1",
      "fields": {
        "delivery_code": "NS"
      },
      "birth_date": (new Date(Date.now() - 3*MS_IN_DAY)).toISOString(),
      "form": "delivery",
      "reported_date": Date.now()
    };

    var flagReport = {
      "_id":"flag-1",
      "fields": {
        "notes": ""
      },
      "form": "F",
      "reported_date": Date.now()
    };

    var pncVisitAppReport = {
      "_id": "report-2",
      "fields": {},
      "form": "postnatal_visit",
      "reported_date": Date.now() + 1*MS_IN_DAY
    };
    var pncVisitSMSReport = {
      "_id": "report-3",
      "fields": {},
      "form": "M",
      "reported_date": Date.now() + 1*MS_IN_DAY
    };

    it('should have a clinic visit task', function() {
      // and
      session.assert(new Contact({
        contact: person,
        reports: [
          deliveryReport,
        ],
      }));

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          // console.log(JSON.stringify(tasks,null,2));
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: false}, "Should have a resolved field set to false");
          assert.deepInclude(tasks[0].actions[0].content, {
            "source": "task",
            "source_id": "report-1",
            "contact": person
          });
        });
    });
    it('should have first visit task completed when PNC app form is submitted', function() {
      // and
      session.assert(new Contact({
        contact: person,
        reports: [
          deliveryReport,
          pncVisitAppReport
        ],
      }));

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
        });
    });
    it('should have first visit task completed when PNC SMS form is submitted', function() {
      // and
      session.assert(new Contact({
        contact: person,
        reports: [
          deliveryReport,
          pncVisitSMSReport
        ],
      }));

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
        });
    });
    it(`should have a 'postnatal-danger-sign' task if a flag is sent during PNC period`, function() {
      var reports = [
        deliveryReport,
        flagReport,
      ];
      deliveryReport = setDate(deliveryReport, Date.now()-(25*MS_IN_DAY)); 
      flagReport.reported_date = Date.now()-(4*MS_IN_DAY); 
      
      session.assert(new Contact({
        contact: person,
        reports: reports,
      }));

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          // console.log(JSON.stringify(tasks,null,2));
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.include(tasks[0]._id, 'postnatal-danger-sign', "Task id should have correct schedule name included");
        });
    });

    describe('Postnatal visit schedule', function() {
      var taskOffset = 2; // days between last message and task, weekday offset, task offset in tasks.json  
      var taskDuration = 5;
      var taskStartDays = [3, 6, 42];
      var pncTaskDays = getDayRanges(taskStartDays, taskDuration, taskOffset);
      var deliveryTaskDays = getDayRanges([40*WEEKS],14,-1);
      
      range(0, DAYS_IN_PNC+10).forEach(day => {

        describe(`Postnatal period: day ${day}`, function() {
          if (pncTaskDays.includes(day)) {
            it(`should have 'postnatal-missing-visit' visit task on day ${day}`, function() {
              // given
              var reports = [require('./d.json')];
              setupTasks(Contact, session, person, day, reports);

              // expect
              return session.emitTasks()
                .then(function(tasks) {
                  assert.equal(tasks.length, 1, "Should have a single task created");
                  assert.include(tasks[0]._id, 'postnatal-missing-visit', "Task id should have correct schedule name included");
                });
            });
          }
          else {
            it(`should not have 'postnatal-missing-visit' visit task on day ${day}`, function() {
              // given
              var reports = [require('./d.json')];
              setupTasks(Contact, session, person, day, reports);

              // expect
              return session.emitTasks()
                .then(function(tasks) {
                  tasks.forEach(t => { 
                    assert.notInclude(t._id, 'postnatal-missing-visit', "Task id should not include 'postnatal-missing-visit'");
                  });
                });
            });
          }
        });
      });
    }); /* */   
  });

  describe('Pregnancy without LMP', function() {

    var person = {
      "type": "person",
      "name": "Zoe",
      "date_of_birth": "1990-09-01",
      "reported_date": Date.now(),
      "_id": "contact-1"
    };

    // Offset needed if scheduled message created on specific weekday.
    // In this case it is -3, but coincidentally the task shows up 3 days later (instead of 7 like in Nitty Gritty).
    // TODO: This needs to be cleaned up!
    var taskOffset = -7-3+3; // days between last message and task, weekday offset, task offset in tasks.json  
    var taskDuration = 7;
    var taskStartDays = [
          3*WEEKS, 
          7*WEEKS, 
          11*WEEKS,
          15*WEEKS,
          19*WEEKS,
          23*WEEKS,
          27*WEEKS,
          31*WEEKS,
          35*WEEKS,
    ];
    var pregnancyTaskDays = getDayRanges(taskStartDays, taskDuration, taskOffset);
    var deliveryTaskDays = getDayRanges([40*WEEKS], 14, -1);
    
    range(250, MAX_DAYS_IN_PREGNANCY).forEach(day => {

      describe(`Pregnancy without LMP: day ${day}`, function() {

        if (pregnancyTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            setupTasks(Contact, session, person, day, reports);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'pregnancy-missing-visit', "Task id should have correct schedule name included");
              });
          });
        }
        else {
          it(`should not have 'pregnancy-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            setupTasks(Contact, session, person, day, reports);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                tasks.forEach(t => { 
                  assert.notInclude(t._id, 'pregnancy-missing-visit', "Task id should not include 'pregnancy-missing-visit'");
                });
              });
          });
        }
        if (deliveryTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-birth' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            setupTasks(Contact, session, person, day, reports);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'pregnancy-missing-birth', "Task id should have correct schedule name included");
              });
          });
        }
        else {
          it(`should not have 'pregnancy-missing-birth' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            setupTasks(Contact, session, person, day, reports);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                tasks.forEach(t => { 
                  assert.notInclude(t._id, 'pregnancy-missing-birth', "Task id should not include 'pregnancy-missing-birth'");
                });
              });
          });
        }
      });
    });
  });
});

function range(a, b) {
  return Array.apply(null, { length:b-a+1 }).map((_, i) => i+a);
}

function getDayRanges(startDays, duration, offset) {
  var a = new Array();
  startDays.forEach(day => {
    a.push(range(day+offset, day+offset+duration));
  });

  // return the flattened 1D array
  return [].concat.apply([], a);
};

function getRange(startDay, durationInDays, offset) {
  return range(startDay+offset, startDay+durationInDays+offset);
};

function setDate(form, newDate) {
  // Sets the newDate as the form's reported date, and modifies other dates in doc by the same offset
  var originalDate = new Date(form.reported_date);
  var diff = originalDate - newDate;
  form.reported_date = newDate;
  traverse(form, resetDate, "birth_date", diff);
  traverse(form, resetDate, "due", diff);
  // traverse(form, logField, "due");
  return form;
}

function logField(object, key, keyToChange, offset) {
    if (key === keyToChange) {
      console.log(key + " : " + object[key]);
    }
}

function resetDate(object, key, keyToChange, offset) {
    if (key === keyToChange) {
      var date = new Date(object[key]);
      var date2 = new Date(date.getTime() - offset);
      object[key] = date2.toISOString();
      // console.log(key + " : " + object[key]);
    }
}

function traverse(object, func, key, offset) {
    for (var i in object) {
        func.apply(this, [object, i, key, offset]);  
        if (object[i] !== null && typeof(object[i])=="object") {
            //going one step down in the object tree!!
            traverse(object[i], func, key, offset);
        }
    }
}

var setupTasks = function(Contact, session, person, day, reports) {
  // Sets up the tasks by using the doc and reports 
  reports.forEach(r => {
    r = setDate(r, Date.now()-(day*MS_IN_DAY)); 
  });
  // TODO: Investigate how timezone affect showing task.
  // Tests pass vs fail with task window being off by one at 11pm vs 12:15am on GMT+2.

  session.assert(new Contact({
    contact: person,
    reports: reports,
  }));
};
