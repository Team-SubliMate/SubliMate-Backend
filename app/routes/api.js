var express = require('express');
var router = express.Router();

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
  var testData = {
    data: {
      items: [
        {name: "apple", quantity: 4},
        {name: "banana", quantity: 3}
      ]
    }
  };

  res.json(testData);
});

module.exports = router;
