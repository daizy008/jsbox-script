const version = 2.2
var text = $clipboard.text
var name = $addin.current.name
var delay = 0
var pgOffset = "";
var apiKey = $cache.get("apiKey")
var tableName = $cache.get("tableName")
var viewName = $cache.get("viewName")
var pageSize = $cache.get("pageSize")
var baseName = $cache.get("baseName")
var airUrl = `https://api.airtable.com/v0/${baseName}/${tableName}?pageSize=${pageSize}&view=${viewName}&offset=`

//判断如果运行环境不为主 app 时执行搜词，且为 widget 时 push 延迟 2 秒
if ($app.env !== $env.app) {
  if ($app.env == $env.today){  
     var delay = 2
     search()
  } else {
    search()
  }
}else {
  flashCard()
}

// 查词，并推送通知
function search(){$http.request({
  method: "GET",
  url: "https://api.shanbay.com/bdc/search/?word=" + text,
  handler: function(resp) {
    var sbdata = resp.data.data;
    var def = sbdata.definition;
    var audio = [{
          "url": sbdata.audio,
      }];
    var pron = sbdata.pronunciation;
    var endefJson = sbdata.en_definitions;
    var endef = "";
    for (var key in endefJson) {
        endef += key + ":" + endefJson[key] + "\n" 
    }

    $push.schedule({
      title: text,
      body: def,
      delay: delay,
      script: name,
      mute: 1,    
    })
    if(apiKey !== undefined ){
    postAir(text,endef,def,pron,audio)
    }
  }
})
}

// 发送所查单词到 Airtable
function postAir(text,endef,def,pron,audio){ $http.post({
  url: airUrl,
  header: {
    Authorization: "Bearer "+ apiKey
  },
  body: {
    fields:{
      Word: text,
      Meaning: endef,
      中文含义: def,
      音标: pron,
      发音: audio,
    }
  },
  handler: function(resp) {
    var data = resp.data;
  }
})
}

// 主界面
function flashCard(){
  $ui.render({
    props: {
      title: "Word List",
      navBarHidden: true,
      statusBarStyle: 0,
    },
    views: [{
      type: "matrix",
      props: {
        id: "wordList",
        columns: 2,
        spacing: 5,
        data: [],
        itemHeight: 88,
        template: {
          views: [
            {
              type: "view",
              props: {
                bgcolor: $color("white"),
                id: "shadow"
              },
              layout: function(make, view) {
                make.edges.inset(0.01);
                shadowSet(view);
              }
            },
            {
              type: "label",
              props: {
                id: "word",
                autoFontSize: true,
              },
              layout: function(make, view) {
                make.top.left.equalTo($("shadow"));
              }
            },
            {
              type: "label",
              props: {
                id: "cndef",
                autoFontSize: true,
                lines: 0,
              },
              layout: function(make, view) {
                make.top.equalTo($("word").bottom)
                make.bottom.equalTo($("shadow").bottom)
                make.width.equalTo($("shadow").width)
              }
            },
          ]
        },
        header: {  //头部设置
          type: "label",
          props: {
            height: 20,
            text: "⚙setting",
            textColor: $color("#AAAAAA"),
            align: $align.center,
            font: $font(12),
          },
          events: {
            tapped: function(sender) {
            setting()
            }
          }
        }
      },
      layout: $layout.fill,
      events: {
        didReachBottom: function(sender) {
          initTable();
          sender.endFetchingMore()
        } //触底动作
      },
    }],
    events: {
      appeared: function(){
        initTable()
      }
    }
  });
}

// list 初始化
function initTable() {
  listData = $("wordList").data;
  getTable();
  return pgOffset;
}

// 获取 airtable 数据
function getTable(){
  $http.get({ 
  url: airUrl + pgOffset,
  header: {
    Authorization: "Bearer "+ apiKey,
  },
  handler: function(resp) {
   console.log(resp)
   tableData = resp.data.records;
   pgOffset = resp.data.offset;
   pushData();
   $("wordList").data = listData;
   return pgOffset;
  }
})
}
// 添加分页数据
function pushData() { 
    for(var record of tableData){
      var field = record.fields
      var cnDef = field.中文含义
      var myWord = field.Word
      var listItem = {
          word: { 
            text: myWord,
            font: $font("AlNile-Bold", 20)
          },
          cndef: {
            text: cnDef,
            font: $font(14)
          }
        };
      listData.push(listItem)   
    }
  }; 


// 边框阴影
function shadowSet(view) {
  var layer = view.runtimeValue().invoke("layer")
  layer.invoke("setShadowOffset", $size(0, 3))
  layer.invoke("setShadowColor", $color("gray").runtimeValue().invoke("CGColor"))
  layer.invoke("setShadowOpacity", 1)
  layer.invoke("setShadowRadius", 4)
  layer.invoke("setCornerRadius", 5)
}

// 设置 airtable 参数页
var setting = function() {
  $ui.push({
    props: {
      title: "设置"
    },
    views: [
      {
        type: "input",
        props: {
          id: "apiKey",
          text: apiKey,
          placeholder: "api key"
        },
        layout: function(make, view) {
          make.top.left.equalTo(view.super).inset(25)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function(sender) {
            var apiKey = sender.text;
            $cache.set("apiKey", apiKey);
          }
        }
      },
      {
      type: "input",
      props: {
        id: "baseName",
        text: baseName,
        placeholder: "base name"
      },
      layout: function(make, view) {
        make.top.equalTo(view.prev.bottom).inset(25),
        make.left.equalTo(view.prev.left)
        make.size.equalTo($size(300, 40))
      },
      events: {
        changed: function(sender) {
          var baseName = sender.text;
          $cache.set("baseName", baseName);
        }
      }
      },
      {
      type: "input",
      props: {
        id: "tableName",
        text: tableName,
        placeholder: "table name"
      },
      layout: function(make, view) {
        make.top.equalTo(view.prev.bottom).inset(25),
        make.left.equalTo(view.prev.left)
        make.size.equalTo($size(300, 40)) 
      },
      events: {
        changed: function(sender) {
          var tableName = sender.text;
          $cache.set("tableName", tableName);
        }
      }
      },
      {
      type: "input",
      props: {
        id: "viewName",
        text: viewName,
        placeholder: "view name"
      },
      layout: function(make, view) {
        make.top.equalTo(view.prev.bottom).inset(25),
        make.left.equalTo(view.prev.left)
        make.size.equalTo($size(300, 40))
      },
      events: {
        changed: function(sender) {
          var viewName = sender.text;
          $cache.set("viewName", viewName);
        }
      }
      },
      {
        type: "input",
        props: {
          id: "pageSize",
          text: pageSize,
          type: $kbType.number,
          placeholder: "page size",
        },
        layout: function(make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
          make.left.equalTo(view.prev.left)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function(sender) {
          var pageSize = sender.text;
          $cache.set("pageSize",pageSize);
          }      
        }
      },
      {
        type: "button",
        props: {
          title: "设置方法",
        },
        layout: function(make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
          make.left.right.inset(15)
        },
        events:{
          tapped: function(sender){
            $app.openURL("https://www.notion.so/Airtable-9bd3f31ec00041ef8fa8c09f55c99a78")
          }
        }
      }
      ] 
  });
}

$app.tips("此脚本支持与 Airtable 搭配使用。\n 如需此功能，请JSBOX内打开脚本，点击顶部设置按钮自行配置。\n而后查词历史将保存到 Airtable，并可在 JSBOX 内浏览")
