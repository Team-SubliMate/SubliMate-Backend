var express = require('express');
var router = express.Router();
const db = require('../db')

/* GET API page. */
router.get('/', function(req, res, next) {
  var routes = router.stack.map(r => r.route && r.route.path);
  routes.shift() // Remove the '/' route

  res.render('api', {
      title: 'SubliMate APIs',
      routes: routes
  });
});

router.get('/inventory', function(req, res, next) {
  // TODO: Retrieve data from database and send as json
  db.query('SELECT * FROM items', function(err, result) {
    if (err) {
      return next(err)
    }
    res.json(result.rows)
  })
});

module.exports = router;
