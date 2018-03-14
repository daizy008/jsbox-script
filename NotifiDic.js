// version = 1.1
var text = $clipboard.text
var name = $addin.current.name

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
      script: name,
      mute: 1,
    })
  }
})

