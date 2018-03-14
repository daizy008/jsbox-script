// vision = 1.0
var text = $clipboard.text

if ($app.env == $env.today) {
  var delay = 2;
} else {
  var delay = 0;
}


$http.request({
  method: "GET",
  url: "https://api.shanbay.com/bdc/search/?word=" + text,
  handler: function(resp) {
    var def = resp.data.data.definition

    $push.schedule({
      title: text,
      body: def,
      delay: delay,
      script: "NotifiDic",
      mute: 1,
    })
  }
})

