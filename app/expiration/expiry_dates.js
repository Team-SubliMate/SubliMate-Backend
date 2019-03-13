function getDateFromItem(item) {
  var duration;
  var metric;

  if (!item) {
    // not good
    return;
  }

  if (item.Pantry_Max) {
    duration = item.Pantry_Max;
    metric = item.Pantry_Metric;
  }

  if (item.DOP_Pantry_Max) {
    duration = item.DOP_Pantry_Max;
    metric = item.DOP_Pantry_Metric;
  }

  if (item.Refrigerate_Max) {
    duration = item.Refrigerate_Max;
    metric = item.Refrigerate_Metric;
  }

  if (item.DOP_Refrigerate_Max) {
    duration = item.DOP_Refrigerate_Max;
    metric = item.DOP_Refrigerate_Metric;
  }

  if (duration && metric) {
    var today = new Date();
    var expirationDate = new Date();

    if (metric === "Days") {
      expirationDate.setDate(today.getDate() + duration);
    } else if (metric === "Weeks") {
      expirationDate.setDate(today.getDate() + (duration * 7));
    } else if (metric === "Months") {
      expirationDate.setMonth(today.getMonth() + duration);
    } else if (metric === "Years") {
      expirationDate.setFullYear(today.getFullYear() + duration);
    } else {
      // not good
      return;
    }

    return expirationDate;

  } else {
    // not good
    return;
  }
}

function getExpiryDate(title, client) {
  var body = {
    size: 1,
    from: 0, 
    "query": {
      "multi_match" : {
        "query": title,
        "type": "best_fields",
        "fields": [ "Name", "Keywords" ],
        "tie_breaker": 0.3
      }
    }
  };

  client.search({index:'product_expir',  body:body, type:'product_list'})
  .then(results => {
    var itemExpirationInfo = results.hits.hits[0]._source;
    console.log(itemExpirationInfo)
    var ret = getDateFromItem(itemExpirationInfo);
    console.log(ret);

    return results.hits.hits;
  })
  .catch(err=>{
    console.log(err)
  });
}

module.exports = {
  getExpiryDate: (title, client) => {
    getExpiryDate(title, client);
  }
}